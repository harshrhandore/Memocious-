-- A plan is bound to the exact IDs and versions. The confirmation cannot authorize products added later.
create function public.memocious_admin_delete(sid uuid, scope_ids uuid[], mode text, expected_digest text default null, confirmation text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare ids uuid[]; fingerprint text; n int; rowp record;
begin
 perform memocious_private.assert_admin(sid,true,true);
 perform pg_advisory_xact_lock(hashtextextended('memocious:catalogue',0));
 if mode not in ('soft','permanent') or (scope_ids is not null and (cardinality(scope_ids) not between 1 and 100 or cardinality(scope_ids)<>(select count(distinct x) from unnest(scope_ids) x))) then raise exception 'Invalid scope' using errcode='22023';end if;
 select array_agg(p.id order by p.id),count(*),encode(sha256(convert_to(coalesce(string_agg(p.id::text||':'||p.version,',' order by p.id),'')||':'||mode,'UTF8')),'hex') into ids,n,fingerprint from memocious.products p where (scope_ids is null or p.id=any(scope_ids)) and (case mode when 'permanent' then p.deleted_at is not null else p.deleted_at is null end);
 if n>10000 then raise exception 'Scope too large' using errcode='22023';end if;
 if expected_digest is null then return jsonb_build_object('count',n,'digest',fingerprint,'mode',mode);end if;
 if fingerprint<>expected_digest or confirmation is distinct from 'DELETE '||n::text or n=0 then raise exception 'Deletion scope changed' using errcode='40001';end if;
 if mode='permanent' then
 delete from memocious.products p where p.id=any(ids);
 else
 update memocious.products p set active=false,deleted_at=now(),version=version+1,updated_at=now() where p.id=any(ids);
 end if;
 perform memocious_private.refresh_publication();
 -- No customer text or contacts in the audit entry. Historical item snapshots and events are retained.
 insert into memocious.audit_log(actor_session_id,actor_kind,action,entity,request_id,redacted_diff) values(sid,'admin','product.bulk.'||mode,'products',gen_random_uuid(),jsonb_build_object('count',n,'scopeHash',fingerprint));
 return jsonb_build_object('deleted',n);
end $$;
revoke execute on function public.memocious_admin_delete(uuid,uuid[],text,text,text) from public,anon,authenticated;
grant execute on function public.memocious_admin_delete(uuid,uuid[],text,text,text) to service_role;

-- Public provider tokens cannot bypass the login gate through the Data API.
alter policy published_read on public.memocious_catalogue_products using (not coalesce((select require_login from public.memocious_public_config where singleton),true));
alter policy published_read on public.memocious_taxonomy_items using (not coalesce((select require_login from public.memocious_public_config where singleton),true));

create function public.memocious_csrf_rotate(cookie_hash text, new_csrf_hash text) returns void language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;
begin
 if char_length(new_csrf_hash)<>64 then raise exception 'Invalid CSRF' using errcode='22023';end if;
 select * into s from memocious_private.app_sessions a where a.token_hash=cookie_hash;
 if not found then return;end if;
 perform memocious_private.assert_session(s.id);
 update memocious_private.app_sessions set csrf_hash=new_csrf_hash where id=s.id;
end $$;
revoke execute on function public.memocious_csrf_rotate(text,text) from public,anon,authenticated;
grant execute on function public.memocious_csrf_rotate(text,text) to service_role;

-- Auth-trigger inserts only a blank public profile: never copy user_metadata roles or admin claims.
create function memocious_private.new_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into memocious.profiles(user_id) values(new.id) on conflict(user_id) do nothing;return new;end $$;
revoke execute on function memocious_private.new_profile() from public,anon,authenticated,service_role;
create trigger memocious_profile_created after insert on auth.users for each row execute function memocious_private.new_profile();
insert into memocious.profiles(user_id) select id from auth.users on conflict(user_id) do nothing;
