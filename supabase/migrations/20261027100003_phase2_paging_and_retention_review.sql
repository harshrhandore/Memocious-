-- Add bounded, navigable queues. Preserve default calls and existing ownership assertions.

drop function public.memocious_admin_reviews(uuid,uuid,int,text,text,uuid);

create function public.memocious_admin_reviews(sid uuid,review_id uuid default null,expected_version int default null,action text default 'list',note text default '',report_id uuid default null, page_num int default 1) returns jsonb language plpgsql security invoker set search_path='' as $$
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
 return jsonb_build_object('page',page_num,'hasMore',greatest((select count(*) from memocious.reviews),(select count(*) from memocious.review_reports))>page_num*100,'reviews',coalesce((select jsonb_agg(to_jsonb(x)) from (select q.id,p.name,q.rating,q.body,q.display_first_name as "firstName",q.status,q.version,q.photo_id as photo,q.deleted_at is not null as deleted from memocious.reviews q join memocious.products p on p.id=q.product_id order by q.updated_at desc limit 100 offset (page_num-1)*100) x),'[]'),
 'reports',coalesce((select jsonb_agg(to_jsonb(x)) from (select q.id,q.review_id as "reviewId",q.reason,q.status from memocious.review_reports q order by q.created_at desc limit 100 offset (page_num-1)*100) x),'[]'));
end $$;

revoke execute on function public.memocious_admin_reviews(uuid,uuid,int,text,text,uuid,int) from public,anon,authenticated;
grant execute on function public.memocious_admin_reviews(uuid,uuid,int,text,text,uuid,int) to service_role;

drop function public.memocious_admin_inquiries(uuid,uuid,int,text,jsonb);

create function public.memocious_admin_inquiries(sid uuid,entity uuid default null,expected_version int default null,action text default 'list',fields jsonb default '{}', page_num int default 1) returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor uuid;e memocious.enterprise_inquiries;ev uuid;oid uuid;item jsonb;next_state text;old_event memocious.phase2_events;
begin
 if page_num is null or page_num not between 1 and 10000 then raise exception 'Invalid page' using errcode='22023';end if;
 actor:=memocious_private.assert_admin(sid,true,action<>'list');
 if action='contact-reviewed' then update memocious.contact_messages set status='reviewed' where id=entity;
 elsif action='privacy-reviewing' then update memocious.privacy_requests set status='reviewing',updated_at=now() where id=entity and status='pending';
 elsif action<>'list' then
  select * into e from memocious.enterprise_inquiries where id=entity for update;
  if not found then raise exception 'Unavailable' using errcode='22023';end if;
  if action='convert' and e.linked_order_id is not null then return jsonb_build_object('orderId',e.linked_order_id);end if;
  if e.version<>expected_version then raise exception 'Changed' using errcode='40001';end if;
  if action='convert' then
   if e.pipeline<>'won' or e.quote_paise is null then raise exception 'Agreement required' using errcode='22023';end if;
   insert into memocious.orders(code,user_id,actor_session_id,source,contact_name,phone,pincode,estimate_paise,confirmed_total_paise,requested_date) values(e.code,e.user_id,e.actor_session_id,'enterprise',e.contact_name,e.phone,e.pincode,e.quote_paise,e.quote_paise,e.deadline) returning id into oid;
   for item in select * from jsonb_array_elements(e.items) loop
    insert into memocious.order_items(order_id,product_id,product_name,unit_price_paise,quantity,immutable_snapshot) values(oid,(select id from memocious.products where id=(item->>'product')::uuid),item->>'name',(item->>'unitPricePaise')::bigint,(item->>'quantity')::int,item);
   end loop;
   insert into memocious.order_events(order_id,actor_session_id,to_status,order_version,request_id,internal_note) values(oid,sid,'inquiry',1,gen_random_uuid(),'Converted from owner-confirmed enterprise agreement; no payment inferred.');
   update memocious.enterprise_inquiries set linked_order_id=oid,version=version+1,updated_at=now() where id=e.id;
  elsif action='update' then
   next_state:=fields->>'pipeline';
   if exists(select 1 from jsonb_object_keys(fields) k where k not in ('pipeline','reason','quotePaise','terms','agreement')) or coalesce(char_length(fields->>'reason'),0) not between 1 and 2000 or char_length(coalesce(fields->>'terms',''))>4000 then raise exception 'Reason required' using errcode='22023';end if;
   if next_state not in ('new','contacted','quote_sent','negotiation','won','lost') or not (
    next_state=e.pipeline or (e.pipeline='new' and next_state in ('contacted','lost')) or (e.pipeline='contacted' and next_state in ('quote_sent','lost')) or (e.pipeline='quote_sent' and next_state in ('negotiation','won','lost')) or (e.pipeline='negotiation' and next_state in ('quote_sent','won','lost')) or (e.pipeline in ('won','lost') and next_state='contacted' and e.linked_order_id is null)) then raise exception 'Invalid pipeline transition' using errcode='22023';end if;
   if next_state in ('quote_sent','won') and (fields->>'quotePaise')::bigint is null then raise exception 'Quote required' using errcode='22023';end if;
   if next_state='won' and fields->>'agreement' is distinct from 'true' then raise exception 'Actual agreement required' using errcode='22023';end if;
   if (fields->>'quotePaise')::bigint not between 0 and 1000000000000 then raise exception 'Invalid quote' using errcode='22023';end if;
   update memocious.enterprise_inquiries set pipeline=next_state,quote_paise=(fields->>'quotePaise')::bigint,version=version+1,updated_at=now() where id=e.id;
  else raise exception 'Invalid action' using errcode='22023';end if;
  insert into memocious.phase2_events(entity_id,kind,actor_session_id,version,payload) values(e.id,'enterprise-'||action,sid,e.version+1,fields) returning id into ev;
  insert into memocious.phase2_outbox(event_id) values(ev);
 end if;
 if action<>'list' then insert into memocious.audit_log(actor_session_id,actor_kind,action,entity,entity_id,request_id) values(sid,'admin',action,'inquiry',entity,gen_random_uuid());end if;
 return jsonb_build_object('page',page_num,'hasMore',greatest((select count(*) from memocious.enterprise_inquiries),(select count(*) from memocious.contact_messages),(select count(*) from memocious.privacy_requests))>page_num*100,'enterprise',coalesce((select jsonb_agg(to_jsonb(x)||jsonb_build_object('assets',(select coalesce(jsonb_agg(a.id),'[]') from memocious.phase2_assets a where a.kind='enterprise' and a.parent_id=x.id and a.status='ready'))) from(select * from memocious.enterprise_inquiries order by updated_at desc limit 100 offset (page_num-1)*100)x),'[]'),
 'contacts',coalesce((select jsonb_agg(to_jsonb(x)) from(select id,name,email,body,status,created_at from memocious.contact_messages order by created_at desc limit 100 offset (page_num-1)*100)x),'[]'),
 'privacy',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',p.full_name,'status',r.status,'createdAt',r.created_at)) from (select * from memocious.privacy_requests order by created_at desc limit 100 offset (page_num-1)*100) r join memocious.profiles p on p.user_id=r.user_id),'[]'),
 'newCount',(select count(*) from memocious.enterprise_inquiries where pipeline='new'),
 'events',coalesce((select jsonb_agg(to_jsonb(x)) from(select entity_id,kind,version,payload,created_at from memocious.phase2_events order by created_at desc limit 200 offset (page_num-1)*200)x),'[]'));
end $$;

revoke execute on function public.memocious_admin_inquiries(uuid,uuid,int,text,jsonb,int) from public,anon,authenticated;
grant execute on function public.memocious_admin_inquiries(uuid,uuid,int,text,jsonb,int) to service_role;

drop function public.memocious_admin_proof(uuid,text,uuid,int,jsonb);

create function public.memocious_admin_proof(sid uuid,action text default 'list',entity uuid default null,expected_version int default null,fields jsonb default '{}', page_num int default 1) returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor uuid;p memocious.sales_proof_items;c memocious.proof_counters;doc memocious.catalogue_documents;did uuid;line jsonb;
begin
 if page_num is null or page_num not between 1 and 10000 then raise exception 'Invalid page' using errcode='22023';end if;
 actor:=memocious_private.assert_admin(sid,true,action<>'list');
 if action in ('proof-save','proof-delete') then
  if entity is not null then select * into p from memocious.sales_proof_items where id=entity for update;if not found or p.version<>expected_version then raise exception 'Changed' using errcode='40001';end if;end if;
  if action='proof-delete' then update memocious.sales_proof_items set active=false,version=version+1 where id=entity;
  else
   if exists(select 1 from jsonb_object_keys(fields) k where k not in ('caption','firstName','city','consentReference','active','position')) or coalesce(char_length(fields->>'caption'),0) not between 1 and 500 or coalesce(char_length(fields->>'consentReference'),0) not between 1 and 500 or char_length(coalesce(fields->>'firstName',''))>60 or char_length(coalesce(fields->>'city',''))>120 then raise exception 'Invalid proof' using errcode='22023';end if;
   if fields->>'active'='true' and not exists(select 1 from memocious.phase2_assets a where a.id=p.asset_id and a.kind='proof' and a.status='ready' and a.consent_at is not null and a.public_copy is not null and a.public_ready) then raise exception 'Preview and publish sanitized photo first' using errcode='22023';end if;
   if entity is null then insert into memocious.sales_proof_items(public_path,caption,first_name,city,consent_reference,sort_order) values('',fields->>'caption',fields->>'firstName',fields->>'city',fields->>'consentReference',coalesce((fields->>'position')::int,0)) returning id into did;
   else update memocious.sales_proof_items set caption=fields->>'caption',first_name=fields->>'firstName',city=fields->>'city',consent_reference=fields->>'consentReference',active=coalesce((fields->>'active')::boolean,false),sort_order=coalesce((fields->>'position')::int,0),version=version+1,updated_at=now() where id=entity;end if;
  end if;
 elsif action='counter-save' then
  if entity is not null then select * into c from memocious.proof_counters where id=entity for update;if not found or c.version<>expected_version then raise exception 'Changed' using errcode='40001';end if;end if;
  if exists(select 1 from jsonb_object_keys(fields) k where k not in ('label','value','evidenceReference','active')) or coalesce(char_length(fields->>'evidenceReference'),0) not between 1 and 500 or (fields->>'value')::bigint is null then raise exception 'Evidence required' using errcode='22023';end if;
  if entity is null then insert into memocious.proof_counters(label,value,evidence_reference,active) values(fields->>'label',(fields->>'value')::bigint,fields->>'evidenceReference',coalesce((fields->>'active')::boolean,false));
  else update memocious.proof_counters set label=fields->>'label',value=(fields->>'value')::bigint,evidence_reference=fields->>'evidenceReference',active=coalesce((fields->>'active')::boolean,false),version=version+1 where id=entity;end if;
 elsif action='catalogue-create' then
  -- Immutable, owner-previewed safe text snapshot; no remote URL or uploaded PDF accepted.
  insert into memocious.catalogue_documents(title,lines)
  select 'Memocious enterprise catalogue',coalesce(jsonb_agg(jsonb_build_object('name',q.name,'description',q.description,'moq',q.moq,'leadDays',q.lead_days,'pricePaise',q.price_paise) order by q.name),'[]') from (select q.* from memocious.products q join public.memocious_catalogue_products cp on cp.id=q.id where q.enterprise order by q.name limit 100 offset (page_num-1)*100)q returning id into did;
 elsif action in ('catalogue-publish','catalogue-hide') then
  select * into doc from memocious.catalogue_documents where id=entity for update;
  if not found or doc.version<>expected_version then raise exception 'Changed' using errcode='40001';end if;
  if action='catalogue-publish' and jsonb_array_length(doc.lines)=0 then raise exception 'No enterprise products' using errcode='22023';end if;
  update memocious.catalogue_documents set published=false where published=true;
  update memocious.catalogue_documents set published=action='catalogue-publish',version=version+1 where id=entity;
 elsif action<>'list' then raise exception 'Invalid action' using errcode='22023';end if;
 if action<>'list' then insert into memocious.audit_log(actor_session_id,actor_kind,action,entity,entity_id,request_id) values(sid,'admin',action,'proof',coalesce(entity,did),gen_random_uuid());end if;
 return jsonb_build_object('page',page_num,'hasMore',greatest((select count(*) from memocious.sales_proof_items),(select count(*) from memocious.proof_counters),(select count(*)*5 from memocious.catalogue_documents))>page_num*100,'proof',coalesce((select jsonb_agg(to_jsonb(q)) from (select * from memocious.sales_proof_items order by sort_order,id limit 100 offset (page_num-1)*100) q),'[]'),
 'counters',coalesce((select jsonb_agg(to_jsonb(q)) from (select * from memocious.proof_counters order by label,id limit 100 offset (page_num-1)*100) q),'[]'),
 'documents',coalesce((select jsonb_agg(to_jsonb(x)) from(select id,title,created_at,version,published from memocious.catalogue_documents order by created_at desc limit 20 offset (page_num-1)*20)x),'[]'));
end $$;

revoke execute on function public.memocious_admin_proof(uuid,text,uuid,int,jsonb,int) from public,anon,authenticated;
grant execute on function public.memocious_admin_proof(uuid,text,uuid,int,jsonb,int) to service_role;


create function public.memocious_my_review(sid uuid,product uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;
begin
 s:=memocious_private.assert_session(sid,'customer');
 return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'product',r.product_id,'rating',r.rating,'body',r.body,'firstName',r.display_first_name,'status',r.status,'deleted',r.deleted_at is not null,'version',r.version,'photo',r.photo_id)) from memocious.reviews r where r.user_id=s.user_id and r.product_id=product),'[]');
end $$;
revoke execute on function public.memocious_my_review(uuid,uuid) from public,anon,authenticated;
grant execute on function public.memocious_my_review(uuid,uuid) to service_role;
