-- Supported Storage bucket configuration; leave storage-owned object rows/schema to the Storage API.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('memocious-quarantine','memocious-quarantine',false,2097152,array['image/jpeg','image/png','image/webp']),
 ('memocious-sanitized','memocious-sanitized',false,2097152,array['image/webp']);
-- Explicit restrictive boundary remains effective even if an unrelated permissive policy is added later.
create policy memocious_private_media_boundary on storage.objects as restrictive for all to anon,authenticated using(bucket_id not in ('memocious-quarantine','memocious-sanitized')) with check(bucket_id not in ('memocious-quarantine','memocious-sanitized'));
