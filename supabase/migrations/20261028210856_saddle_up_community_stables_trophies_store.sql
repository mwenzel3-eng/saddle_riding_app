begin;
-- New email/password accounts join the dedicated app automatically.
create function saddle_private.join_saddle_up() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.email is not null and not coalesce(new.is_anonymous,false) then
  insert into public.saddle_members(user_id) values(new.id) on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function saddle_private.join_saddle_up() from public,anon,authenticated;
create trigger saddle_up_signup after insert on auth.users for each row execute function saddle_private.join_saddle_up();

create table saddle_private.community_admins(user_id uuid primary key references public.saddle_members(user_id));
-- The current app owner(s), before public registration begins. New members never become admins.
insert into saddle_private.community_admins select user_id from public.saddle_members;
alter table saddle_private.community_admins enable row level security;
create table saddle_private.community_bans(user_id uuid primary key references public.saddle_members(user_id));
alter table saddle_private.community_bans enable row level security;
revoke all on saddle_private.community_admins,saddle_private.community_bans from public,anon,authenticated;
create table public.saddle_profiles(
 user_id uuid primary key references public.saddle_members(user_id),
 display_name text not null check(char_length(trim(display_name)) between 1 and 60),
 bio text not null default '' check(char_length(bio)<=500),
 interests text not null default '' check(char_length(interests)<=200),
 level text not null default 'Beginner' check(char_length(level)<=40),
 avatar text not null default '' check(avatar='' or (char_length(avatar)<=1500000 and avatar ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')),
 visible boolean not null default false,
 accepted_rules boolean not null default false,
 check(not visible or accepted_rules)
);
create table public.saddle_blocks(
 user_id uuid not null references public.saddle_members(user_id),
 blocked_id uuid not null references public.saddle_members(user_id),
 primary key(user_id,blocked_id),check(user_id<>blocked_id)
);
create index saddle_blocks_target on public.saddle_blocks(blocked_id,user_id);
-- Helpers are in a non-exposed schema and reveal no content or privileged data.
create function saddle_private.community_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from saddle_private.community_admins where user_id=auth.uid())
$$;
create function saddle_private.community_visible(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null
 and exists(select 1 from public.saddle_members where user_id=auth.uid())
 and not exists(select 1 from saddle_private.community_bans where user_id in (auth.uid(),target))
 and exists(select 1 from public.saddle_profiles where user_id=target and visible and accepted_rules)
 and not exists(select 1 from public.saddle_blocks where (user_id=auth.uid() and blocked_id=target) or(user_id=target and blocked_id=auth.uid()))
$$;
grant usage on schema saddle_private to authenticated;
revoke all on function saddle_private.community_admin(),saddle_private.community_visible(uuid) from public,anon,authenticated;
grant execute on function saddle_private.community_admin(),saddle_private.community_visible(uuid) to authenticated;
create function public.saddle_is_moderator() returns boolean language sql stable security invoker set search_path='' as $$ select saddle_private.community_admin() $$;
revoke all on function public.saddle_is_moderator() from public,anon;
grant execute on function public.saddle_is_moderator() to authenticated;

alter table public.saddle_profiles enable row level security;
alter table public.saddle_blocks enable row level security;
revoke all on public.saddle_profiles,public.saddle_blocks from public,anon,authenticated;
grant select,insert,update on public.saddle_profiles to authenticated;
grant select,insert,delete on public.saddle_blocks to authenticated;
create policy profile_read on public.saddle_profiles for select to authenticated using(user_id=(select auth.uid()) or saddle_private.community_visible(user_id) or saddle_private.community_admin());
create policy profile_create on public.saddle_profiles for insert to authenticated with check(user_id=(select auth.uid()));
create policy profile_edit on public.saddle_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy block_read on public.saddle_blocks for select to authenticated using(user_id=(select auth.uid()));
create policy block_add on public.saddle_blocks for insert to authenticated with check(user_id=(select auth.uid()));
create policy block_remove on public.saddle_blocks for delete to authenticated using(user_id=(select auth.uid()));

create table public.saddle_connections(
 id uuid primary key default gen_random_uuid(),
 requester uuid not null references public.saddle_members(user_id),recipient uuid not null references public.saddle_members(user_id),
 status text not null default 'pending' check(status in ('pending','accepted')),created_at timestamptz not null default now(),check(requester<>recipient)
);
create unique index saddle_connections_pair on public.saddle_connections(least(requester,recipient),greatest(requester,recipient));
create index saddle_connections_recipient on public.saddle_connections(recipient);
create table public.saddle_posts(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.saddle_members(user_id),
 body text not null check(char_length(trim(body)) between 1 and 2000),created_at timestamptz not null default now(),hidden boolean not null default false
);
create index saddle_posts_recent on public.saddle_posts(created_at desc,id desc);
create index saddle_posts_author on public.saddle_posts(user_id);
create table public.saddle_comments(
 id uuid primary key default gen_random_uuid(),post_id uuid not null references public.saddle_posts(id) on delete cascade,
 user_id uuid not null references public.saddle_members(user_id),body text not null check(char_length(trim(body)) between 1 and 1000),
 created_at timestamptz not null default now(),hidden boolean not null default false
);
create index saddle_comments_post on public.saddle_comments(post_id,created_at);
create index saddle_comments_author on public.saddle_comments(user_id);
create table public.saddle_reports(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.saddle_members(user_id),
 target_kind text not null check(target_kind in ('profile','post','comment')),target_id uuid not null,
 reason text not null check(reason in ('Harassment','Unsafe advice','Spam','Inappropriate content','Other')),
 details text not null default '' check(char_length(details)<=1000),created_at timestamptz not null default now(),resolved boolean not null default false
);
create index saddle_reports_queue on public.saddle_reports(resolved,created_at);
create index saddle_reports_reporter on public.saddle_reports(user_id);
alter table public.saddle_connections enable row level security;
alter table public.saddle_posts enable row level security;
alter table public.saddle_comments enable row level security;
alter table public.saddle_reports enable row level security;
revoke all on public.saddle_connections,public.saddle_posts,public.saddle_comments,public.saddle_reports from public,anon,authenticated;
grant select,delete on public.saddle_connections to authenticated;
grant insert(requester,recipient) on public.saddle_connections to authenticated;
grant update(status) on public.saddle_connections to authenticated;
grant select,delete on public.saddle_posts,public.saddle_comments to authenticated;
grant insert(user_id,body) on public.saddle_posts to authenticated;
grant insert(post_id,user_id,body) on public.saddle_comments to authenticated;
grant select on public.saddle_reports to authenticated;
grant insert(user_id,target_kind,target_id,reason,details) on public.saddle_reports to authenticated;
create policy connection_read on public.saddle_connections for select to authenticated using((requester=(select auth.uid()) or recipient=(select auth.uid())) and saddle_private.community_visible(requester) and saddle_private.community_visible(recipient));
create policy connection_add on public.saddle_connections for insert to authenticated with check(requester=(select auth.uid()) and saddle_private.community_visible(requester) and saddle_private.community_visible(recipient));
create policy connection_accept on public.saddle_connections for update to authenticated using(recipient=(select auth.uid()) and status='pending' and saddle_private.community_visible(requester) and saddle_private.community_visible(recipient)) with check(recipient=(select auth.uid()) and status='accepted' and saddle_private.community_visible(requester) and saddle_private.community_visible(recipient));
create policy connection_remove on public.saddle_connections for delete to authenticated using(requester=(select auth.uid()) or recipient=(select auth.uid()));
create policy post_read on public.saddle_posts for select to authenticated using((not hidden and saddle_private.community_visible(user_id)) or saddle_private.community_admin());
create policy post_add on public.saddle_posts for insert to authenticated with check(user_id=(select auth.uid()) and saddle_private.community_visible(user_id));
create policy post_remove on public.saddle_posts for delete to authenticated using(user_id=(select auth.uid()) or saddle_private.community_admin());
create policy comment_read on public.saddle_comments for select to authenticated using(((not hidden and saddle_private.community_visible(user_id)) or saddle_private.community_admin()) and exists(select 1 from public.saddle_posts where id=post_id));
create policy comment_add on public.saddle_comments for insert to authenticated with check(user_id=(select auth.uid()) and saddle_private.community_visible(user_id) and exists(select 1 from public.saddle_posts where id=post_id and not hidden));
create policy comment_remove on public.saddle_comments for delete to authenticated using(user_id=(select auth.uid()) or saddle_private.community_admin());
create policy report_read on public.saddle_reports for select to authenticated using(user_id=(select auth.uid()) or saddle_private.community_admin());
create policy report_add on public.saddle_reports for insert to authenticated with check(user_id=(select auth.uid()));
-- Serialize per-account writes to bound public posting/report spam across sessions.
create function saddle_private.social_write_limit() returns trigger language plpgsql security definer set search_path='' as $$
declare recent integer; begin
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,321));
 if tg_table_name='saddle_posts' then
  select count(*) into recent from public.saddle_posts where user_id=new.user_id and created_at>clock_timestamp()-interval '1 minute';
  if recent>=3 then raise exception 'Please wait a minute before posting again';end if;
 elsif tg_table_name='saddle_comments' then
  select count(*) into recent from public.saddle_comments where user_id=new.user_id and created_at>clock_timestamp()-interval '1 minute';
  if recent>=10 then raise exception 'Please wait a minute before commenting again';end if;
 else
  select count(*) into recent from public.saddle_reports where user_id=new.user_id and created_at>clock_timestamp()-interval '1 hour';
  if recent>=10 then raise exception 'Report limit reached. Please try later';end if;
 end if;
 return new;end $$;
revoke all on function saddle_private.social_write_limit() from public,anon,authenticated;
create trigger saddle_posts_limit before insert on public.saddle_posts for each row execute function saddle_private.social_write_limit();
create trigger saddle_comments_limit before insert on public.saddle_comments for each row execute function saddle_private.social_write_limit();
create trigger saddle_reports_limit before insert on public.saddle_reports for each row execute function saddle_private.social_write_limit();
create function public.saddle_moderate_report(report_id uuid,decision text) returns void language plpgsql security definer set search_path='' as $$
declare report public.saddle_reports%rowtype; author uuid; begin
 if not saddle_private.community_admin() then raise exception 'Moderator access required' using errcode='42501';end if;
 select * into strict report from public.saddle_reports where id=report_id for update;
 if decision not in ('dismiss','hide','suspend') then raise exception 'Invalid decision';end if;
 if report.target_kind='profile' then author:=report.target_id;
 elsif report.target_kind='post' then select user_id into author from public.saddle_posts where id=report.target_id;
 else select user_id into author from public.saddle_comments where id=report.target_id;end if;
 if decision='suspend' or (decision='hide' and report.target_kind='profile') then
  if exists(select 1 from saddle_private.community_admins where user_id=author) then raise exception 'An owner cannot be suspended here';end if;
  insert into saddle_private.community_bans(user_id) values(author) on conflict do nothing;
 elsif decision='hide' then
  if report.target_kind='post' then update public.saddle_posts set hidden=true where id=report.target_id;
  elsif report.target_kind='comment' then update public.saddle_comments set hidden=true where id=report.target_id;end if;
 end if;
 update public.saddle_reports set resolved=true where id=report_id;
end $$;
revoke all on function public.saddle_moderate_report(uuid,text) from public,anon;
grant execute on function public.saddle_moderate_report(uuid,text) to authenticated;

-- Private trophy records, one row per show class/result.
create table public.saddle_show_results(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.saddle_members(user_id),horse_id text not null check(char_length(horse_id)<=128),
 show_name text not null check(char_length(trim(show_name)) between 1 and 120),show_date date not null,venue text not null default '' check(char_length(venue)<=160),
 class_name text not null check(char_length(trim(class_name)) between 1 and 120),division text not null default '' check(char_length(division)<=120),
 "placing" integer check("placing" between 1 and 999),score text not null default '' check(char_length(score)<=40),
 ribbon text not null default '' check(ribbon in ('','Blue','Red','Yellow','White','Pink','Green','Purple','Brown','Champion','Reserve champion','Participation')),
 notes text not null default '' check(char_length(notes)<=2000),photo text not null default '' check(photo='' or(char_length(photo)<=1500000 and photo ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')),
 created_at timestamptz not null default now()
);
create index saddle_shows_owner on public.saddle_show_results(user_id,horse_id,show_date desc);
create table public.saddle_decor_catalog(
 id text primary key,name text not null,kind text not null check(kind in ('wallpaper','sticker')),premium boolean not null default false,active boolean not null default true
);
insert into public.saddle_decor_catalog(id,name,kind,premium) values
 ('meadow','Meadow','wallpaper',false),('rose','Rose garden','wallpaper',false),('night','Midnight stable','wallpaper',false),
 ('heritage','Heritage plaid','wallpaper',true),('ribbon','Ribbon','sticker',false),('heart','Heart','sticker',false),('star','Star','sticker',false),('horseshoe','Horseshoe','sticker',false),('crown','Golden crown','sticker',true);
create table public.saddle_entitlements(
 user_id uuid not null references public.saddle_members(user_id),item_id text not null references public.saddle_decor_catalog(id),
 verified_transaction text not null unique,created_at timestamptz not null default now(),primary key(user_id,item_id)
);
create table public.saddle_horse_decor(
 user_id uuid not null references public.saddle_members(user_id),horse_id text not null check(char_length(horse_id)<=128),
 wallpaper_id text not null default 'meadow' references public.saddle_decor_catalog(id),stickers jsonb not null default '[]'::jsonb,
 story text not null default '' check(char_length(story)<=1000),primary key(user_id,horse_id)
);
create function saddle_private.check_horse_record() returns trigger language plpgsql security definer set search_path='' as $$
declare h jsonb; sticker jsonb; item text; begin
 select horse into h from public.saddle_documents d,jsonb_array_elements(d.payload->'horses') horse where d.user_id=new.user_id and horse->>'id'=new.horse_id;
 if h is null then raise exception 'Choose a horse from your own stable';end if;
 if tg_table_name='saddle_horse_decor' then
  if h->>'relationship'<>'Owned' then raise exception 'Decorated stable pages are for owned horses';end if;
  if not exists(select 1 from public.saddle_decor_catalog c where c.id=new.wallpaper_id and c.kind='wallpaper' and c.active and(not c.premium or exists(select 1 from public.saddle_entitlements e where e.user_id=new.user_id and e.item_id=c.id))) then raise exception 'This wallpaper is not unlocked';end if;
  if jsonb_typeof(new.stickers)<>'array' or jsonb_array_length(new.stickers)>12 then raise exception 'Choose up to 12 stickers';end if;
  for sticker in select * from jsonb_array_elements(new.stickers) loop
   item:=sticker->>'item_id';
   if not exists(select 1 from public.saddle_decor_catalog c where c.id=item and c.kind='sticker' and c.active and(not c.premium or exists(select 1 from public.saddle_entitlements e where e.user_id=new.user_id and e.item_id=c.id))) then raise exception 'This sticker is not unlocked';end if;
   if jsonb_typeof(sticker->'x') is distinct from 'number' or jsonb_typeof(sticker->'y') is distinct from 'number' or (sticker->>'x')::numeric not between 5 and 95 or(sticker->>'y')::numeric not between 5 and 95 then raise exception 'Invalid sticker position';end if;
  end loop;
 end if;
 return new;end $$;
revoke all on function saddle_private.check_horse_record() from public,anon,authenticated;
create trigger saddle_show_horse before insert or update on public.saddle_show_results for each row execute function saddle_private.check_horse_record();
create trigger saddle_decor_horse before insert or update on public.saddle_horse_decor for each row execute function saddle_private.check_horse_record();
alter table public.saddle_show_results enable row level security;
alter table public.saddle_decor_catalog enable row level security;
alter table public.saddle_entitlements enable row level security;
alter table public.saddle_horse_decor enable row level security;
revoke all on public.saddle_show_results,public.saddle_decor_catalog,public.saddle_entitlements,public.saddle_horse_decor from public,anon,authenticated;
grant select,insert,update,delete on public.saddle_show_results,public.saddle_horse_decor to authenticated;
grant select on public.saddle_decor_catalog,public.saddle_entitlements to authenticated;
grant all on public.saddle_entitlements to service_role;
create policy show_read on public.saddle_show_results for select to authenticated using(user_id=(select auth.uid()));
create policy show_add on public.saddle_show_results for insert to authenticated with check(user_id=(select auth.uid()));
create policy show_edit on public.saddle_show_results for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy show_remove on public.saddle_show_results for delete to authenticated using(user_id=(select auth.uid()));
create policy decor_read on public.saddle_horse_decor for select to authenticated using(user_id=(select auth.uid()));
create policy decor_add on public.saddle_horse_decor for insert to authenticated with check(user_id=(select auth.uid()));
create policy decor_edit on public.saddle_horse_decor for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy decor_remove on public.saddle_horse_decor for delete to authenticated using(user_id=(select auth.uid()));
create policy catalog_read on public.saddle_decor_catalog for select to authenticated using(active);
create policy entitlement_read on public.saddle_entitlements for select to authenticated using(user_id=(select auth.uid()));

create table public.saddle_horse_pages(
 user_id uuid not null references public.saddle_members(user_id),horse_id text not null,
 snapshot jsonb not null,updated_at timestamptz not null default now(),primary key(user_id,horse_id)
);
alter table public.saddle_horse_pages enable row level security;
revoke all on public.saddle_horse_pages from public,anon,authenticated;
grant select on public.saddle_horse_pages to authenticated;
create policy horse_page_read on public.saddle_horse_pages for select to authenticated using(user_id=(select auth.uid()) or saddle_private.community_visible(user_id));
create function public.saddle_publish_horse(target_horse text,publish boolean) returns void language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid();h jsonb;decor jsonb;results jsonb;ride_count integer;begin
 if who is null then raise exception 'Please sign in';end if;
 if not publish then delete from public.saddle_horse_pages where user_id=who and horse_id=target_horse;return;end if;
 if not saddle_private.community_visible(who) then raise exception 'Publish a community profile first';end if;
 select horse into h from public.saddle_documents d,jsonb_array_elements(d.payload->'horses') horse where d.user_id=who and horse->>'id'=target_horse and horse->>'relationship'='Owned';
 if h is null then raise exception 'Choose an owned horse from your stable';end if;
 select to_jsonb(d)-'user_id'-'horse_id' into decor from public.saddle_horse_decor d where user_id=who and horse_id=target_horse;
 select coalesce(jsonb_agg(jsonb_build_object('show_name',show_name,'show_date',show_date,'class_name',class_name,'division',division,'placing',"placing",'score',score,'ribbon',ribbon) order by show_date desc),'[]') into results from public.saddle_show_results where user_id=who and horse_id=target_horse;
 select count(*) into ride_count from public.saddle_documents d,jsonb_array_elements(d.payload->'rides') ride where d.user_id=who and ride->>'horseId'=target_horse and (ride->>'date')<=to_char(current_date,'YYYY-MM-DD');
 insert into public.saddle_horse_pages(user_id,horse_id,snapshot) values(who,target_horse,jsonb_build_object('name',h->>'name','photo',h->>'photo','breed',h->>'breed','discipline',h->>'discipline','decor',decor,'results',results,'rides',ride_count))
 on conflict(user_id,horse_id) do update set snapshot=excluded.snapshot,updated_at=now();
end $$;
revoke all on function public.saddle_publish_horse(text,boolean) from public,anon;
grant execute on function public.saddle_publish_horse(text,boolean) to authenticated;

-- Verified purchase ledger. Clients cannot mint, alter or replay purchases.
create table saddle_private.decor_receipts(
 transaction_id text primary key,user_id uuid references public.saddle_members(user_id),item_id text references public.saddle_decor_catalog(id),revoked boolean not null default false
);
alter table saddle_private.decor_receipts enable row level security;
revoke all on saddle_private.decor_receipts from public,anon,authenticated;
grant usage on schema saddle_private to service_role;
grant select,insert,update on saddle_private.decor_receipts to service_role;
grant select,update on public.saddle_horse_decor,public.saddle_horse_pages to service_role;
grant delete on public.saddle_horse_decor to service_role;
create function public.saddle_grant_decoration(target_user uuid,target_item text,receipt text) returns void language plpgsql security invoker set search_path='' as $$
declare previous saddle_private.decor_receipts%rowtype;begin
 perform pg_advisory_xact_lock(hashtextextended(receipt,654));
 perform pg_advisory_xact_lock(hashtextextended(target_user::text||target_item,655));
 insert into saddle_private.decor_receipts(transaction_id,user_id,item_id) values(receipt,target_user,target_item) on conflict do nothing;
 select * into strict previous from saddle_private.decor_receipts where transaction_id=receipt;
 if previous.revoked or previous.user_id is distinct from target_user or previous.item_id is distinct from target_item then raise exception 'Purchase is revoked or belongs to another account';end if;
 insert into public.saddle_entitlements(user_id,item_id,verified_transaction) values(target_user,target_item,receipt) on conflict(user_id,item_id) do nothing;
end $$;
create function public.saddle_revoke_decoration(receipt text) returns void language plpgsql security invoker set search_path='' as $$
declare previous saddle_private.decor_receipts%rowtype;other_receipt text;begin
 perform pg_advisory_xact_lock(hashtextextended(receipt,654));
 insert into saddle_private.decor_receipts(transaction_id,revoked) values(receipt,true) on conflict(transaction_id) do update set revoked=true;
 select * into strict previous from saddle_private.decor_receipts where transaction_id=receipt;
 if previous.user_id is null then return;end if;
 perform pg_advisory_xact_lock(hashtextextended(previous.user_id::text||previous.item_id,655));
 delete from public.saddle_entitlements where user_id=previous.user_id and item_id=previous.item_id;
 select transaction_id into other_receipt from saddle_private.decor_receipts where user_id=previous.user_id and item_id=previous.item_id and not revoked limit 1;
 if other_receipt is not null then
  insert into public.saddle_entitlements(user_id,item_id,verified_transaction) values(previous.user_id,previous.item_id,other_receipt);
 else
  delete from public.saddle_horse_decor d where user_id=previous.user_id and not exists(select 1 from public.saddle_documents doc,jsonb_array_elements(doc.payload->'horses') h where doc.user_id=d.user_id and h->>'id'=d.horse_id and h->>'relationship'='Owned');
  update public.saddle_horse_decor set wallpaper_id=case when wallpaper_id=previous.item_id then 'meadow' else wallpaper_id end,
   stickers=(select coalesce(jsonb_agg(s),'[]'::jsonb) from jsonb_array_elements(stickers) s where s->>'item_id'<>previous.item_id)
   where user_id=previous.user_id;
  update public.saddle_horse_pages set snapshot=jsonb_set(snapshot,'{decor}',jsonb_build_object('wallpaper_id',case when snapshot->'decor'->>'wallpaper_id'=previous.item_id then 'meadow' else coalesce(snapshot->'decor'->>'wallpaper_id','meadow') end,'story',coalesce(snapshot->'decor'->>'story',''),'stickers',(select coalesce(jsonb_agg(s),'[]'::jsonb) from jsonb_array_elements(coalesce(snapshot->'decor'->'stickers','[]'::jsonb)) s where s->>'item_id'<>previous.item_id))) where user_id=previous.user_id and snapshot->'decor' is not null and snapshot->'decor'<>'null'::jsonb;
 end if;
end $$;
revoke all on function public.saddle_grant_decoration(uuid,text,text),public.saddle_revoke_decoration(text) from public,anon,authenticated;
grant execute on function public.saddle_grant_decoration(uuid,text,text),public.saddle_revoke_decoration(text) to service_role;

commit;
