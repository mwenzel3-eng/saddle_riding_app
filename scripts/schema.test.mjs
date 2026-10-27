import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
const db=new PGlite();
const payload=JSON.stringify({version:1,rider:{name:'Rider',level:'Beginner',goal:''},horses:[],rides:[],completed:[]});
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id bigint generated always as identity primary key,bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;grant usage on sequence storage.objects_id_seq to authenticated;
 insert into auth.users values('${A}'),('${B}'),('${C}');`);
await db.exec(await readFile(new URL('../supabase/setup.sql',import.meta.url),'utf8'));
await db.exec(`insert into public.saddle_members(user_id) values('${A}'),('${B}');`);
async function asUser(id,fn){await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`);try{return await fn();}finally{await db.exec('reset role');}}
const save=(v)=>db.query('select public.save_saddle_document($1,$2::jsonb,auth.uid()) as version',[v,payload]);
test('invited accounts save privately; anonymous and nonmembers cannot save',async()=>{
 await asUser(A,async()=>{await assert.rejects(()=>db.query('select public.save_saddle_document(0,$1::jsonb,$2::uuid)',[payload,B]),/SADDLE_NOT_INVITED/);await save(0);}); await asUser(B,()=>save(0));
 await asUser(C,async()=>{await assert.rejects(()=>save(0),/SADDLE_NOT_INVITED/);assert.equal((await db.query('select * from public.saddle_documents')).rows.length,0);});
 await db.exec('set role anon');try{await assert.rejects(()=>save(0),/permission denied/);}finally{await db.exec('reset role');}
 await asUser(A,async()=>{const r=await db.query('select user_id from public.saddle_documents');assert.deepEqual(r.rows,[{user_id:A}]);await assert.rejects(()=>db.query('update public.saddle_documents set version=99'),/permission denied/);});
});
test('stale saves fail without changing latest records or snapshots',async()=>{
 await asUser(A,async()=>{await save(1);await assert.rejects(()=>save(1),/SADDLE_CONFLICT/);const r=await db.query('select version from public.saddle_documents');assert.equal(Number(r.rows[0].version),2);const h=await db.query('select version from public.saddle_versions order by version');assert.deepEqual(h.rows.map(x=>Number(x.version)),[1,2]);await assert.rejects(()=>db.query('delete from public.saddle_versions'),/permission denied/);});
});
test('private media insert/download is limited to owner and invited membership',async()=>{
 await asUser(A,()=>db.query("insert into storage.objects(bucket_id,name) values('saddle-media',$1)",[A+'/clip']));
 await asUser(B,async()=>{assert.equal((await db.query('select * from storage.objects')).rows.length,0);await assert.rejects(()=>db.query("insert into storage.objects(bucket_id,name) values('saddle-media',$1)",[A+'/other']),/row-level security/);});
 await asUser(C,()=>assert.rejects(()=>db.query("insert into storage.objects(bucket_id,name) values('saddle-media',$1)",[C+'/clip']),/row-level security/));
});
test('missing/malformed payload fields are rejected by database RPC',async()=>{
 await asUser(A,async()=>{await assert.rejects(()=>db.query("select public.save_saddle_document(2,'{}'::jsonb,auth.uid())"),/Invalid document/);});
 await db.close();
});
