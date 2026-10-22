create or replace function public.memocious_session_open(cookie_hash text, csrf_hash text, provider_user uuid, audience text, encrypted_tokens text, key_version text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare sid uuid; existing memocious_private.app_sessions;
begin
 if audience not in ('customer','guest','admin') or char_length(cookie_hash)<>64 or char_length(csrf_hash)<>64 then raise exception 'Invalid session';end if;
 if audience='admin' and not exists(select 1 from memocious_private.admin_users where user_id=provider_user and active) then raise exception 'Access unavailable' using errcode='42501';end if;
 if audience='customer' and not exists(select 1 from auth.users where id=provider_user and email_confirmed_at is not null and not is_anonymous) then raise exception 'Identity unavailable' using errcode='42501';end if;
 insert into memocious_private.app_sessions(token_hash,csrf_hash,user_id,audience,encrypted_tokens,key_version,absolute_expires_at)
 values(cookie_hash,csrf_hash,provider_user,audience,encrypted_tokens,key_version,now()+case when audience='admin' then interval '8 hours' else interval '7 days' end)
 on conflict(token_hash) do nothing returning id into sid;
 if sid is null then
 select * into existing from memocious_private.app_sessions s where s.token_hash=cookie_hash for update;
 if audience<>'guest' or existing.audience<>'guest' or existing.csrf_hash<>csrf_hash or existing.revoked_at is not null or existing.absolute_expires_at<=now() then raise exception 'Session unavailable' using errcode='28000';end if;
 sid:=existing.id;
 end if;
 return sid;
end $$;
