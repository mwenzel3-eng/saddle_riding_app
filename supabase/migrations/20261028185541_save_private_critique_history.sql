begin;
create table public.saddle_critiques (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.saddle_members(user_id) on delete cascade,
 created_at timestamptz not null default now(),
 clip_name text not null check(char_length(clip_name) between 1 and 255),
 ride_id text check(char_length(ride_id)<=128),
 focus text not null default '' check(char_length(focus)<=1000),
 critique text not null check(char_length(critique) between 1 and 20000),
 model text not null check(char_length(model) between 1 and 128)
);
create index saddle_critiques_user_created on public.saddle_critiques(user_id,created_at desc,id desc);
alter table public.saddle_critiques enable row level security;
revoke all on public.saddle_critiques from public,anon,authenticated;
grant select on public.saddle_critiques to authenticated;
grant select,insert on public.saddle_critiques to service_role;
create policy "read own invited critiques" on public.saddle_critiques for select to authenticated
 using(user_id=(select auth.uid()) and exists(select 1 from public.saddle_members m where m.user_id=(select auth.uid())));
commit;
