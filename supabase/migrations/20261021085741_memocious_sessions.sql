-- Browser tokens have no EXECUTE on any business/session function.
create function memocious_private.assert_session(sid uuid, wanted text default null, intentional boolean default false)
returns memocious_private.app_sessions language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;
begin
 select * into s from memocious_private.app_sessions where id=sid for update;
 if not found or s.revoked_at is not null or s.absolute_expires_at<=now() or
 (s.audience='admin' and s.last_active_at<=now()-interval '30 minutes') or
 (s.audience<>'admin' and s.last_active_at<=now()-interval '7 days') or (wanted is not null and s.audience<>wanted) then
 raise exception 'Session unavailable' using errcode='28000'; end if;
 if intentional then update memocious_private.app_sessions set last_active_at=now() where id=sid; end if;
 return s;
end $$;
create function memocious_private.assert_admin(sid uuid, owner_only boolean default false, recent boolean default false)
returns uuid language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions; a memocious_private.admin_users;
begin
 s:=memocious_private.assert_session(sid,'admin',true);
 select * into a from memocious_private.admin_users where user_id=s.user_id and active;
 if not found or s.assurance<>'aal2' or s.mfa_verified_at is null or (owner_only and a.role<>'owner') or
 (recent and s.mfa_verified_at<now()-interval '5 minutes') then raise exception 'Access unavailable' using errcode='42501'; end if;
 return s.user_id;
end $$;

create function public.memocious_session_open(cookie_hash text, csrf_hash text, provider_user uuid, audience text, encrypted_tokens text, key_version text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare sid uuid;
begin
 if audience not in ('customer','guest','admin') or char_length(cookie_hash)<>64 or char_length(csrf_hash)<>64 then raise exception 'Invalid session'; end if;
 if audience='admin' and not exists(select 1 from memocious_private.admin_users where user_id=provider_user and active) then raise exception 'Access unavailable' using errcode='42501'; end if;
 if audience='customer' and not exists(select 1 from auth.users where id=provider_user and email_confirmed_at is not null and not is_anonymous) then raise exception 'Identity unavailable' using errcode='42501'; end if;
 insert into memocious_private.app_sessions(token_hash,csrf_hash,user_id,audience,encrypted_tokens,key_version,absolute_expires_at)
 values(cookie_hash,csrf_hash,provider_user,audience,encrypted_tokens,key_version,now()+case when audience='admin' then interval '8 hours' else interval '7 days' end) returning id into sid;
 return sid;
end $$;
create function public.memocious_session_read(cookie_hash text, intentional boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;
begin
 select * into s from memocious_private.app_sessions where token_hash=cookie_hash;
 if not found then return null; end if;
 s:=memocious_private.assert_session(s.id,null,intentional);
 if s.audience='admin' and not exists(select 1 from memocious_private.admin_users where user_id=s.user_id and active) then raise exception 'Access unavailable' using errcode='42501'; end if;
 return jsonb_build_object('id',s.id,'userId',s.user_id,'audience',s.audience,'assurance',s.assurance,'mfaAt',s.mfa_verified_at,'encryptedTokens',s.encrypted_tokens,'csrfHash',s.csrf_hash,'credentialVersion',s.credential_version);
end $$;
create function public.memocious_session_revoke(sid uuid, everywhere boolean default false)
returns void language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;
begin
 s:=memocious_private.assert_session(sid);
 update memocious_private.app_sessions set revoked_at=now()
 where id=sid or (everywhere and user_id=s.user_id and audience=s.audience);
 -- Keep tombstone metadata; revoked sessions cannot resume.
 update memocious.guest_grants set revoked_at=now() where session_id=sid;
end $$;
create function public.memocious_refresh_claim(sid uuid, lease uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 perform memocious_private.assert_session(sid);
 update memocious_private.app_sessions set refresh_lease_id=lease,refresh_lease_until=now()+interval '20 seconds'
 where id=sid and (refresh_lease_until is null or refresh_lease_until<now());
 return found;
end $$;
create function public.memocious_refresh_commit(sid uuid, lease uuid, tokens text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform memocious_private.assert_session(sid);
 update memocious_private.app_sessions set encrypted_tokens=tokens,credential_version=credential_version+1,refresh_lease_id=null,refresh_lease_until=null where id=sid and refresh_lease_id=lease and refresh_lease_until>now();
 if not found then raise exception 'Refresh conflict' using errcode='40001';end if;
end $$;


revoke execute on all functions in schema memocious_private from public,anon,authenticated;
grant execute on all functions in schema memocious_private to service_role;
-- Scope revocation to this application's named RPCs only.
do $$ declare r record; begin
 for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'memocious_%' loop
 execute format('revoke execute on function %s from public,anon,authenticated',r.signature);
 execute format('grant execute on function %s to service_role',r.signature);
 end loop;
end $$;
