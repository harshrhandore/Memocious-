-- One immutable request snapshot per owned submitted draft; no payment inference.
alter table memocious.custom_requests add column source_session_id uuid references memocious_private.app_sessions(id);
alter table memocious.custom_requests add column request_key uuid;
alter table memocious.custom_requests add column immutable_snapshot jsonb not null default '{}';
alter table memocious.custom_requests add column base_product_id uuid references memocious.products(id) on delete set null;
alter table memocious.custom_requests add column quote_terms text check(char_length(quote_terms)<=4000);
alter table memocious.custom_requests add column quote_valid_until date;
alter table memocious.custom_requests add column agreement_at timestamptz;
alter table memocious.custom_requests add column closed_at timestamptz;
create unique index custom_request_key on memocious.custom_requests(user_id,request_key) where request_key is not null;
create index custom_request_queue on memocious.custom_requests(status,updated_at desc,id);
create index custom_request_customer on memocious.custom_requests(user_id,created_at desc,id);
create function memocious_private.custom_receipt(q memocious.custom_requests) returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('id',q.id,'code',q.code,'name',q.immutable_snapshot->'item'->>'name','slug',q.immutable_snapshot->'item'->>'slug','quantity',q.quantity,'options',q.immutable_snapshot->'options','personalMessage',q.message,'occasion',q.immutable_snapshot->>'occasion','pincode',q.pincode,'budgetMinPaise',q.budget_min_paise,'budgetMaxPaise',q.budget_max_paise,'estimateMinPaise',q.immutable_snapshot->'estimate'->'minPaise','estimateMaxPaise',q.immutable_snapshot->'estimate'->'maxPaise','requestedDate',q.requested_date,'fileCount',coalesce(jsonb_array_length(q.immutable_snapshot->'files'),0),'status',q.status,'version',q.version,'quotePaise',q.quote_paise,'quoteTerms',q.quote_terms,'quoteValidUntil',q.quote_valid_until);
$$;
create function public.memocious_builder_submit(sid uuid,draft uuid,expected_version int,request_key uuid,consent boolean,accept_estimate boolean,replay_only boolean default false) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;d memocious.builder_drafts;q memocious.custom_requests;p memocious.products;estimated jsonb;opts jsonb;files jsonb;month_key text;seq bigint;suffix text;ref text;rid uuid:=gen_random_uuid();ev uuid;occasion_label text;
begin
 s:=memocious_private.assert_session(sid,'customer',not replay_only);
 if not coalesce(consent,false) or not coalesce(accept_estimate,false) or request_key is null then raise exception 'Consent and review required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('builder-owner:'||s.user_id::text,0));
 select * into d from memocious.builder_drafts where id=draft for update;
 if not found or d.user_id is distinct from s.user_id then raise exception 'Unavailable' using errcode='42501';end if;
 if d.submitted_request_id is not null then
  select * into q from memocious.custom_requests where id=d.submitted_request_id and user_id=s.user_id;
  if q.id is null or (q.immutable_snapshot->>'draftVersion')::int is distinct from expected_version then raise exception 'Submitted version differs' using errcode='40001';end if;
  return memocious_private.custom_receipt(q);
 end if;
 if exists(select 1 from memocious.custom_requests c where c.user_id=s.user_id and c.request_key=memocious_builder_submit.request_key and c.draft_id<>draft) then raise exception 'Request key already used' using errcode='40001';end if;
 if replay_only then return null;end if;
 if d.expires_at<=now() or d.version is distinct from expected_version or d.schema_version<>2 or d.current_step<>8 then raise exception 'Save and review the current draft' using errcode='40001';end if;
 if not exists(select 1 from memocious.site_settings where key='policies_approved' and value='true') then raise exception 'Policies unavailable' using errcode='42501';end if;
 if exists(select 1 from memocious.request_uploads u where u.draft_id=d.id and u.status in ('issued','uploaded_quarantine','processing')) then raise exception 'Finish or remove pending uploads' using errcode='40001';end if;
 select * into p from memocious.products where id=(d.payload->>'productId')::uuid for share;
 estimated:=memocious_private.builder_configuration(d.payload,8,(select count(*)::int from memocious.request_uploads u where u.draft_id=d.id and u.user_id=s.user_id and u.status='ready_private'));
 select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'label',o.label||': '||v.label,'kind',o.kind,'deltaPaise',v.delta_paise) order by o.sort_order,v.sort_order,v.id),'[]') into opts from memocious.option_values v join memocious.product_options o on o.id=v.option_id where v.id in(select x::uuid from jsonb_array_elements_text(d.payload->'options')x);
 select coalesce(jsonb_agg(u.id order by u.created_at,u.id),'[]') into files from memocious.request_uploads u where u.draft_id=d.id and u.user_id=s.user_id and u.status='ready_private';
 select label into occasion_label from memocious.occasions where id=(d.payload->>'occasionId')::uuid;
 month_key:=to_char(now() at time zone 'Asia/Kolkata','YYMM');
 insert into memocious.code_counters(prefix,business_month,next_sequence) values('CUS',month_key,2) on conflict(prefix,business_month) do update set next_sequence=memocious.code_counters.next_sequence+1 returning next_sequence-1 into seq;
 select string_agg(substr('0123456789ABCDEFGHJKMNPQRSTVWXYZ',1+get_byte(uuid_send(gen_random_uuid()),0)%32,1),'') into suffix from generate_series(1,12);
 ref:='CUS-'||month_key||'-'||lpad(seq::text,greatest(6,char_length(seq::text)),'0')||'-'||suffix;
 insert into memocious.custom_requests(id,code,user_id,draft_id,budget_min_paise,budget_max_paise,gift_type_id,occasion_id,recipient,message,colours,addons,quantity,requested_date,pincode,contact,source_session_id,request_key,base_product_id,immutable_snapshot)
 values(rid,ref,s.user_id,d.id,(d.payload->>'budgetMinPaise')::bigint,(d.payload->>'budgetMaxPaise')::bigint,(d.payload->>'giftTypeId')::uuid,(d.payload->>'occasionId')::uuid,d.payload->>'recipient',d.payload->>'message',coalesce((select jsonb_agg(x) from jsonb_array_elements(opts)x where x->>'kind'='colour'),'[]'),coalesce((select jsonb_agg(x) from jsonb_array_elements(opts)x where x->>'kind'<>'colour'),'[]'),(d.payload->>'quantity')::int,(d.payload->>'requestedDate')::date,d.payload->'contact'->>'pincode',d.payload->'contact',sid,request_key,p.id,jsonb_build_object('schemaVersion',2,'draftVersion',d.version,'item',jsonb_build_object('id',p.id,'slug',p.slug,'name',p.name,'version',p.version,'pricePaise',p.price_paise,'maxPricePaise',p.max_price_paise),'options',opts,'estimate',estimated,'files',files,'occasion',coalesce(occasion_label,''),'payload',d.payload));
 update memocious.request_uploads set draft_id=null,custom_request_id=rid,status='attached',updated_at=now() where draft_id=d.id and user_id=s.user_id and status='ready_private';
 update memocious.builder_drafts set submitted_request_id=rid,version=version+1,updated_at=now() where id=d.id;
 insert into memocious.consent_records(session_id,user_id,custom_request_id,purpose,policy_version,channel) values(sid,s.user_id,rid,'custom-gift-quote','owner-approved-v1','web');
 insert into memocious.phase2_events(entity_id,kind,actor_session_id,version,payload) values(rid,'custom-created',sid,1,'{}') returning id into ev;
 insert into memocious.phase2_outbox(event_id) values(ev);
 select * into q from memocious.custom_requests where id=rid;
 return memocious_private.custom_receipt(q);
end $$;
create function public.memocious_custom_requests(sid uuid,page_num int default 1) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;
begin
 s:=memocious_private.assert_session(sid,'customer');if page_num not between 1 and 10000 then raise exception 'Invalid page' using errcode='22023';end if;
 return jsonb_build_object('hasMore',(select count(*) from memocious.custom_requests where user_id=s.user_id)>page_num*24,'records',coalesce((select jsonb_agg(memocious_private.custom_receipt(q)||jsonb_build_object('files',(select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'status',u.status)),'[]') from memocious.request_uploads u where u.custom_request_id=q.id and u.user_id=s.user_id and u.status='attached')) order by q.created_at desc,q.id) from(select * from memocious.custom_requests where user_id=s.user_id order by created_at desc,id limit 24 offset (page_num-1)*24)q),'[]'));
end $$;
create function public.memocious_admin_custom(sid uuid,action text default 'list',request_id uuid default null,expected_version int default null,fields jsonb default '{}',page_num int default 1,search_code text default '',status_filter text default '') returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor uuid;q memocious.custom_requests;next_status text;ev uuid;oid uuid;unit_price bigint;item jsonb;
begin
 actor:=memocious_private.assert_admin(sid,true,action<>'list');
 if page_num not between 1 and 10000 or coalesce(search_code,'')!~'^[a-zA-Z0-9-]{0,40}$' or status_filter not in ('','new','contacted','quote_sent','negotiation','won','lost','closed','cancelled') then raise exception 'Invalid query' using errcode='22023';end if;
 if action<>'list' then
  select * into q from memocious.custom_requests where id=request_id for update;
  if not found then raise exception 'Unavailable' using errcode='22023';end if;
  if action='convert' and q.linked_order_id is not null then return jsonb_build_object('orderId',q.linked_order_id);end if;
  if q.version is distinct from expected_version then raise exception 'Request changed' using errcode='40001';end if;
  if action='update' then
   next_status:=fields->>'status';
   if exists(select 1 from jsonb_object_keys(fields)k where k not in ('status','reason','quotePaise','terms','validUntil','agreement')) or coalesce(char_length(btrim(fields->>'reason')),0) not between 1 and 2000 or char_length(coalesce(fields->>'terms',''))>4000 or next_status is null or next_status not in ('new','contacted','quote_sent','negotiation','won','lost','closed','cancelled') then raise exception 'Invalid update' using errcode='22023';end if;
   if q.linked_order_id is not null and next_status<>q.status and next_status<>'closed' then raise exception 'Use linked order workflow' using errcode='40001';end if;
   if not(next_status=q.status or (q.status='new' and next_status in ('contacted','cancelled','lost')) or (q.status='contacted' and next_status in ('quote_sent','cancelled','lost')) or (q.status='quote_sent' and next_status in ('negotiation','won','lost','cancelled')) or (q.status='negotiation' and next_status in ('quote_sent','won','lost','cancelled')) or (q.status='won' and next_status='closed') or (q.status in ('closed','cancelled','lost') and next_status='contacted' and q.linked_order_id is null)) then raise exception 'Invalid transition' using errcode='22023';end if;
   if (fields->>'quotePaise')::bigint not between 0 and 1000000000000 then raise exception 'Invalid quote' using errcode='22023';end if;
   if next_status in ('quote_sent','won') and ((fields->>'quotePaise')::bigint is null or coalesce(char_length(btrim(fields->>'terms')),0)=0 or (fields->>'validUntil')::date is null or (fields->>'validUntil')::date<(now() at time zone 'Asia/Kolkata')::date) then raise exception 'Quote terms/validity required' using errcode='22023';end if;
   if next_status='won' and fields->>'agreement' is distinct from 'true' then raise exception 'Genuine agreement required' using errcode='22023';end if;
   if q.linked_order_id is not null and ((fields->>'quotePaise')::bigint is distinct from q.quote_paise or fields->>'terms' is distinct from q.quote_terms) then raise exception 'Use linked order workflow' using errcode='40001';end if;
   update memocious.custom_requests set status=next_status,quote_paise=(fields->>'quotePaise')::bigint,quote_terms=fields->>'terms',quote_valid_until=(fields->>'validUntil')::date,agreement_at=case when next_status='won' then coalesce(agreement_at,now()) else agreement_at end,closed_at=case when next_status in ('closed','cancelled','lost') then coalesce(closed_at,now()) else null end,version=version+1,updated_at=now() where id=q.id;
  elsif action='convert' then
   if q.status<>'won' or q.agreement_at is null or q.quote_paise is null or q.source_session_id is null then raise exception 'Actual quoted agreement required' using errcode='22023';end if;
   insert into memocious.orders(code,user_id,actor_session_id,source,contact_name,phone,pincode,address,estimate_paise,confirmed_total_paise,requested_date) values(q.code,q.user_id,q.source_session_id,'builder',q.contact->>'name',q.contact->>'phone',q.pincode,jsonb_build_object('city',q.contact->>'city'),(q.immutable_snapshot->'estimate'->>'minPaise')::bigint,q.quote_paise,q.requested_date) returning id into oid;
   item:=q.immutable_snapshot->'item';unit_price:=(item->>'pricePaise')::bigint+(select coalesce(sum((x->>'deltaPaise')::bigint),0) from jsonb_array_elements(q.immutable_snapshot->'options')x);
   if unit_price is not null and unit_price not between 0 and 100000000 then raise exception 'Unsupported unit price' using errcode='22023';end if;
   insert into memocious.order_items(order_id,product_id,product_name,unit_price_paise,quantity,option_snapshot,message,immutable_snapshot) values(oid,q.base_product_id,item->>'name',unit_price,q.quantity,q.immutable_snapshot->'options',q.message,q.immutable_snapshot);
   insert into memocious.order_events(order_id,actor_session_id,to_status,order_version,request_id,internal_note) values(oid,sid,'inquiry',1,gen_random_uuid(),'Converted from a genuine custom-gift agreement. No payment inferred.');
   update memocious.custom_requests set linked_order_id=oid,version=version+1,updated_at=now() where id=q.id;
  else raise exception 'Invalid action' using errcode='22023';end if;
  insert into memocious.phase2_events(entity_id,kind,actor_session_id,version,payload) values(q.id,'custom-'||action,sid,q.version+1,fields) returning id into ev;
  insert into memocious.phase2_outbox(event_id) values(ev);
  insert into memocious.audit_log(actor_session_id,actor_kind,action,entity,entity_id,request_id) values(sid,'admin','custom-'||action,'custom_request',q.id,gen_random_uuid());
 end if;
 return jsonb_build_object('hasMore',(select count(*) from memocious.custom_requests r where (status_filter='' or r.status=status_filter) and r.code like upper(search_code)||'%')>page_num*50,'newCount',(select count(*) from memocious.custom_requests where status='new'),'records',coalesce((select jsonb_agg(to_jsonb(rec)||jsonb_build_object('files',(select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'status',u.status)),'[]') from memocious.request_uploads u where u.custom_request_id=rec.id and u.status='attached'),'historyHasMore',(select count(*)>20 from memocious.phase2_events e where e.entity_id=rec.id),'history',(select coalesce(jsonb_agg(to_jsonb(e) order by e.version),'[]') from(select * from memocious.phase2_events x where x.entity_id=rec.id order by x.version desc limit 20)e))) from(select * from memocious.custom_requests r where (status_filter='' or r.status=status_filter) and r.code like upper(search_code)||'%' order by updated_at desc,id limit 50 offset (page_num-1)*50)rec),'[]'));
end $$;
create function memocious_private.custom_snapshot_immutable() returns trigger language plpgsql set search_path='' as $$
begin
 if new.user_id is distinct from old.user_id or new.draft_id is distinct from old.draft_id or new.code is distinct from old.code or new.immutable_snapshot is distinct from old.immutable_snapshot or new.request_key is distinct from old.request_key then raise exception 'Request identity/snapshot is immutable' using errcode='42501';end if;return new;
end $$;
create trigger custom_snapshot_immutable before update on memocious.custom_requests for each row execute function memocious_private.custom_snapshot_immutable();
revoke execute on function memocious_private.custom_receipt(memocious.custom_requests),memocious_private.custom_snapshot_immutable(),public.memocious_builder_submit(uuid,uuid,int,uuid,boolean,boolean,boolean),public.memocious_custom_requests(uuid,int),public.memocious_admin_custom(uuid,text,uuid,int,jsonb,int,text,text) from public,anon,authenticated;
grant execute on function memocious_private.custom_receipt(memocious.custom_requests),memocious_private.custom_snapshot_immutable(),public.memocious_builder_submit(uuid,uuid,int,uuid,boolean,boolean,boolean),public.memocious_custom_requests(uuid,int),public.memocious_admin_custom(uuid,text,uuid,int,jsonb,int,text,text) to service_role;

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
  'customRequests',coalesce((select jsonb_agg(memocious_private.custom_receipt(c)||jsonb_build_object('submittedPlan',c.immutable_snapshot)) from memocious.custom_requests c where c.user_id=s.user_id),'[]'),
  'builderFiles',coalesce((select jsonb_agg(jsonb_build_object('id',id,'status',status,'bytes',size_bytes,'createdAt',created_at,'download',case when status in ('ready_private','attached') then '/api/builder/files/'||id end)) from memocious.request_uploads where user_id=s.user_id),'[]'),
  'builderDrafts',coalesce((select jsonb_agg(jsonb_build_object('id',id,'schemaVersion',schema_version,'version',version,'step',current_step,'payload',payload,'expiresAt',expires_at)) from memocious.builder_drafts where user_id=s.user_id),'[]'),
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
