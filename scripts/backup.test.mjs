import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve('.');
test('backup encrypts records/media, verifies hashes on unpack, and rejects wrong passphrase or overwrite',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'saddle-backup-test-'));
 const user='11111111-1111-4111-8111-111111111111',clip='a'.repeat(32);
 const state={version:1,rider:{name:'Test',level:'Beginner',goal:''},horses:[],rides:[{videoId:clip}],completed:[]};
 const row={user_id:user,version:1,payload:state};
 const mock=`
 const U=${JSON.stringify(user)},C=${JSON.stringify(clip)},R=${JSON.stringify(row)};
 globalThis.fetch=async(input,init={})=>{
 const url=new URL(typeof input==='string'?input:input.url||input.toString());
 const p=url.pathname;
 const json=o=>new Response(JSON.stringify(o),{status:200,headers:{'Content-Type':'application/json'}});
 if(p==='/storage/v1/object/list/saddle-media'){
  const b=JSON.parse(init.body);if(b.prefix===U)return json([{name:C,id:'object123',metadata:{mimetype:'video/mp4'}}]);
  return json([{name:U,id:null}]);
 }
 if(p.startsWith('/storage/v1/object/'))return new Response('fake-video-bytes',{headers:{'Content-Type':'video/mp4'}});
 if(p==='/rest/v1/saddle_documents'||p==='/rest/v1/saddle_versions')return json([R]);
 if(p==='/rest/v1/saddle_members')return json([{user_id:U}]);
 if(p==='/rest/v1/saddle_rider_pictures')return json([{user_id:U,photo:'',avatar_item_id:'avatar-sage'}]);
 if(p==='/rest/v1/saddle_show_results')return json([{user_id:U,show_name:'Test show'}]);
 if(p==='/rest/v1/rpc/saddle_private_backup')return json({decor_receipts:[]});
 if(p.startsWith('/rest/v1/saddle_'))return json([]);
 if(p==='/auth/v1/admin/users')return json({users:[{id:U,email:'test@example.invalid'}],aud:'authenticated',total:1});
 throw new Error('Unexpected test request: '+p);
 };`;
 const mockPath=path.join(dir,'mock.mjs');await writeFile(mockPath,mock);
 const env={...process.env,SUPABASE_URL:'https://test-project.supabase.co',SUPABASE_SECRET_KEY:'test-secret-not-real',BACKUP_PASSPHRASE:'test-only-long-passphrase-123456'};
 try{
  const result=spawnSync(process.execPath,['--import',mockPath,path.join(root,'scripts/backup.mjs')],{cwd:dir,env,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  const {readdir}=await import('node:fs/promises');const files=await readdir(path.join(dir,'backup-output'));const input=path.join(dir,'backup-output',files.find(f=>f.endsWith('.ssbackup')));
  const encrypted=await readFile(input);assert.equal(encrypted.includes(Buffer.from('test@example.invalid')),false);
  const destination=path.join(dir,'recovered');const run=(dest,extra={})=>spawnSync(process.execPath,[path.join(root,'scripts/unpack-backup.mjs'),input,dest],{cwd:dir,env:{...env,...extra},encoding:'utf8'});
  const good=run(destination);assert.equal(good.status,0,good.stderr);
  assert.equal((await readFile(path.join(destination,'media/0.bin'))).toString(),'fake-video-bytes');
  const saved=JSON.parse(await readFile(path.join(destination,'records/documents.json'),'utf8'));assert.equal(saved[0].user_id,user);
  assert.equal(JSON.parse(await readFile(path.join(destination,'records/saddle_rider_pictures.json'),'utf8'))[0].avatar_item_id,'avatar-sage');
  assert.equal(JSON.parse(await readFile(path.join(destination,'records/saddle_show_results.json'),'utf8'))[0].show_name,'Test show');
  assert.deepEqual(JSON.parse(await readFile(path.join(destination,'records/private-features.json'),'utf8')),{decor_receipts:[]});
  assert.notEqual(run(destination).status,0,'must refuse existing restore directory');
  assert.notEqual(run(path.join(dir,'wrong'),{BACKUP_PASSPHRASE:'wrong-passphrase-1234567890'}).status,0);
 }finally{await rm(dir,{recursive:true,force:true});}
});
