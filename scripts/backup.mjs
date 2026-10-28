// Server/CI only. Never bundle this file or expose these credentials in VITE_ variables.
import {createClient} from '@supabase/supabase-js';
import {mkdtemp,mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash,randomBytes,scryptSync,createCipheriv} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {spawnSync} from 'node:child_process';
const required=['SUPABASE_URL','SUPABASE_SECRET_KEY','BACKUP_PASSPHRASE'];
for(const n of required)if(!process.env[n])throw new Error(`Missing ${n}`);
const url=process.env.SUPABASE_URL;
if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url))throw new Error('Invalid project URL');
if(process.env.BACKUP_PASSPHRASE.length<20)throw new Error('Use a backup passphrase of at least 20 characters');
const supabase=createClient(url,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const work=await mkdtemp(path.join(tmpdir(),'saddle-backup-'));const tree=path.join(work,'archive');await mkdir(tree);
const files=[];
async function store(name,bytes){const p=path.join(tree,name);await mkdir(path.dirname(p),{recursive:true});await writeFile(p,bytes);files.push({path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
async function rows(table){
 const order=table==='saddle_versions'?['user_id','version']:table==='saddle_connections'?['requester','id']:table==='saddle_decor_catalog'?['id']:table==='saddle_blocks'?['user_id','blocked_id']:table==='saddle_entitlements'?['user_id','item_id']:['saddle_horse_decor','saddle_horse_pages'].includes(table)?['user_id','horse_id']:['saddle_members','saddle_profiles','saddle_documents','saddle_rider_pictures'].includes(table)?['user_id']:['user_id','id'];
 const all=[];for(let offset=0;;offset+=500){let q=supabase.from(table).select('*');for(const column of order)q=q.order(column);const {data,error}=await q.range(offset,offset+499);if(error)throw new Error(`Backup table failed: ${table}`);all.push(...data);if(data.length<500)break;}return all;
}
async function list(prefix=''){const result=[];for(let offset=0;;offset+=100){const {data,error}=await supabase.storage.from('saddle-media').list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});if(error)throw new Error('Storage inventory failed');for(const item of data){const key=prefix?`${prefix}/${item.name}`:item.name;if(!item.id)result.push(...await list(key));else result.push({key,metadata:item.metadata});}if(data.length<100)break;}return result;}
try{
 // Enumerate immutable media first; a concurrent upload after this list is detected below.
 const media=await list();const keys=new Set(media.map(x=>x.key));
 const docs=await rows('saddle_documents');const versions=await rows('saddle_versions');const members=await rows('saddle_members');
 for(const row of [...docs,...versions])for(const ride of row.payload.rides||[]){if(ride.videoId&&!keys.has(`${row.user_id}/${ride.videoId}`))throw new Error('Media changed during capture. Retry; no incomplete backup will be uploaded.');}
 // Capture only account identifiers/email, not password hashes, tokens or user metadata.
 const accounts=[];for(let page=1;;page++){const {data,error}=await supabase.auth.admin.listUsers({page,perPage:100});if(error)throw new Error('Account inventory failed');accounts.push(...data.users.filter(u=>members.some(m=>m.user_id===u.id)).map(u=>({id:u.id,email:u.email})));if(data.users.length<100)break;}
 await store('records/documents.json',Buffer.from(JSON.stringify(docs)));await store('records/versions.json',Buffer.from(JSON.stringify(versions)));await store('records/members.json',Buffer.from(JSON.stringify(members)));await store('records/accounts.json',Buffer.from(JSON.stringify(accounts)));await store('records/media.json',Buffer.from(JSON.stringify(media)));
 for(let i=0;i<media.length;i++){const {data,error}=await supabase.storage.from('saddle-media').download(media[i].key);if(error||!data)throw new Error('Media download failed');await store(`media/${i}.bin`,Buffer.from(await data.arrayBuffer()));}
 for(const table of ['saddle_rider_pictures','saddle_critiques','saddle_profiles','saddle_blocks','saddle_connections','saddle_posts','saddle_comments','saddle_reports','saddle_show_results','saddle_decor_catalog','saddle_entitlements','saddle_horse_decor','saddle_horse_pages'])await store(`records/${table}.json`,Buffer.from(JSON.stringify(await rows(table))));
 const privateRecords=await supabase.rpc('saddle_private_backup');if(privateRecords.error)throw new Error('Private feature backup failed');await store('records/private-features.json',Buffer.from(JSON.stringify(privateRecords.data)));
 await store('schema/setup.sql',await readFile(new URL('../supabase/setup.sql',import.meta.url)));
 for(const file of (await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort())await store(`schema/migrations/${file}`,await readFile(new URL(`../supabase/migrations/${file}`,import.meta.url)));
 const manifest={sourceCommit:process.env.GITHUB_SHA||null,format:'saddle-school-backup-v1',projectRef:new URL(url).hostname.split('.')[0],capturedAt:new Date().toISOString(),consistency:'logical capture; mutable feature tables may span changes; not a database point-in-time image',files};
 await writeFile(path.join(tree,'manifest.json'),JSON.stringify(manifest,null,2));
 await mkdir('backup-output',{recursive:true});
 const tar=path.join(work,'backup.tar.gz');const result=spawnSync('tar',['-czf',tar,'-C',tree,'.']);if(result.status!==0)throw new Error('Archive creation failed');
 const salt=randomBytes(16),iv=randomBytes(12);const key=scryptSync(process.env.BACKUP_PASSPHRASE,salt,32);const cipher=createCipheriv('aes-256-gcm',key,iv);
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');const output=path.resolve('backup-output',`saddle-school-${stamp}.ssbackup`);
 const header=Buffer.concat([Buffer.from('SSBKUP01'),salt,iv]);await writeFile(output,header);
 await pipeline(createReadStream(tar),cipher,createWriteStream(output,{flags:'a'}));
 await writeFile(output,cipher.getAuthTag(),{flag:'a'});
 const hash=createHash('sha256').update(await readFile(output)).digest('hex');await writeFile(output+'.sha256',hash+'  '+path.basename(output)+'\n');
 console.log(`Encrypted backup created (${docs.length} accounts, ${media.length} media files).`);
}finally{await rm(work,{recursive:true,force:true});}
