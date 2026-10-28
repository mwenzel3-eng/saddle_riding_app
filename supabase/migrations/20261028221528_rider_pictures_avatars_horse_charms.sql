begin;
alter table public.saddle_decor_catalog drop constraint saddle_decor_catalog_kind_check;
alter table public.saddle_decor_catalog add constraint saddle_decor_catalog_kind_check check(kind in ('wallpaper','sticker','avatar','charm'));
insert into public.saddle_decor_catalog(id,name,kind,premium) values
 ('avatar-sage','Meadow rider','avatar',false),('avatar-sunset','Sunset rider','avatar',false),('avatar-midnight','Midnight rider','avatar',false),
 ('avatar-dressage','Show ring rider','avatar',true),('avatar-rosette','Rosette rider','avatar',true),
 ('charm-heart','Rose heart charm','charm',true),('charm-moon','Moonlight charm','charm',true),('charm-horseshoe','Lucky horseshoe charm','charm',true);
alter table public.saddle_horse_decor add column charms jsonb not null default '[]'::jsonb;
alter table public.saddle_profiles add column avatar_item_id text references public.saddle_decor_catalog(id);
alter table public.saddle_profiles add constraint profile_picture_choice check(avatar='' or avatar_item_id is null);
create table public.saddle_rider_pictures(
 user_id uuid primary key references public.saddle_members(user_id),
 photo text not null default '' check(photo='' or(char_length(photo)<=1500000 and photo ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')),
 avatar_item_id text references public.saddle_decor_catalog(id),check(photo='' or avatar_item_id is null)
);
alter table public.saddle_rider_pictures enable row level security;
revoke all on public.saddle_rider_pictures from public,anon,authenticated;
grant select,insert,update on public.saddle_rider_pictures to authenticated;
grant select,insert,update on public.saddle_rider_pictures to service_role;
grant select,update on public.saddle_profiles to service_role;
create policy rider_picture_read on public.saddle_rider_pictures for select to authenticated using(user_id=(select auth.uid()));
create policy rider_picture_create on public.saddle_rider_pictures for insert to authenticated with check(user_id=(select auth.uid()));
create policy rider_picture_edit on public.saddle_rider_pictures for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function saddle_private.check_rider_picture() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.avatar_item_id is not null and not exists(select 1 from public.saddle_decor_catalog c where c.id=new.avatar_item_id and c.kind='avatar' and c.active and(not c.premium or exists(select 1 from public.saddle_entitlements e where e.user_id=new.user_id and e.item_id=c.id))) then raise exception 'This rider avatar is not unlocked';end if;
 return new;
end $$;
revoke all on function saddle_private.check_rider_picture() from public,anon,authenticated;
create trigger rider_picture_choice before insert or update on public.saddle_rider_pictures for each row execute function saddle_private.check_rider_picture();
create trigger community_picture_choice before insert or update on public.saddle_profiles for each row execute function saddle_private.check_rider_picture();

create or replace function saddle_private.check_horse_record() returns trigger language plpgsql security definer set search_path='' as $$
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
  if jsonb_typeof(new.charms) is distinct from 'array' or jsonb_array_length(new.charms)>3 then raise exception 'Choose up to three charms';end if;
  if (select count(*) from jsonb_array_elements(new.charms))<>(select count(distinct value) from jsonb_array_elements(new.charms)) then raise exception 'A charm can only be equipped once';end if;
  for item in select jsonb_array_elements_text(new.charms) loop
   if not exists(select 1 from public.saddle_decor_catalog c where c.id=item and c.kind='charm' and c.active and(not c.premium or exists(select 1 from public.saddle_entitlements e where e.user_id=new.user_id and e.item_id=c.id))) then raise exception 'This charm is not unlocked';end if;
  end loop;
 end if;
 return new;end $$;

create or replace function public.saddle_revoke_decoration(receipt text) returns void language plpgsql security invoker set search_path='' as $$
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
   ,charms=(select coalesce(jsonb_agg(s),'[]'::jsonb) from jsonb_array_elements(charms) s where s<>to_jsonb(previous.item_id))
   where user_id=previous.user_id;
  update public.saddle_horse_pages set snapshot=jsonb_set(snapshot,'{decor}',
   (snapshot->'decor') || jsonb_build_object(
    'wallpaper_id',case when snapshot->'decor'->>'wallpaper_id'=previous.item_id then 'meadow' else coalesce(snapshot->'decor'->>'wallpaper_id','meadow') end,
    'stickers',(select coalesce(jsonb_agg(s),'[]'::jsonb) from jsonb_array_elements(coalesce(snapshot->'decor'->'stickers','[]'::jsonb)) s where s->>'item_id'<>previous.item_id),
    'charms',(select coalesce(jsonb_agg(s),'[]'::jsonb) from jsonb_array_elements(coalesce(snapshot->'decor'->'charms','[]'::jsonb)) s where s<>to_jsonb(previous.item_id))))
   where user_id=previous.user_id and jsonb_typeof(snapshot->'decor')='object';
  update public.saddle_profiles set avatar_item_id=null where user_id=previous.user_id and avatar_item_id=previous.item_id;
  update public.saddle_rider_pictures set avatar_item_id=null where user_id=previous.user_id and avatar_item_id=previous.item_id;
 end if;
end $$;

commit;
