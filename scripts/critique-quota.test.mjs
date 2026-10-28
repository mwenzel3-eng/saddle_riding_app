import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

test('durable quota: permissions, concurrent reservations, daily reset and cooldown across days',async()=>{
 const db=new PGlite();
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create schema saddle_private;revoke all on schema saddle_private from public;
   create table public.saddle_members(user_id uuid primary key);
   grant select on public.saddle_members to service_role;
   insert into public.saddle_members values('${a}'),('${b}');`);
  await db.exec(await readFile(new URL('../supabase/migrations/20261028180322_durable_video_critique_limits.sql',import.meta.url),'utf8'));
  const quota=async(user,reserve=true)=>(await db.query('select public.saddle_critique_quota($1,$2) as value',[user,reserve])).rows[0].value;
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`);
   await assert.rejects(()=>quota(a),/permission denied/);
   await assert.rejects(()=>db.exec('delete from saddle_private.critique_usage'),/permission denied/);
   await db.exec('reset role');
  }
  await db.exec('set role service_role');
  assert.equal((await quota(a,false)).remaining,5);
  const first=await Promise.all(Array.from({length:8},()=>quota(a)));
  assert.equal(first.filter(q=>q.allowed).length,1);
  assert.equal((await quota(a,false)).remaining,4);
  assert.equal((await quota(b)).remaining,4);
  await assert.rejects(()=>quota('33333333-3333-4333-8333-333333333333'),/SADDLE_NOT_INVITED/);
  await db.exec('reset role');
  for(let i=0;i<4;i++){
   await db.query("update saddle_private.critique_usage set last_requested_at=clock_timestamp()-interval '2 minutes' where user_id=$1",[a]);
   await db.exec('set role service_role');assert.equal((await quota(a)).allowed,true);await db.exec('reset role');
  }
  await db.query("update saddle_private.critique_usage set last_requested_at=clock_timestamp()-interval '2 minutes' where user_id=$1",[a]);
  await db.exec('set role service_role');
  const exhausted=await quota(a);assert.equal(exhausted.reason,'daily_limit');assert.equal(exhausted.remaining,0);
  assert.equal(new Date(exhausted.resetsAt).getUTCHours(),0);
  await db.exec('reset role');
  await db.query("update saddle_private.critique_usage set usage_day=(clock_timestamp() at time zone 'UTC')::date-1,last_requested_at=clock_timestamp()-interval '2 minutes' where user_id=$1",[a]);
  await db.exec('set role service_role');assert.equal((await quota(a,false)).remaining,5);assert.equal((await quota(a)).remaining,4);await db.exec('reset role');
  // A new day resets the allowance but must not erase the last request cooldown.
  await db.query("update saddle_private.critique_usage set usage_day=(clock_timestamp() at time zone 'UTC')::date-1 where user_id=$1",[a]);
  await db.exec('set role service_role');assert.equal((await quota(a)).reason,'cooldown');
 }finally{await db.close();}
});
