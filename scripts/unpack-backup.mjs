// Decrypt only into a NEW empty local directory. Never writes to a live database.
import {open,mkdtemp,readFile,writeFile,mkdir,rm,cp,readdir} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {createDecipheriv,scryptSync,createHash} from 'node:crypto';
import {pipeline} from 'node:stream/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
const [input,destination]=process.argv.slice(2);
if(!input||!destination||!process.env.BACKUP_PASSPHRASE)throw new Error('Usage: BACKUP_PASSPHRASE set in environment; node scripts/unpack-backup.mjs FILE.ssbackup NEW_DIRECTORY');
const handle=await open(input,'r');const {size}=await handle.stat();
if(size<53)throw new Error('Backup is too short');
const header=Buffer.alloc(36),tag=Buffer.alloc(16);await handle.read(header,0,36,0);await handle.read(tag,0,16,size-16);await handle.close();
if(header.subarray(0,8).toString()!=='SSBKUP01')throw new Error('Unrecognized backup format');
const cipher=createDecipheriv('aes-256-gcm',scryptSync(process.env.BACKUP_PASSPHRASE,header.subarray(8,24),32),header.subarray(24,36));cipher.setAuthTag(tag);
const work=await mkdtemp(path.join(tmpdir(),'saddle-recovery-'));const tar=path.join(work,'backup.tar.gz');const tree=path.join(work,'tree');
try{
 await pipeline(createReadStream(input,{start:36,end:size-17}),cipher,createWriteStream(tar));
 // Authentication completed before any archive extraction.
 const listing=spawnSync('tar',['-tzf',tar],{encoding:'utf8'});if(listing.status!==0)throw new Error('Invalid archive');
 for(const name of listing.stdout.split('\n').filter(Boolean))if(name.startsWith('/')||name.split('/').includes('..'))throw new Error('Unsafe archive path');
 await mkdir(tree);if(spawnSync('tar',['-xzf',tar,'--no-same-owner','-C',tree]).status!==0)throw new Error('Extraction failed');
 const manifest=JSON.parse(await readFile(path.join(tree,'manifest.json'),'utf8'));
 if(manifest.format!=='saddle-school-backup-v1')throw new Error('Wrong manifest format');
 for(const file of manifest.files){if(file.path.startsWith('/')||file.path.split('/').includes('..'))throw new Error('Invalid manifest path');const bytes=await readFile(path.join(tree,file.path));if(bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new Error('Backup hash verification failed');}
 // mkdir without recursive refuses an existing destination, preventing overwrite.
 await mkdir(destination);for(const entry of await readdir(tree)){await cp(path.join(tree,entry),path.join(destination,entry),{recursive:true,errorOnExist:true,force:false});}
 console.log(`Decrypted and verified ${manifest.files.length} files. No database was changed.`);
}finally{await rm(work,{recursive:true,force:true});}
