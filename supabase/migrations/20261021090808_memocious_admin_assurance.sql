create function public.memocious_admin_assert(sid uuid, owner_only boolean default false, recent boolean default false) returns uuid language sql security invoker set search_path='' as $$ select memocious_private.assert_admin(sid,owner_only,recent); $$;
create function public.memocious_admin_list(sid uuid, page_num int default 1) returns jsonb language plpgsql security invoker set search_path='' as $$
begin perform memocious_private.assert_admin(sid);if page_num not between 1 and 10000 then raise exception 'Invalid page';end if;
 return jsonb_build_object('products',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'slug',p.slug,'pricePaise',p.price_paise,'active',p.active,'deleted',p.deleted_at is not null,'version',p.version)),'[]') from (select id,name,slug,price_paise,active,deleted_at,version from memocious.products order by updated_at desc,id limit 24 offset (page_num-1)*24) p));end $$;
-- Only called after a managed-provider TOTP challenge succeeds on the backend.
-- Assurance never comes from a browser boolean or a Google account claim.
create function public.memocious_session_mfa(sid uuid, new_cookie_hash text, new_csrf_hash text, new_encrypted_tokens text) returns void language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;
begin s:=memocious_private.assert_session(sid,'admin',true);
 if not exists(select 1 from memocious_private.admin_users where user_id=s.user_id and active) then raise exception 'Access unavailable' using errcode='42501';end if;
 if char_length(new_cookie_hash)<>64 or char_length(new_csrf_hash)<>64 then raise exception 'Invalid session';end if;
 update memocious_private.app_sessions set token_hash=new_cookie_hash,csrf_hash=new_csrf_hash,encrypted_tokens=new_encrypted_tokens,assurance='aal2',mfa_verified_at=now(),credential_version=credential_version+1 where id=sid;
 insert into memocious.audit_log(actor_session_id,actor_kind,action,entity,entity_id,request_id) values(sid,'admin','session.mfa','session',sid,gen_random_uuid());
end $$;
revoke execute on function public.memocious_admin_assert(uuid,boolean,boolean),public.memocious_admin_list(uuid,int),public.memocious_session_mfa(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.memocious_admin_assert(uuid,boolean,boolean),public.memocious_admin_list(uuid,int),public.memocious_session_mfa(uuid,text,text,text) to service_role;
