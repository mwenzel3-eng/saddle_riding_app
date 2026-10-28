-- Add to the existing Saddle School project only. No client write access.
begin;
create table saddle_private.critique_settings (
 singleton boolean primary key default true check(singleton),
 daily_limit integer not null default 5 check(daily_limit between 1 and 100),
 cooldown_seconds integer not null default 60 check(cooldown_seconds between 1 and 3600)
);
insert into saddle_private.critique_settings(singleton) values(true);
create table saddle_private.critique_usage (
 user_id uuid primary key references public.saddle_members(user_id) on delete cascade,
 usage_day date not null,
 used integer not null check(used>=0),
 last_requested_at timestamptz not null
);
alter table saddle_private.critique_settings enable row level security;
alter table saddle_private.critique_usage enable row level security;
revoke all on saddle_private.critique_settings,saddle_private.critique_usage from public,anon,authenticated;
grant usage on schema saddle_private to service_role;
grant select on saddle_private.critique_settings to service_role;
grant select,insert,update on saddle_private.critique_usage to service_role;

-- Service-only RPC, SECURITY INVOKER: the Edge Function supplies the verified user ID.
-- Reserving locks the per-user row, serializing requests across all devices/instances.
create function public.saddle_critique_quota(target_user_id uuid,reserve boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 settings saddle_private.critique_settings%rowtype;
 usage saddle_private.critique_usage%rowtype;
 current_time_utc timestamptz;
 today date;
 reset_at timestamptz;
 used_today integer;
 wait_seconds integer;
 reason text;
begin
 if not exists(select 1 from public.saddle_members where user_id=target_user_id) then
  raise exception 'SADDLE_NOT_INVITED' using errcode='42501';
 end if;
 select * into strict settings from saddle_private.critique_settings where singleton=true;
 if reserve then
  insert into saddle_private.critique_usage(user_id,usage_day,used,last_requested_at)
   values(target_user_id,(clock_timestamp() at time zone 'UTC')::date,0,'-infinity')
   on conflict(user_id) do nothing;
  select * into usage from saddle_private.critique_usage where user_id=target_user_id for update;
 else
  select * into usage from saddle_private.critique_usage where user_id=target_user_id;
 end if;
 -- Read the clock after acquiring the lock, including requests queued over midnight.
 current_time_utc:=clock_timestamp();
 today:=(current_time_utc at time zone 'UTC')::date;
 reset_at:=((today+1)::timestamp at time zone 'UTC');
 used_today:=case when usage.usage_day=today then usage.used else 0 end;
 wait_seconds:=case when usage.last_requested_at is null or not isfinite(usage.last_requested_at) then 0 else
  greatest(0,ceil(extract(epoch from (usage.last_requested_at+make_interval(secs=>settings.cooldown_seconds)-current_time_utc)))::integer) end;
 if used_today>=settings.daily_limit then
  reason:='daily_limit';wait_seconds:=greatest(1,ceil(extract(epoch from reset_at-current_time_utc))::integer);
 elsif wait_seconds>0 then reason:='cooldown';
 end if;
 if reserve and reason is null then
  update saddle_private.critique_usage set usage_day=today,used=used_today+1,last_requested_at=current_time_utc where user_id=target_user_id;
  used_today:=used_today+1;
 end if;
 return jsonb_build_object('allowed',reason is null,'reason',reason,
  'limit',settings.daily_limit,'remaining',greatest(0,settings.daily_limit-used_today),
  'resetsAt',reset_at,'retryAfterSeconds',case when reserve and reason is null then settings.cooldown_seconds else wait_seconds end);
end $$;
revoke all on function public.saddle_critique_quota(uuid,boolean) from public,anon,authenticated;
grant execute on function public.saddle_critique_quota(uuid,boolean) to service_role;
commit;
