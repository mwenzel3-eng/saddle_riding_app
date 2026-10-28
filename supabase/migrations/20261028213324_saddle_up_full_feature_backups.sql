begin;
-- Existing email accounts may predate automatic membership. Never backfill moderator roles.
insert into public.saddle_members(user_id) select id from auth.users where email is not null and not coalesce(is_anonymous,false) on conflict do nothing;
grant select on saddle_private.community_admins,saddle_private.community_bans to service_role;
create function public.saddle_private_backup() returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object(
 'community_admins',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from saddle_private.community_admins t),
 'community_bans',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from saddle_private.community_bans t),
 'decor_receipts',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from saddle_private.decor_receipts t),
 'critique_settings',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from saddle_private.critique_settings t),
 'critique_usage',(select coalesce(jsonb_agg(to_jsonb(t)),'[]') from saddle_private.critique_usage t)
 )
$$;
revoke all on function public.saddle_private_backup() from public,anon,authenticated;
grant execute on function public.saddle_private_backup() to service_role;
commit;
