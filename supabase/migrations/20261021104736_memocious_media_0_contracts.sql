-- Product-media jobs are separate from future customer uploads and cannot cross an owner/parent boundary.
create table memocious_private.product_media_jobs(
 id uuid primary key default gen_random_uuid(),product_id uuid references memocious.products(id) on delete set null,session_id uuid not null references memocious_private.app_sessions(id),user_id uuid not null references auth.users(id),created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '1 hour',reserved_bytes int not null check(reserved_bytes between 1 and 2097152),status text not null default 'issued' check(status in ('issued','processing','ready','attached','rejected','deleting','deleted')),width int,height int,output_bytes int,content_hash text,alt text not null check(char_length(alt) between 1 and 300),image_id uuid references memocious.product_images(id) on delete set null,check(width is null or width::bigint*height<=20000000));
alter table memocious_private.product_media_jobs enable row level security;
revoke all on memocious_private.product_media_jobs from public,anon,authenticated;
grant select,insert,update,delete on memocious_private.product_media_jobs to service_role;
create index media_quota_idx on memocious_private.product_media_jobs(user_id,created_at);
