import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
test('public community, private trophies and verified decorations enforce authorization',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key,email text,is_anonymous boolean default false);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id bigint generated always as identity primary key,bucket_id text,name text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 insert into auth.users(id,email) values('${A}','owner@example.test');`);
 await db.exec(await readFile(new URL('../supabase/setup.sql',import.meta.url),'utf8'));
 await db.exec(`insert into public.saddle_members(user_id) values('${A}')`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261028180322_durable_video_critique_limits.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261028210856_saddle_up_community_stables_trophies_store.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261028213324_saddle_up_full_feature_backups.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261028221528_rider_pictures_avatars_horse_charms.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261028223433_english_western_arabian_avatar_wardrobe.sql',import.meta.url),'utf8'));
 await db.exec(`insert into auth.users(id,email) values('${B}','rider@example.test'),('${C}','third@example.test');`);
 assert.equal((await db.query('select count(*) from public.saddle_members')).rows[0].count,3);
 assert.equal((await db.query("select count(*) from public.saddle_decor_catalog where kind='avatar'")).rows[0].count,20);
 assert.equal((await db.query("select count(*) from public.saddle_decor_catalog where kind='avatar' and not premium")).rows[0].count,6);
 assert.equal((await db.query('select count(*) from saddle_private.community_admins')).rows[0].count,1);
 async function as(id,fn){await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`);try{return await fn();}finally{await db.exec('reset role');}}
 const payload=(id)=>JSON.stringify({version:1,rider:{name:'',level:'Beginner',goal:''},horses:[{id,name:'Willow',relationship:'Owned',photo:'',tack:'SECRET TACK',notes:'SECRET CARE',breed:'',discipline:'Dressage'}],rides:[{id:'ride',horseId:id,date:'2026-01-01',notes:'SECRET RIDE',videoId:'secretclip'}],completed:[]});
 for(const [id,horse] of [[A,'horse-a'],[B,'horse-b']])await as(id,()=>db.query('select public.save_saddle_document(0,$1::jsonb,auth.uid())',[payload(horse)]));
 for(const id of [A,B,C])await as(id,()=>db.query('insert into public.saddle_profiles(user_id,display_name,visible,accepted_rules) values($1,$2,true,true)',[id,id===A?'Owner':'Rider']));
 await as(B,async()=>{
  assert.equal((await db.query('select * from public.saddle_profiles')).rows.length,3);
  assert.equal((await db.query('select * from public.saddle_documents')).rows.length,1);
  await assert.rejects(()=>db.query('insert into saddle_private.community_admins values($1)',[B]),/permission denied/);
  const id=(await db.query('insert into public.saddle_connections(requester,recipient) values($1,$2) returning id',[B,C])).rows[0].id;
  assert.equal((await db.query("update public.saddle_connections set status='accepted' where id=$1 returning id",[id])).rows.length,0);
 });
 await as(C,async()=>{assert.equal((await db.query("update public.saddle_connections set status='accepted' returning id")).rows.length,1);});
 const post=(await as(B,()=>db.query('insert into public.saddle_posts(user_id,body) values($1,$2) returning id',[B,'A great ride']))).rows[0].id;
 await as(C,()=>db.query('insert into public.saddle_comments(user_id,post_id,body) values($1,$2,$3)',[C,post,'Well done!']));
 await as(B,async()=>{
  await assert.rejects(()=>db.query('insert into public.saddle_posts(user_id,body) values($1,$2)',[C,'Forged']),/row-level security/);
  await assert.rejects(()=>db.query('insert into public.saddle_posts(user_id,body,hidden) values($1,$2,false)',[B,'Override']),/permission denied/);
  await db.query("insert into public.saddle_show_results(user_id,horse_id,show_name,show_date,class_name,ribbon,\"placing\") values($1,'horse-b','Spring Show','2026-01-01','Intro','Blue',1)",[B]);
  await assert.rejects(()=>db.query("insert into public.saddle_show_results(user_id,horse_id,show_name,show_date,class_name) values($1,'horse-a','Forged','2026-01-01','Intro')",[B]),/own stable/);
  await db.query("insert into public.saddle_horse_decor(user_id,horse_id,story,stickers) values($1,'horse-b','Our story','[{\"item_id\":\"heart\",\"x\":30,\"y\":60}]')",[B]);
  await assert.rejects(()=>db.query("update public.saddle_horse_decor set wallpaper_id='heritage' where user_id=$1",[B]),/not unlocked/);
  await assert.rejects(()=>db.query("update public.saddle_horse_decor set stickers='[{\"item_id\":\"crown\",\"x\":50,\"y\":50}]' where user_id=$1",[B]),/not unlocked/);
  await assert.rejects(()=>db.query("insert into public.saddle_entitlements(user_id,item_id,verified_transaction) values($1,'heritage','fake')",[B]),/permission denied/);
  await db.query("select public.saddle_publish_horse('horse-b',true)");
 });
 await as(C,async()=>{
  assert.equal((await db.query('select * from public.saddle_show_results')).rows.length,0);
  assert.equal((await db.query('select * from public.saddle_horse_decor')).rows.length,0);
  const snapshot=(await db.query('select snapshot from public.saddle_horse_pages')).rows[0].snapshot;
  assert.equal(snapshot.results.length,1);assert.equal(snapshot.name,'Willow');assert.doesNotMatch(JSON.stringify(snapshot),/SECRET|secretclip/);
  await db.query('insert into public.saddle_blocks(user_id,blocked_id) values($1,$2)',[C,B]);
  assert.equal((await db.query('select * from public.saddle_posts')).rows.length,0);
  assert.equal((await db.query('select * from public.saddle_comments')).rows.length,0);
  assert.equal((await db.query('select * from public.saddle_connections')).rows.length,0);
  assert.equal((await db.query('select * from public.saddle_horse_pages')).rows.length,0);
  await db.query('delete from public.saddle_blocks where user_id=$1',[C]);
 });
 const report=(await as(C,()=>db.query("insert into public.saddle_reports(user_id,target_kind,target_id,reason) values($1,'post',$2,'Spam') returning id",[C,post]))).rows[0].id;
 await as(B,async()=>{assert.equal((await db.query('select * from public.saddle_reports')).rows.length,0);await assert.rejects(()=>db.query("select public.saddle_moderate_report($1,'hide')",[report]),/Moderator/);});
 await as(A,()=>db.query("select public.saddle_moderate_report($1,'hide')",[report]));
 await as(C,async()=>{assert.equal((await db.query('select * from public.saddle_posts')).rows.length,0);});

 await as(B,()=>assert.rejects(()=>db.query('select public.saddle_private_backup()'),/permission denied/));
 await db.exec('set role service_role');
 assert.equal((await db.query('select public.saddle_private_backup() as data')).rows[0].data.community_admins.length,1);
 await db.query("select public.saddle_grant_decoration($1,'heritage','stripe:verified')",[B]);
 await db.query("select public.saddle_grant_decoration($1,'heritage','stripe:verified')",[B]);
 await assert.rejects(()=>db.query("select public.saddle_grant_decoration($1,'heritage','stripe:verified')",[C]),/another account/);
 await db.exec('reset role');
 await as(B,()=>db.query("update public.saddle_horse_decor set wallpaper_id='heritage' where user_id=$1",[B]));
 await db.exec('set role service_role');
 await db.query("select public.saddle_revoke_decoration('stripe:verified')");
 await assert.rejects(()=>db.query("select public.saddle_grant_decoration($1,'heritage','stripe:verified')",[B]),/revoked/);
 await db.query("select public.saddle_revoke_decoration('stripe:arrived-before-purchase')");
 await assert.rejects(()=>db.query("select public.saddle_grant_decoration($1,'crown','stripe:arrived-before-purchase')",[B]),/revoked/);
 await db.exec('reset role');
 await as(B,async()=>{assert.equal((await db.query('select wallpaper_id from public.saddle_horse_decor')).rows[0].wallpaper_id,'meadow');await assert.rejects(()=>db.query("select public.saddle_grant_decoration($1,'crown','forged')",[B]),/permission denied/);});

 await as(B,async()=>{
  await db.query("insert into public.saddle_rider_pictures(user_id,avatar_item_id) values($1,'avatar-sage')",[B]);
  await assert.rejects(()=>db.query("update public.saddle_rider_pictures set avatar_item_id='avatar-dressage' where user_id=$1",[B]),/not unlocked/);
  await assert.rejects(()=>db.query("update public.saddle_profiles set avatar_item_id='avatar-rosette' where user_id=$1",[B]),/not unlocked/);
  await assert.rejects(()=>db.query("update public.saddle_horse_decor set charms='[\"charm-heart\"]' where user_id=$1",[B]),/not unlocked/);
 });
 await as(C,async()=>{
  assert.equal((await db.query('select * from public.saddle_rider_pictures')).rows.length,0);
  await assert.rejects(()=>db.query("insert into public.saddle_rider_pictures(user_id,avatar_item_id) values($1,'avatar-sage')",[B]),/row-level security/);
 });
 await db.exec('set role service_role');
 for(const [item,receipt] of [['avatar-dressage','apple:avatar'],['charm-heart','apple:heart'],['charm-moon','stripe:moon']])await db.query('select public.saddle_grant_decoration($1,$2,$3)',[B,item,receipt]);
 await db.exec('reset role');
 await as(B,async()=>{
  await db.query("update public.saddle_rider_pictures set avatar_item_id='avatar-dressage' where user_id=$1",[B]);
  await db.query("update public.saddle_profiles set avatar_item_id='avatar-dressage' where user_id=$1",[B]);
  await db.query("update public.saddle_horse_decor set charms='[\"charm-heart\",\"charm-moon\"]' where user_id=$1",[B]);
  await assert.rejects(()=>db.query("update public.saddle_horse_decor set charms='[\"charm-heart\",\"charm-heart\"]' where user_id=$1",[B]),/only be equipped once/);
  await db.query("select public.saddle_publish_horse('horse-b',true)");
 });
 await as(C,async()=>{
  assert.equal((await db.query('select avatar_item_id from public.saddle_profiles where user_id=$1',[B])).rows[0].avatar_item_id,'avatar-dressage');
  assert.deepEqual((await db.query('select snapshot from public.saddle_horse_pages')).rows[0].snapshot.decor.charms,['charm-heart','charm-moon']);
 });
 await db.exec('set role service_role');await db.query("select public.saddle_revoke_decoration('apple:heart')");await db.query("select public.saddle_revoke_decoration('apple:avatar')");await db.exec('reset role');
 await as(B,async()=>{
  assert.equal((await db.query('select avatar_item_id from public.saddle_rider_pictures')).rows[0].avatar_item_id,null);
  assert.equal((await db.query('select avatar_item_id from public.saddle_profiles where user_id=$1',[B])).rows[0].avatar_item_id,null);
  assert.deepEqual((await db.query('select charms from public.saddle_horse_decor')).rows[0].charms,['charm-moon']);
  assert.deepEqual((await db.query('select snapshot from public.saddle_horse_pages')).rows[0].snapshot.decor.charms,['charm-moon']);
 });
 await db.exec('set role anon');await assert.rejects(()=>db.query('select * from public.saddle_profiles'),/permission denied/);await db.exec('reset role');
 }finally{await db.close();}
});
