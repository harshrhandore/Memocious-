create function public.memocious_media_ready(sid uuid, job_id uuid, pixel_width int, pixel_height int, output_size int, digest text, failed boolean default false) returns uuid language plpgsql security invoker set search_path='' as $$
declare j memocious_private.product_media_jobs; iid uuid;
begin
 perform memocious_private.assert_admin(sid);perform pg_advisory_xact_lock(hashtextextended('memocious:catalogue',0));
 select * into j from memocious_private.product_media_jobs where id=job_id for update;
 if not found or j.session_id<>sid or j.expires_at<=now() or j.status not in ('issued','processing') or not exists(select 1 from memocious.products where id=j.product_id and deleted_at is null) then raise exception 'Upload unavailable' using errcode='42501';end if;
 if failed then update memocious_private.product_media_jobs set status='rejected' where id=j.id;return null;end if;
 if pixel_width not between 1 and 2048 or pixel_height not between 1 and 2048 or pixel_width::bigint*pixel_height>20000000 or output_size not between 1 and 2097152 or digest!~'^[0-9a-f]{64}$' then raise exception 'Invalid processed image' using errcode='22023';end if;
 insert into memocious.product_images(product_id,private_path,alt,sort_order,width,height,sanitized_at) values(j.product_id,j.id::text||'.webp',j.alt,(select coalesce(max(sort_order),-1)+1 from memocious.product_images where product_id=j.product_id),pixel_width,pixel_height,now()) returning id into iid;
 update memocious_private.product_media_jobs set status='attached',width=pixel_width,height=pixel_height,output_bytes=output_size,content_hash=digest,image_id=iid where id=j.id;
 update memocious.products set version=version+1,updated_at=now() where id=j.product_id;
 insert into memocious.audit_log(actor_session_id,actor_kind,action,entity,entity_id,request_id) values(sid,'admin','media.attach','product',j.product_id,gen_random_uuid());return iid;
end $$;
revoke execute on function public.memocious_media_ready(uuid,uuid,int,int,int,text,boolean) from public,anon,authenticated;grant execute on function public.memocious_media_ready(uuid,uuid,int,int,int,text,boolean) to service_role;
