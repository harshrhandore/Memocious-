-- Permanent catalogue deletion retains review ownership/history without blocking
-- Phase 1 delete-any/all. Public projection still requires a current published gift.
alter table memocious.reviews add column source_product_id uuid;
alter table memocious.reviews add column product_name_snapshot text;
alter table memocious.reviews add column product_slug_snapshot text;
update memocious.reviews r set source_product_id=r.product_id,product_name_snapshot=p.name,product_slug_snapshot=p.slug from memocious.products p where p.id=r.product_id;
alter table memocious.reviews alter column source_product_id set not null;
alter table memocious.reviews alter column product_id drop not null;
alter table memocious.reviews drop constraint reviews_product_id_fkey;
alter table memocious.reviews add constraint reviews_product_id_fkey foreign key(product_id) references memocious.products(id) on delete set null;
alter table memocious.reviews add constraint reviews_source_unique unique(user_id,source_product_id);
create function memocious_private.review_identity() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='INSERT' then
  new.source_product_id:=new.product_id;
  select name,slug into new.product_name_snapshot,new.product_slug_snapshot from memocious.products where id=new.product_id;
 elsif new.user_id is distinct from old.user_id or new.source_product_id is distinct from old.source_product_id or (new.product_id is not null and new.product_id is distinct from old.product_id) then
  raise exception 'Review identity is immutable' using errcode='42501';
 end if;
 return new;
end $$;
revoke execute on function memocious_private.review_identity() from public,anon,authenticated;
grant execute on function memocious_private.review_identity() to service_role;
create trigger review_identity before insert or update on memocious.reviews for each row execute function memocious_private.review_identity();
create or replace function public.memocious_review(sid uuid,product uuid,expected_version int,action text,stars int default null,review_text text default '',first_name text default '') returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;r memocious.reviews;
begin
 s:=memocious_private.assert_session(sid,'customer',true);
 perform pg_advisory_xact_lock(814262710001::bigint);
 perform pg_advisory_xact_lock(hashtextextended('review:'||s.user_id::text||product::text,0));
 select * into r from memocious.reviews where user_id=s.user_id and source_product_id=product for update;
 if coalesce(r.version,0)<>expected_version then raise exception 'Review changed' using errcode='40001';end if;
 if action='save' then
  if not exists(select 1 from public.memocious_catalogue_products where id=product) or stars is null or stars not between 0 and 5 or char_length(btrim(review_text)) not between 1 and 2000 or char_length(btrim(first_name)) not between 1 and 60 or first_name ~ '[[:space:]]' then raise exception 'Invalid review' using errcode='22023';end if;
  if r.id is null then
   insert into memocious.reviews(user_id,product_id,rating,body,display_first_name) values(s.user_id,product,stars,btrim(review_text),btrim(first_name)) returning * into r;
  else
   update memocious.reviews set rating=stars,body=btrim(review_text),display_first_name=btrim(first_name),status='pending',deleted_at=null,moderated_by=null,moderated_at=null,moderation_note=null,version=version+1,updated_at=now() where id=r.id returning * into r;
  end if;
 elsif action='remove-photo' and r.id is not null then
  update memocious.reviews set photo_id=null,status='pending',version=version+1,updated_at=now() where id=r.id returning * into r;
 elsif action='delete' and r.id is not null then
  update memocious.reviews set deleted_at=now(),status='pending',version=version+1,updated_at=now() where id=r.id returning * into r;
 else raise exception 'Invalid action' using errcode='22023';end if;
 return jsonb_build_object('id',r.id,'version',r.version,'status',r.status);
end $$;
create or replace function public.memocious_my_reviews(sid uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;
begin
 s:=memocious_private.assert_session(sid,'customer');
 return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'product',r.source_product_id,'slug',coalesce(p.slug,r.product_slug_snapshot),'name',coalesce(p.name,r.product_name_snapshot),'rating',r.rating,'body',r.body,'firstName',r.display_first_name,'status',r.status,'deleted',r.deleted_at is not null,'version',r.version,'photo',r.photo_id) order by r.updated_at desc)
 from (select * from memocious.reviews where user_id=s.user_id order by updated_at desc limit 200) r left join memocious.products p on p.id=r.product_id),'[]');
end $$;
create or replace function public.memocious_my_review(sid uuid,product uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;
begin
 s:=memocious_private.assert_session(sid,'customer');
 return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'product',r.source_product_id,'rating',r.rating,'body',r.body,'firstName',r.display_first_name,'status',r.status,'deleted',r.deleted_at is not null,'version',r.version,'photo',r.photo_id)) from memocious.reviews r where r.user_id=s.user_id and r.source_product_id=product),'[]');
end $$;
create or replace function public.memocious_admin_reviews(sid uuid,review_id uuid default null,expected_version int default null,action text default 'list',note text default '',report_id uuid default null, page_num int default 1) returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor uuid;r memocious.reviews;
begin
 if page_num is null or page_num not between 1 and 10000 then raise exception 'Invalid page' using errcode='22023';end if;
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
 return jsonb_build_object('page',page_num,'hasMore',greatest((select count(*) from memocious.reviews),(select count(*) from memocious.review_reports))>page_num*100,'reviews',coalesce((select jsonb_agg(to_jsonb(x)) from (select q.id,coalesce(p.name,q.product_name_snapshot) as name,q.rating,q.body,q.display_first_name as "firstName",q.status,q.version,q.photo_id as photo,q.deleted_at is not null as deleted from memocious.reviews q left join memocious.products p on p.id=q.product_id order by q.updated_at desc limit 100 offset (page_num-1)*100) x),'[]'),
 'reports',coalesce((select jsonb_agg(to_jsonb(x)) from (select q.id,q.review_id as "reviewId",q.reason,q.status from memocious.review_reports q order by q.created_at desc limit 100 offset (page_num-1)*100) x),'[]'));
end $$;
create or replace function public.memocious_privacy(sid uuid,action text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;
begin
 s:=memocious_private.assert_session(sid,'customer',true);
 if s.created_at<now()-interval '10 minutes' then raise exception 'Sign in again before export or deletion' using errcode='28000';end if;
 if action='delete-request' then
  insert into memocious.privacy_requests(user_id,kind) values(s.user_id,'delete') on conflict(user_id,kind) do nothing;
  return jsonb_build_object('status','pending','message','Deletion requested. The owner will review legal retention before erasure; your account has not yet been deleted.');
 elsif action='export' then
  return jsonb_build_object('profile',(select jsonb_build_object('fullName',full_name,'phone',phone) from memocious.profiles where user_id=s.user_id),
  'addresses',public.memocious_addresses(sid),'wishlist',coalesce((select jsonb_agg(jsonb_build_object('product',product_id,'createdAt',created_at)) from memocious.wishlist_items where user_id=s.user_id),'[]'),'reviews',coalesce((select jsonb_agg(jsonb_build_object('product',source_product_id,'name',product_name_snapshot,'rating',rating,'body',body,'firstName',display_first_name,'status',status,'deletedAt',deleted_at)) from memocious.reviews where user_id=s.user_id),'[]'),
  'contacts',coalesce((select jsonb_agg(jsonb_build_object('name',name,'email',email,'message',body,'createdAt',created_at)) from memocious.contact_messages where user_id=s.user_id),'[]'),
  'media',coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'status',status,'createdAt',created_at,'download',case when status='ready' then '/api/uploads/'||id end)) from memocious.phase2_assets where user_id=s.user_id),'[]'),
  'enquiries',coalesce((select jsonb_agg(jsonb_build_object('code',code,'createdAt',created_at,'status',status,'contactName',contact_name,'phone',phone,'address',address)) from memocious.orders where user_id=s.user_id),'[]'),
  'enterprise',coalesce((select jsonb_agg(jsonb_build_object('code',code,'organization',organization,'contactName',contact_name,'phone',phone,'email',email,'items',items,'branding',branding,'notes',notes,'pipeline',pipeline)) from memocious.enterprise_inquiries where user_id=s.user_id),'[]'),
  'consents',coalesce((select jsonb_agg(jsonb_build_object('purpose',purpose,'policyVersion',policy_version,'createdAt',created_at)) from memocious.consent_records where user_id=s.user_id),'[]'),
  'deletion',coalesce((select jsonb_agg(jsonb_build_object('status',status,'requestedAt',created_at)) from memocious.privacy_requests where user_id=s.user_id),'[]'));
 end if;
 raise exception 'Invalid action' using errcode='22023';
end $$;