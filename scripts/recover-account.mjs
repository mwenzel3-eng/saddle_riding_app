// Recovery drill only: copy ONE source account into an EMPTY account in a DIFFERENT project.
// No upserts, overwrites, deletes, or production rollback paths.
import {isDeepStrictEqual} from 'node:util';
import {createClient} from '@supabase/supabase-js';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const [directory,sourceUser,apply]=process.argv.slice(2);
if(!directory||!sourceUser)throw new Error('Usage: node scripts/recover-account.mjs VERIFIED_DIRECTORY SOURCE_USER_UUID [--apply]');
const manifest=JSON.parse(await readFile(path.join(directory,'manifest.json'),'utf8'));
if(manifest.format!=='saddle-school-backup-v1')throw new Error('Invalid manifest');
for(const f of manifest.files){if(f.path.startsWith('/')||f.path.split('/').includes('..'))throw new Error('Unsafe file path');const b=await readFile(path.join(directory,f.path));if(b.length!==f.bytes||createHash('sha256').update(b).digest('hex')!==f.sha256)throw new Error('Backup verification failed');}
const docs=JSON.parse(await readFile(path.join(directory,'records/documents.json'),'utf8'));
const doc=docs.find(d=>d.user_id===sourceUser);if(!doc)throw new Error('Source account has no document');
const versions=JSON.parse(await readFile(path.join(directory,'records/versions.json'),'utf8')).filter(d=>d.user_id===sourceUser&&d.version<doc.version);
const media=JSON.parse(await readFile(path.join(directory,'records/media.json'),'utf8'));
if(apply!=='--apply'){console.log('Dry run: backup hashes verified. --apply requires a different recovery project and empty target account. No remote data changed.');process.exit(0);}
for(const n of ['RECOVERY_SUPABASE_URL','RECOVERY_SUPABASE_SECRET_KEY','RECOVERY_USER_ID','EXPECTED_RECOVERY_PROJECT_REF'])if(!process.env[n])throw new Error(`Missing ${n}`);
const ref=new URL(process.env.RECOVERY_SUPABASE_URL).hostname.split('.')[0];
if(ref===manifest.projectRef||ref!==process.env.EXPECTED_RECOVERY_PROJECT_REF||['kfusxfrgtiqgcmobvwjs','myxlzqkvocokcrxtoiwc'].includes(ref))throw new Error('Refusing production, Rangebook, or unexpected project target');
const s=createClient(process.env.RECOVERY_SUPABASE_URL,process.env.RECOVERY_SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),id=process.env.RECOVERY_USER_ID;
const {data:auth,error:ae}=await s.auth.admin.getUserById(id);if(ae||!auth.user)throw new Error('Create the test user in the recovery project first');
for(const table of ['saddle_members','saddle_documents','saddle_versions']){const {data,error}=await s.from(table).select('user_id').eq('user_id',id).limit(1);if(error||data.length)throw new Error('Target account must be empty; no overwrite is permitted');}
const {data:objects,error:oe}=await s.storage.from('saddle-media').list(id,{limit:1});if(oe||objects.length)throw new Error('Target media folder must be empty');
let result=await s.from('saddle_members').insert({user_id:id});if(result.error)throw new Error('Membership restore failed');
for(let i=0;i<media.length;i++){const item=media[i];if(!item.key.startsWith(sourceUser+'/'))continue;const bytes=await readFile(path.join(directory,`media/${i}.bin`));const {error}=await s.storage.from('saddle-media').upload(id+item.key.slice(sourceUser.length),bytes,{upsert:false,contentType:item.metadata?.mimetype||'video/mp4'});if(error)throw new Error('Media restore failed; stop and use a NEW empty test account before retrying');}
for(const v of versions){const {error}=await s.from('saddle_versions').insert({user_id:id,version:v.version,payload:v.payload,created_at:v.created_at});if(error)throw new Error('Version restore failed');}
result=await s.from('saddle_documents').insert({user_id:id,version:doc.version,payload:doc.payload,updated_at:doc.updated_at});if(result.error)throw new Error('Document restore failed');
const {data:check,error:ce}=await s.from('saddle_documents').select('payload,version').eq('user_id',id).single();
if(ce||Number(check.version)!==Number(doc.version)||!isDeepStrictEqual(check.payload,doc.payload))throw new Error('Recovery verification failed');
console.log('One account copied into the recovery project. Test sign-in, records, clip playback, save conflicts and a second account’s isolation before planning production recovery.');
