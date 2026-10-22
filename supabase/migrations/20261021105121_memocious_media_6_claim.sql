create function public.memocious_media_claim(sid uuid, job_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare j memocious_private.product_media_jobs;
begin perform memocious_private.assert_admin(sid);select * into j from memocious_private.product_media_jobs where id=job_id for update;
 if not found or j.session_id<>sid or j.status<>'issued' or j.expires_at<=now() or not exists(select 1 from memocious.products where id=j.product_id and deleted_at is null) then raise exception 'Upload unavailable' using errcode='42501';end if;
 update memocious_private.product_media_jobs set status='processing' where id=j.id;return jsonb_build_object('bytes',j.reserved_bytes);
end $$;
revoke execute on function public.memocious_media_claim(uuid,uuid) from public,anon,authenticated;grant execute on function public.memocious_media_claim(uuid,uuid) to service_role;
