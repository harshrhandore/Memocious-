alter table public.memocious_public_config add column brand text not null default 'Memocious',add column tagline text not null default 'Thoughtful gifts, made personal.',add column contact_email text not null default '',add column require_login boolean not null default false;
insert into memocious.site_settings(key,value,classification) values('contact_email','""','public'),('require_login','false','private');
create or replace function public.memocious_public_settings() returns jsonb language sql stable security invoker set search_path='' as $$ select jsonb_build_object('whatsappNumber',whatsapp_number,'brand',brand,'tagline',tagline,'contactEmail',contact_email,'requireLogin',require_login) from public.memocious_public_config where singleton; $$;
create function public.memocious_admin_settings(sid uuid, fields jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare k text; v jsonb;
begin
 perform memocious_private.assert_admin(sid,true,true);
 if exists(select 1 from jsonb_object_keys(fields) x where x not in ('brand','tagline','contactEmail','whatsappNumber','requireLogin')) or char_length(fields->>'brand') not between 1 and 80 or char_length(fields->>'tagline')>160 or char_length(fields->>'contactEmail')>254 or ((fields->>'contactEmail')<>'' and (fields->>'contactEmail')!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') then raise exception 'Invalid settings' using errcode='22023';end if;
 perform public.memocious_admin_number(sid,fields->>'whatsappNumber');
 for k,v in select key,value from jsonb_each(fields) loop
 if k='whatsappNumber' then continue;end if;
 update memocious.site_settings set value=v,version=version+1,editor_session_id=sid,updated_at=now() where key=case k when 'contactEmail' then 'contact_email' when 'requireLogin' then 'require_login' else k end;
 end loop;
 update public.memocious_public_config set brand=fields->>'brand',tagline=fields->>'tagline',contact_email=fields->>'contactEmail',require_login=(fields->>'requireLogin')::boolean where singleton;
 insert into memocious.audit_log(actor_session_id,actor_kind,action,entity,request_id) values(sid,'admin','settings.save','settings',gen_random_uuid());
end $$;
revoke execute on function public.memocious_admin_settings(uuid,jsonb) from public,anon,authenticated;grant execute on function public.memocious_admin_settings(uuid,jsonb) to service_role;
