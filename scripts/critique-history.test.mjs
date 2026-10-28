import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

test('critique history persists privately and only the server can create results',async()=>{
 const db=new PGlite();
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to authenticated;create table public.saddle_members(user_id uuid primary key);
   alter table public.saddle_members enable row level security;grant select on public.saddle_members to authenticated;
   create policy own_membership on public.saddle_members for select to authenticated using(user_id=auth.uid());
   insert into public.saddle_members values('${a}'),('${b}');`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261028185541_save_private_critique_history.sql',import.meta.url),'utf8'));
  await db.exec('set role service_role');
  await db.query("insert into public.saddle_critiques(user_id,clip_name,focus,critique,model) values($1,'Trot.mp4','My seat','At 2s: rider visible.','test-model'),($2,'Walk.mp4','','Other private result','test-model')",[a,b]);
  await db.exec('reset role');
  await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${a}',false);`);
  const rows=(await db.query('select clip_name,critique from public.saddle_critiques')).rows;
  assert.deepEqual(rows,[{clip_name:'Trot.mp4',critique:'At 2s: rider visible.'}]);
  await assert.rejects(()=>db.query("insert into public.saddle_critiques(user_id,clip_name,critique,model) values($1,'fake','forged','fake')",[a]),/permission denied/);
  await assert.rejects(()=>db.exec("update public.saddle_critiques set critique='changed'"),/permission denied/);
  await assert.rejects(()=>db.exec('delete from public.saddle_critiques'),/permission denied/);
  await db.exec(`select set_config('request.jwt.claim.sub','${b}',false);`);
  assert.equal((await db.query('select clip_name from public.saddle_critiques')).rows[0].clip_name,'Walk.mp4');
  await db.exec("select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',false);");
  assert.equal((await db.query('select * from public.saddle_critiques')).rows.length,0);
  await db.exec('reset role;set role anon');
  await assert.rejects(()=>db.query('select * from public.saddle_critiques'),/permission denied/);
  await db.exec('reset role');
  assert.equal((await db.query('select count(*) from public.saddle_critiques')).rows[0].count,2);
 }finally{await db.close();}
});
