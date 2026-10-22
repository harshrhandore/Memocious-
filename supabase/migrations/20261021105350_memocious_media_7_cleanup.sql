alter table memocious_private.product_media_jobs add column quarantine_cleaned boolean not null default false;
create function public.memocious_media_cleanup(job_id uuid default null, quarantine_only boolean default false) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if job_id is not null then
 update memocious_private.product_media_jobs j set quarantine_cleaned=true,status=case when quarantine_only then j.status else 'deleted' end where j.id=job_id and (quarantine_only or not exists(select 1 from memocious.product_images i where i.id=j.image_id));return '{}'::jsonb;
 end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'quarantineOnly',exists(select 1 from memocious.product_images i where i.id=j.image_id))),'[]') from (select * from memocious_private.product_media_jobs where created_at<now()-interval '24 hours' and status<>'deleted' and (not quarantine_cleaned or not exists(select 1 from memocious.product_images i where i.id=product_media_jobs.image_id)) order by created_at limit 100) j);
end $$;
revoke execute on function public.memocious_media_cleanup(uuid,boolean) from public,anon,authenticated;grant execute on function public.memocious_media_cleanup(uuid,boolean) to service_role;
