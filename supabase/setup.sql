-- Run once in a NEW, dedicated Saddle School Supabase project.
-- Do not run in Rangebook production or its recovery project.
begin;
create schema if not exists saddle_private;
revoke all on schema saddle_private from public, anon, authenticated;

create table public.saddle_members (
 user_id uuid primary key references auth.users(id),
 created_at timestamptz not null default now()
);
create table public.saddle_documents (
 user_id uuid primary key references public.saddle_members(user_id),
 version bigint not null check(version>0),
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 updated_at timestamptz not null default now()
);
create table public.saddle_versions (
 user_id uuid not null references public.saddle_members(user_id),
 version bigint not null check(version>0),
 payload jsonb not null,
 created_at timestamptz not null default now(),
 primary key(user_id,version)
);
alter table public.saddle_members enable row level security;
alter table public.saddle_documents enable row level security;
alter table public.saddle_versions enable row level security;
revoke all on public.saddle_members,public.saddle_documents,public.saddle_versions from public,anon,authenticated;
grant select on public.saddle_members,public.saddle_documents,public.saddle_versions to authenticated;
grant all on public.saddle_members,public.saddle_documents,public.saddle_versions to service_role;
create policy "read own membership" on public.saddle_members for select to authenticated using(user_id=(select auth.uid()));
create policy "read own document" on public.saddle_documents for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.saddle_members m where m.user_id=(select auth.uid())));
create policy "read own versions" on public.saddle_versions for select to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.saddle_members m where m.user_id=(select auth.uid())));

-- Necessary privileged trigger: callers have no direct write privilege to version history.
-- No user-supplied table/object names; invoked only by writes to the protected table.
create function saddle_private.retain_saddle_version() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 insert into public.saddle_versions(user_id,version,payload) values(new.user_id,new.version,new.payload);
 return new;
end $$;
revoke all on function saddle_private.retain_saddle_version() from public,anon,authenticated;
create trigger saddle_retain_version after insert or update on public.saddle_documents for each row execute function saddle_private.retain_saddle_version();

-- Public RPC intentionally uses SECURITY DEFINER because direct table writes are revoked.
-- Account identity always comes from the verified JWT, never a request parameter.
-- Membership, payload shape and optimistic version are checked before each mutation.
create function public.save_saddle_document(expected_version bigint,new_payload jsonb,expected_user_id uuid) returns bigint
 language plpgsql security definer set search_path='' as $$
declare who uuid := auth.uid(); next_version bigint;
begin
 if who is null or who is distinct from expected_user_id or not exists(select 1 from public.saddle_members where user_id=who) then
  raise exception 'SADDLE_NOT_INVITED' using errcode='42501';
 end if;
 if expected_version is null or expected_version<0 then raise exception 'Invalid version';end if;
 if new_payload is null or jsonb_typeof(new_payload) is distinct from 'object'
  or (new_payload->>'version') is distinct from '1'
  or jsonb_typeof(new_payload->'rider') is distinct from 'object'
  or jsonb_typeof(new_payload->'horses') is distinct from 'array'
  or jsonb_typeof(new_payload->'rides') is distinct from 'array'
  or jsonb_typeof(new_payload->'completed') is distinct from 'array'
  then raise exception 'Invalid document';
 end if;
 if expected_version=0 then
  begin
   insert into public.saddle_documents(user_id,version,payload) values(who,1,new_payload);
  exception when unique_violation then raise exception 'SADDLE_CONFLICT' using errcode='40001';
  end;
  return 1;
 end if;
 update public.saddle_documents set payload=new_payload,version=version+1,updated_at=now()
  where user_id=who and version=expected_version returning version into next_version;
 if not found then raise exception 'SADDLE_CONFLICT' using errcode='40001';end if;
 return next_version;
end $$;
revoke all on function public.save_saddle_document(bigint,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.save_saddle_document(bigint,jsonb,uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('saddle-media','saddle-media',false,52428800,array['video/mp4','video/quicktime','video/webm']);
-- Immutable objects: no client UPDATE/DELETE, preserving older version references.
create policy "read own saddle media" on storage.objects for select to authenticated
 using(bucket_id='saddle-media' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.saddle_members m where m.user_id=(select auth.uid())));
create policy "insert own saddle media" on storage.objects for insert to authenticated
 with check(bucket_id='saddle-media' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.saddle_members m where m.user_id=(select auth.uid())));
commit;
