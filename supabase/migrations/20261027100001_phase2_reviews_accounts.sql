-- Phase 2: deny-by-default base tables; only narrow public projections.
alter table memocious.reviews add column public_key text not null default replace(gen_random_uuid()::text,'-','') unique;
alter table memocious.reviews add constraint first_name_bound check(char_length(display_first_name) between 1 and 60);
create index reviews_product_moderation on memocious.reviews(product_id,status) where deleted_at is null;
create table public.memocious_approved_reviews (
 public_key text primary key, product_slug text not null, first_name text not null,
 rating int not null check(rating between 0 and 5), body text not null, review_date date not null,
 photo_path text
);
alter table public.memocious_approved_reviews enable row level security;
revoke all on public.memocious_approved_reviews from public,anon,authenticated;
grant select on public.memocious_approved_reviews to anon,authenticated;
grant all on public.memocious_approved_reviews to service_role;
create policy published_read on public.memocious_approved_reviews for select to anon,authenticated using(true);

-- Serialize publication/aggregate writers before modifying rows, including concurrent
-- owner/customer sessions. This complements optimistic versions and unique keys.
create function memocious_private.lock_review_publication() returns trigger language plpgsql set search_path='' as $$
begin perform pg_advisory_xact_lock(814262710001::bigint);return null;end $$;
create trigger reviews_write_lock before insert or update or delete on memocious.reviews for each statement execute function memocious_private.lock_review_publication();
create trigger catalogue_write_lock before insert or update or delete on public.memocious_catalogue_products for each statement execute function memocious_private.lock_review_publication();
create function memocious_private.refresh_reviews() returns trigger language plpgsql set search_path='' as $$
begin
 delete from public.memocious_approved_reviews where public_key is not null;
 insert into public.memocious_approved_reviews
 select r.public_key,p.slug,r.display_first_name,r.rating,r.body,r.updated_at::date,(select '/community-media/'||a.id from memocious.phase2_assets a where a.id=r.photo_id and a.status='ready' and a.public_copy is not null and a.public_ready and a.consent_at is not null)
 from memocious.reviews r join public.memocious_catalogue_products p on p.id=r.product_id
 where r.status='approved' and r.deleted_at is null;
 update public.memocious_catalogue_products p set
 avg_rating=a.average,review_count=a.n,
 data=jsonb_set(jsonb_set(p.data,'{avgRating}',coalesce(to_jsonb(a.average),'null'::jsonb)),'{reviewCount}',to_jsonb(a.n))
 from (select cp.id,avg(r.rating) average,count(r.id)::int n from public.memocious_catalogue_products cp
 left join memocious.reviews r on r.product_id=cp.id and r.status='approved' and r.deleted_at is null group by cp.id) a where p.id=a.id;
 return null;
end $$;
-- Publication refresh inserts reset ratings; an AFTER INSERT statement trigger rebuilds them.
create trigger reviews_projection after insert or update or delete on memocious.reviews for each statement execute function memocious_private.refresh_reviews();
create trigger catalogue_reviews_projection after insert on public.memocious_catalogue_products for each statement execute function memocious_private.refresh_reviews();
create trigger catalogue_reviews_hidden after delete on public.memocious_catalogue_products for each statement execute function memocious_private.refresh_reviews();

create function public.memocious_reviews(product_slug text default null,page_num int default 1) returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from
 (select public_key as key,product_slug as slug,first_name as "firstName",rating,body,review_date as date,photo_path as photo
 from public.memocious_approved_reviews where ($1 is null or product_slug=$1) order by review_date desc,public_key limit 20 offset (least(greatest($2,1),10000)-1)*20) r),
 'count',(select count(*) from public.memocious_approved_reviews where ($1 is null or product_slug=$1)),
 'average',(select avg(rating) from public.memocious_approved_reviews where ($1 is null or product_slug=$1)),
 'distribution',(select jsonb_object_agg(n,(select count(*) from public.memocious_approved_reviews where rating=n and ($1 is null or product_slug=$1))) from generate_series(0,5) n));
$$;
create function public.memocious_my_reviews(sid uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;
begin
 s:=memocious_private.assert_session(sid,'customer');
 return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'product',r.product_id,'slug',p.slug,'name',p.name,'rating',r.rating,'body',r.body,'firstName',r.display_first_name,'status',r.status,'deleted',r.deleted_at is not null,'version',r.version,'photo',r.photo_id) order by r.updated_at desc)
 from (select * from memocious.reviews where user_id=s.user_id order by updated_at desc limit 200) r join memocious.products p on p.id=r.product_id),'[]');
end $$;
create function public.memocious_review(sid uuid,product uuid,expected_version int,action text,stars int default null,review_text text default '',first_name text default '') returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;r memocious.reviews;
begin
 s:=memocious_private.assert_session(sid,'customer',true);
 perform pg_advisory_xact_lock(814262710001::bigint);
 perform pg_advisory_xact_lock(hashtextextended('review:'||s.user_id::text||product::text,0));
 select * into r from memocious.reviews where user_id=s.user_id and product_id=product for update;
 if coalesce(r.version,0)<>expected_version then raise exception 'Review changed' using errcode='40001';end if;
 if action='save' then
  if not exists(select 1 from public.memocious_catalogue_products where id=product) or stars is null or stars not between 0 and 5 or char_length(btrim(review_text)) not between 1 and 2000 or char_length(btrim(first_name)) not between 1 and 60 or first_name ~ '[[:space:]]' then raise exception 'Invalid review' using errcode='22023';end if;
  if r.id is null then
   insert into memocious.reviews(user_id,product_id,rating,body,display_first_name) values(s.user_id,product,stars,btrim(review_text),btrim(first_name)) returning * into r;
  else
   update memocious.reviews set rating=stars,body=btrim(review_text),display_first_name=btrim(first_name),status='pending',deleted_at=null,moderated_by=null,moderated_at=null,moderation_note=null,version=version+1,updated_at=now() where id=r.id returning * into r;
  end if;
 elsif action='delete' and r.id is not null then
  update memocious.reviews set deleted_at=now(),status='pending',version=version+1,updated_at=now() where id=r.id returning * into r;
 else raise exception 'Invalid action' using errcode='22023';end if;
 return jsonb_build_object('id',r.id,'version',r.version,'status',r.status);
end $$;
create function public.memocious_review_report(sid uuid,review_key text,report_reason text) returns void language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;rid uuid;
begin
 s:=memocious_private.assert_session(sid,'customer',true);
 if char_length(btrim(report_reason)) not between 1 and 2000 then raise exception 'Invalid report' using errcode='22023';end if;
 select r.id into rid from memocious.reviews r join public.memocious_approved_reviews p on p.public_key=r.public_key where r.public_key=review_key;
 if rid is null then raise exception 'Review unavailable' using errcode='22023';end if;
 insert into memocious.review_reports(review_id,user_id,reason) values(rid,s.user_id,btrim(report_reason)) on conflict(review_id,user_id) do nothing;
end $$;
create function public.memocious_admin_reviews(sid uuid,review_id uuid default null,expected_version int default null,action text default 'list',note text default '',report_id uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor uuid;r memocious.reviews;
begin
 actor:=memocious_private.assert_admin(sid,true,action<>'list');
 if action<>'list' then perform pg_advisory_xact_lock(814262710001::bigint);end if;
 if action='report-reviewed' then
  update memocious.review_reports set status='reviewed',moderator_id=actor,updated_at=now() where id=report_id;
 elsif action<>'list' then
  select * into r from memocious.reviews where id=review_id for update;
  if not found or r.version<>expected_version then raise exception 'Review changed' using errcode='40001';end if;
  if action not in ('approve','reject','delete') or char_length(note)>2000 or (action='approve' and r.user_id=actor) then raise exception 'Invalid moderation' using errcode='42501';end if;
  if action='approve' and r.photo_id is not null and not exists(select 1 from memocious.phase2_assets a where a.id=r.photo_id and a.status='ready' and a.public_copy is not null and a.public_ready and a.consent_at is not null) then raise exception 'Prepare consented sanitized copy first' using errcode='22023';end if;
  update memocious.reviews set status=case when action='approve' then 'approved' else 'rejected' end,deleted_at=case when action='delete' then now() else deleted_at end,moderated_by=actor,moderation_note=note,moderated_at=now(),version=version+1 where id=review_id;
 end if;
 if action<>'list' then insert into memocious.audit_log(actor_session_id,actor_kind,action,entity,entity_id,request_id) values(sid,'admin','review-'||action,'review',coalesce(review_id,report_id),gen_random_uuid());end if;
 return jsonb_build_object('reviews',coalesce((select jsonb_agg(to_jsonb(x)) from (select q.id,p.name,q.rating,q.body,q.display_first_name as "firstName",q.status,q.version,q.photo_id as photo,q.deleted_at is not null as deleted from memocious.reviews q join memocious.products p on p.id=q.product_id order by q.updated_at desc limit 100) x),'[]'),
 'reports',coalesce((select jsonb_agg(to_jsonb(x)) from (select q.id,q.review_id as "reviewId",q.reason,q.status from memocious.review_reports q order by q.created_at desc limit 100) x),'[]'));
end $$;

alter table memocious.addresses add column version int not null default 1;
create table memocious.privacy_requests(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),kind text not null check(kind='delete'),status text not null default 'pending' check(status in ('pending','reviewing','completed')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,kind));
alter table memocious.privacy_requests enable row level security;
revoke all on memocious.privacy_requests from public,anon,authenticated;
grant select,insert,update on memocious.privacy_requests to service_role;
create function public.memocious_addresses(sid uuid,action text default 'list',address_id uuid default null,expected_version int default null,fields jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;a memocious.addresses;
begin
 s:=memocious_private.assert_session(sid,'customer',action<>'list');
 perform pg_advisory_xact_lock(hashtextextended('address:'||s.user_id::text,0));
 if action<>'list' then
  if address_id is not null then
   select * into a from memocious.addresses where id=address_id and user_id=s.user_id for update;
   if not found then raise exception 'Unavailable' using errcode='42501';end if;
   if a.version<>expected_version then raise exception 'Changed' using errcode='40001';end if;
  end if;
  if action='delete' and a.id is not null then delete from memocious.addresses where id=a.id;
  elsif action='save' then
   if exists(select 1 from jsonb_object_keys(fields) k where k not in ('label','fullName','lines','city','state','pincode','phone')) or
    coalesce(char_length(fields->>'label'),0) not between 1 and 60 or coalesce(char_length(fields->>'fullName'),0) not between 1 and 120 or coalesce(char_length(fields->>'lines'),0) not between 1 and 500 or coalesce(char_length(fields->>'city'),0) not between 1 and 120 or coalesce(char_length(fields->>'state'),0) not between 1 and 120 or coalesce(fields->>'pincode','')!~'^[0-9]{6}$' or coalesce(fields->>'phone','')!~'^[1-9][0-9]{6,14}$' then raise exception 'Invalid address' using errcode='22023';end if;
   if a.id is null then
    if (select count(*) from memocious.addresses where user_id=s.user_id)>=20 then raise exception 'Address limit' using errcode='22023';end if;
    insert into memocious.addresses(user_id,label,full_name,address_lines,city,state,pincode,phone) values(s.user_id,fields->>'label',fields->>'fullName',fields->>'lines',fields->>'city',fields->>'state',fields->>'pincode',fields->>'phone');
   else update memocious.addresses set label=fields->>'label',full_name=fields->>'fullName',address_lines=fields->>'lines',city=fields->>'city',state=fields->>'state',pincode=fields->>'pincode',phone=fields->>'phone',version=version+1,updated_at=now() where id=a.id;end if;
  else raise exception 'Invalid action' using errcode='22023';end if;
 end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'label',label,'fullName',full_name,'lines',address_lines,'city',city,'state',state,'pincode',pincode,'phone',phone,'version',version) order by created_at,id) from memocious.addresses where user_id=s.user_id),'[]');
end $$;
create function public.memocious_privacy(sid uuid,action text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;
begin
 s:=memocious_private.assert_session(sid,'customer',true);
 if action='delete-request' then
  insert into memocious.privacy_requests(user_id,kind) values(s.user_id,'delete') on conflict(user_id,kind) do nothing;
  return jsonb_build_object('status','pending','message','Deletion requested. The owner will review legal retention before erasure; your account has not yet been deleted.');
 elsif action='export' then
  return jsonb_build_object('profile',(select jsonb_build_object('fullName',full_name,'phone',phone) from memocious.profiles where user_id=s.user_id),
  'addresses',public.memocious_addresses(sid),'wishlist',public.memocious_wishlist(sid),'reviews',public.memocious_my_reviews(sid),
  'enquiries',coalesce((select jsonb_agg(jsonb_build_object('code',code,'createdAt',created_at,'status',status,'contactName',contact_name,'phone',phone,'address',address)) from memocious.orders where user_id=s.user_id),'[]'),
  'enterprise',coalesce((select jsonb_agg(jsonb_build_object('code',code,'organization',organization,'contactName',contact_name,'phone',phone,'email',email,'items',items,'branding',branding,'notes',notes,'pipeline',pipeline)) from memocious.enterprise_inquiries where user_id=s.user_id),'[]'),
  'consents',coalesce((select jsonb_agg(jsonb_build_object('purpose',purpose,'policyVersion',policy_version,'createdAt',created_at)) from memocious.consent_records where user_id=s.user_id),'[]'),
  'deletion',coalesce((select jsonb_agg(jsonb_build_object('status',status,'requestedAt',created_at)) from memocious.privacy_requests where user_id=s.user_id),'[]'));
 end if;
 raise exception 'Invalid action' using errcode='22023';
end $$;
-- All new adapters are BFF-only; no direct browser token can execute them.
do $$ declare r record;begin
 for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='public' and p.proname in ('memocious_reviews','memocious_my_reviews','memocious_review','memocious_review_report','memocious_admin_reviews','memocious_addresses','memocious_privacy')) or (n.nspname='memocious_private' and p.proname in ('refresh_reviews','lock_review_publication')) loop
 execute format('revoke execute on function %s from public,anon,authenticated',r.signature);execute format('grant execute on function %s to service_role',r.signature);
 end loop;
end $$;
grant execute on function public.memocious_reviews(text,int) to anon,authenticated;
