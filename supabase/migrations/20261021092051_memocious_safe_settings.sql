create table public.memocious_public_config (singleton boolean primary key default true check(singleton), whatsapp_number text check(whatsapp_number ~ '^[1-9][0-9]{6,14}$'));
alter table public.memocious_public_config enable row level security;
revoke all on public.memocious_public_config from public,anon,authenticated;
grant select on public.memocious_public_config to anon,authenticated;
grant select,insert,update on public.memocious_public_config to service_role;
create policy safe_config_read on public.memocious_public_config for select to anon,authenticated using(true);
insert into public.memocious_public_config(singleton,whatsapp_number) values(true,null);
create or replace function public.memocious_public_settings() returns jsonb language sql stable security invoker set search_path='' as $$ select jsonb_build_object('whatsappNumber',whatsapp_number) from public.memocious_public_config where singleton; $$;
create function public.memocious_admin_number(sid uuid, number_digits text) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform memocious_private.assert_admin(sid,true,true);
 if number_digits is not null and number_digits!~'^[1-9][0-9]{6,14}$' then raise exception 'Invalid number';end if;
 update memocious.site_settings set value=coalesce(to_jsonb(number_digits),'null'),version=version+1,editor_session_id=sid,updated_at=now() where key='whatsapp_number';
 update public.memocious_public_config set whatsapp_number=number_digits where singleton;
 insert into memocious.audit_log(actor_session_id,actor_kind,action,entity,request_id,redacted_diff) values(sid,'admin','settings.number','settings',gen_random_uuid(),jsonb_build_object('configured',number_digits is not null));
end $$;
revoke execute on function public.memocious_admin_number(uuid,text) from public,anon,authenticated;
grant execute on function public.memocious_admin_number(uuid,text) to service_role;
