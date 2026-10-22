create or replace function memocious_private.assert_admin(sid uuid, owner_only boolean default false, recent boolean default false)
returns uuid language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;a memocious_private.admin_users;
begin
 s:=memocious_private.assert_session(sid,'admin',true);
 select * into a from memocious_private.admin_users where user_id=s.user_id and active and revoked_at is null;
 if not found or s.assurance<>'aal2' or s.mfa_verified_at is null or (owner_only and a.role<>'owner') or (recent and s.mfa_verified_at<now()-interval '5 minutes') then raise exception 'Access unavailable' using errcode='42501';end if;return s.user_id;
end $$;
