create function public.memocious_media_read(sid uuid, image uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
begin perform memocious_private.assert_admin(sid);return (select jsonb_build_object('path',i.private_path,'published',i.published_at is not null) from memocious.product_images i where i.id=image and i.sanitized_at is not null);end $$;
revoke execute on function public.memocious_media_read(uuid,uuid) from public,anon,authenticated;grant execute on function public.memocious_media_read(uuid,uuid) to service_role;
