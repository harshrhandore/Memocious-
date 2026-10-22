-- Operator-only entry point. No HTTP route, signup trigger, user metadata or browser token can provision an owner.
create function public.memocious_operator_bootstrap(provider_user uuid, approved_email_hash text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('memocious:owner-bootstrap',0));
 if approved_email_hash!~'^[a-f0-9]{64}$' or not exists(select 1 from auth.users u where u.id=provider_user and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and encode(sha256(convert_to(lower(trim(u.email)),'UTF8')),'hex')=approved_email_hash) then raise exception 'Verified owner identity required' using errcode='42501';end if;
 if exists(select 1 from memocious_private.admin_users where role='owner' and user_id<>provider_user) then raise exception 'Owner already provisioned' using errcode='42501';end if;
 if exists(select 1 from memocious_private.admin_users where user_id=provider_user) then raise exception 'Use the audited role/recovery procedure for existing membership' using errcode='42501';end if;
 insert into memocious_private.admin_users(user_id,role) values(provider_user,'owner');
 insert into memocious.audit_log(actor_kind,action,entity,entity_id,request_id) values('operator','owner.bootstrap','identity',provider_user,gen_random_uuid());
end $$;
revoke execute on function public.memocious_operator_bootstrap(uuid,text) from public,anon,authenticated;
grant execute on function public.memocious_operator_bootstrap(uuid,text) to service_role;
