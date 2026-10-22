create function public.memocious_media_update(sid uuid, image uuid, product_version int, operation text, alt_text text, sort_position int) returns void language plpgsql security invoker set search_path='' as $$
declare i memocious.product_images; pv int;
begin
 perform memocious_private.assert_admin(sid);perform pg_advisory_xact_lock(hashtextextended('memocious:catalogue',0));
 select * into i from memocious.product_images where id=image for update;
 if not found then raise exception 'Image unavailable' using errcode='22023';end if;
 select version into pv from memocious.products where id=i.product_id for update;
 if pv<>product_version then raise exception 'Version conflict' using errcode='40001';end if;
 if operation='remove' then delete from memocious.product_images where id=i.id;
 elsif operation in ('publish','edit','unpublish') then
 if char_length(alt_text) not between 1 and 300 or sort_position not between 0 and 100 or i.sanitized_at is null then raise exception 'Invalid image' using errcode='22023';end if;
 update memocious.product_images set alt=alt_text,sort_order=sort_position,published_at=case operation when 'publish' then now() when 'unpublish' then null else published_at end,public_path=case operation when 'publish' then '/media/'||i.id::text||'.webp' else public_path end where id=i.id;
 else raise exception 'Invalid operation' using errcode='22023';end if;
 update memocious.products set version=version+1,updated_at=now() where id=i.product_id;
 perform memocious_private.refresh_publication();
 insert into memocious.audit_log(actor_session_id,actor_kind,action,entity,entity_id,request_id) values(sid,'admin','media.'||operation,'product',i.product_id,gen_random_uuid());
end $$;
revoke execute on function public.memocious_media_update(uuid,uuid,int,text,text,int) from public,anon,authenticated;grant execute on function public.memocious_media_update(uuid,uuid,int,text,text,int) to service_role;
