create function public.memocious_admin_product(sid uuid, product_id uuid, expected_version int, action text, fields jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor uuid; p memocious.products; new_id uuid; allowed text[]:=array['slug','name','description','detail','pricePaise','maxPricePaise','materials','dimensions','colour','customizable','featured','inStock','lead','active'];
begin
 actor:=memocious_private.assert_admin(sid,action in ('delete','purge'),action in ('delete','purge'));
 if action not in ('create','edit','hide','show','delete','purge','duplicate') or exists(select 1 from jsonb_object_keys(fields) k where not k=any(allowed)) then raise exception 'Invalid product action';end if;
 if action='create' then
 insert into memocious.products(slug,name,description,detail,price_paise,materials,dimensions) values(fields->>'slug',fields->>'name',coalesce(fields->>'description',''),coalesce(fields->>'detail',''),(fields->>'pricePaise')::bigint,coalesce(fields->>'materials',''),coalesce(fields->>'dimensions','')) returning * into p;
 else
 select * into p from memocious.products where id=product_id for update;
 if not found then raise exception 'Gift unavailable';end if;
 if p.version<>expected_version then raise exception 'Version conflict' using errcode='40001';end if;
 if action='purge' then
 if p.deleted_at is null then raise exception 'Soft delete first';end if;
 -- Order snapshots remain; nullable FK is cleared by the FK, never order deletion.
 delete from memocious.products where id=p.id;
 elsif action='duplicate' then
 insert into memocious.products(slug,name,description,detail,price_paise,materials,dimensions) values(p.slug||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,8),left(p.name||' (copy)',120),p.description,p.detail,p.price_paise,p.materials,p.dimensions) returning id into new_id;
 else
 update memocious.products set name=coalesce(fields->>'name',name),slug=coalesce(fields->>'slug',slug),description=coalesce(fields->>'description',description),detail=coalesce(fields->>'detail',detail),price_paise=case when fields?'pricePaise' then (fields->>'pricePaise')::bigint else price_paise end,max_price_paise=case when fields?'maxPricePaise' then (fields->>'maxPricePaise')::bigint else max_price_paise end,materials=coalesce(fields->>'materials',materials),dimensions=coalesce(fields->>'dimensions',dimensions),colour=coalesce(fields->>'colour',colour),customizable=coalesce((fields->>'customizable')::boolean,customizable),featured=coalesce((fields->>'featured')::boolean,featured),in_stock=coalesce((fields->>'inStock')::boolean,in_stock),lead_type=coalesce(fields->>'lead',lead_type),active=case action when 'hide' then false when 'show' then true when 'delete' then false else active end,deleted_at=case when action='delete' then now() else deleted_at end,version=version+1,updated_at=now() where id=p.id returning * into p;
 end if;
 end if;
 perform memocious_private.refresh_publication();
 insert into memocious.audit_log(actor_session_id,actor_kind,action,entity,entity_id,request_id,redacted_diff) values(sid,'admin','product.'||action,'product',coalesce(new_id,p.id),gen_random_uuid(),jsonb_build_object('version',p.version));
 return jsonb_build_object('id',coalesce(new_id,p.id),'version',p.version);
end $$;

-- No public role receives execution of business helpers, session stores or mutations.
revoke execute on all functions in schema memocious_private from public,anon,authenticated;
grant execute on all functions in schema memocious_private to service_role;

revoke execute on all functions in schema memocious_private from public,anon,authenticated;
grant execute on all functions in schema memocious_private to service_role;
-- Scope revocation to this application's named RPCs only.
do $$ declare r record; begin
 for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'memocious_%' loop
 execute format('revoke execute on function %s from public,anon,authenticated',r.signature);
 execute format('grant execute on function %s to service_role',r.signature);
 end loop;
end $$;
grant execute on function public.memocious_taxonomy(),public.memocious_product(text),public.memocious_public_settings(),public.memocious_catalogue(jsonb) to anon,authenticated;
