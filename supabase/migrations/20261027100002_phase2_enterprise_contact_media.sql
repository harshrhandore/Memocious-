-- Dedicated Phase 2 records: no new browser table grants.
create table memocious.contact_messages(id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),session_id uuid not null,user_id uuid references auth.users(id),name text not null,email text not null,body text not null,status text not null default 'new' check(status in ('new','reviewed')));
create table memocious.phase2_events(id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),entity_id uuid not null,kind text not null,actor_session_id uuid not null,version int not null,payload jsonb not null,unique(entity_id,version));
create table memocious.phase2_outbox(id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),event_id uuid not null unique references memocious.phase2_events(id),channel text not null default 'in_app' check(channel='in_app'),status text not null default 'available' check(status in ('available','read')));
create table memocious.phase2_assets(id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),user_id uuid references auth.users(id),session_id uuid not null,kind text not null check(kind in ('review','enterprise','proof')),parent_id uuid not null,expected_version int not null,bytes int not null check(bytes between 1 and 2097152),mime text not null check(mime in ('image/jpeg','image/png','image/webp')),status text not null default 'issued' check(status in ('issued','processing','ready','rejected','deleting','deleted')),expires_at timestamptz not null default now()+interval '15 minutes',consent_at timestamptz,policy_version text,private_path text not null unique,public_copy text unique,public_ready boolean not null default false,width int,height int,digest text,lease_until timestamptz);
alter table memocious.sales_proof_items add column version int not null default 1;
alter table memocious.sales_proof_items add column asset_id uuid references memocious.phase2_assets(id);
create table memocious.proof_counters(id uuid primary key default gen_random_uuid(),label text not null check(char_length(label) between 1 and 80),value bigint not null check(value>=0),evidence_reference text not null check(char_length(evidence_reference) between 1 and 500),active boolean not null default false,version int not null default 1);
create table memocious.catalogue_documents(id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),title text not null,lines jsonb not null,version int not null default 1,published boolean not null default false);
do $$ declare t text;begin foreach t in array array['contact_messages','phase2_events','phase2_outbox','phase2_assets','proof_counters','catalogue_documents'] loop execute format('alter table memocious.%I enable row level security',t);execute format('revoke all on memocious.%I from public,anon,authenticated',t);execute format('grant select,insert,update,delete on memocious.%I to service_role',t);end loop;end $$;
revoke update,delete on memocious.phase2_events from service_role;
create index phase2_assets_owner on memocious.phase2_assets(user_id,created_at);
create index phase2_assets_expiry on memocious.phase2_assets(status,expires_at);

create function public.memocious_inquiry(sid uuid,request_key uuid,kind text,fields jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;old memocious.idempotency_keys;digest text;eid uuid:=gen_random_uuid();ev uuid;result jsonb;item jsonb;p memocious.products;items jsonb:='[]';month_key text;seq bigint;code text;dest text;minimum date:=current_date;
begin
 s:=memocious_private.assert_session(sid,null,true);
 if s.audience not in ('customer','guest') or kind not in ('enterprise','contact') then raise exception 'Invalid actor' using errcode='42501';end if;
 if fields->>'consent' is distinct from 'true' then raise exception 'Consent required' using errcode='22023';end if;
 digest:=encode(sha256(convert_to(fields::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended(sid::text||kind||request_key::text,0));
 select * into old from memocious.idempotency_keys where actor_session_id=sid and operation=kind and key=request_key;
 if found then if old.payload_hash<>digest or old.expires_at<=now() then raise exception 'Submission changed' using errcode='40001';end if;return old.result;end if;
 if not exists(select 1 from memocious.site_settings where key='policies_approved' and value='true') then raise exception 'Unavailable' using errcode='42501';end if;
 if coalesce(char_length(fields->>'contactName'),0) not between 1 and 120 or coalesce(fields->>'email','')!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or char_length(fields->>'email')>254 or coalesce(char_length(fields->>'notes'),0) not between 1 and 2000 then raise exception 'Invalid contact' using errcode='22023';end if;
 if kind='contact' then
  if exists(select 1 from jsonb_object_keys(fields) k where k not in ('contactName','email','notes','consent')) then raise exception 'Unknown fields' using errcode='22023';end if;
  insert into memocious.contact_messages(id,session_id,user_id,name,email,body) values(eid,sid,s.user_id,fields->>'contactName',fields->>'email',fields->>'notes');
  code:='MSG-'||upper(substr(replace(eid::text,'-',''),1,12));
 else
  if exists(select 1 from jsonb_object_keys(fields) k where k not in ('contactName','email','notes','consent','organization','organizationType','role','phone','gstin','items','branding','deadline','city','pincode','budgetMinPaise','budgetMaxPaise')) or
   coalesce(char_length(fields->>'organization'),0) not between 1 and 120 or fields->>'organizationType' not in ('college','company','event','ngo','other') or coalesce(char_length(fields->>'role'),0) not between 1 and 120 or coalesce(fields->>'phone','')!~'^[1-9][0-9]{6,14}$' or coalesce(char_length(fields->>'city'),0) not between 1 and 120 or coalesce(fields->>'pincode','')!~'^[0-9]{6}$' or jsonb_typeof(fields->'items') is distinct from 'array' or jsonb_array_length(fields->'items') not between 1 and 20 then raise exception 'Invalid enterprise details' using errcode='22023';end if;
  if jsonb_typeof(fields->'branding') is distinct from 'object' or exists(select 1 from jsonb_object_keys(fields->'branding') k where k not in ('colours','text')) or char_length(coalesce(fields->'branding'->>'colours',''))>120 or char_length(coalesce(fields->'branding'->>'text',''))>500 then raise exception 'Invalid branding' using errcode='22023';end if;
  if (select count(distinct x->>'product') from jsonb_array_elements(fields->'items') x)<>jsonb_array_length(fields->'items') then raise exception 'Duplicate item' using errcode='22023';end if;
  for item in select * from jsonb_array_elements(fields->'items') loop
   if exists(select 1 from jsonb_object_keys(item) k where k not in ('product','quantity')) then raise exception 'Invalid item' using errcode='22023';end if;
   select * into p from memocious.products where id=(item->>'product')::uuid and active and enterprise and in_stock and publication_state='published' and deleted_at is null for share;
   if not found or not exists(select 1 from public.memocious_catalogue_products where id=p.id) or coalesce((item->>'quantity')::int,0) not between greatest(coalesce(p.moq,1),1) and 10000 then raise exception 'Unavailable enterprise item' using errcode='22023';end if;
   minimum:=greatest(minimum,(now() at time zone 'Asia/Kolkata')::date+coalesce(p.lead_days,0));
   items:=items||jsonb_build_array(jsonb_build_object('product',p.id,'version',p.version,'name',p.name,'quantity',(item->>'quantity')::int,'unitPricePaise',p.price_paise,'moq',p.moq,'leadDays',p.lead_days));
  end loop;
  if (fields->>'deadline') is null or (fields->>'budgetMinPaise')::bigint is null or (fields->>'budgetMaxPaise')::bigint is null or (fields->>'budgetMaxPaise')::bigint>1000000000000 or (fields->>'deadline')::date<minimum or (fields->>'deadline')::date>(now() at time zone 'Asia/Kolkata')::date+730 then raise exception 'Deadline unavailable' using errcode='22023';end if;
  month_key:=to_char(now() at time zone 'Asia/Kolkata','YYMM');
  insert into memocious.code_counters(prefix,business_month,next_sequence) values('ENT',month_key,2) on conflict(prefix,business_month) do update set next_sequence=memocious.code_counters.next_sequence+1 returning next_sequence-1 into seq;
  code:='ENT-'||month_key||'-'||lpad(seq::text,greatest(6,char_length(seq::text)),'0')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  insert into memocious.enterprise_inquiries(id,code,user_id,actor_session_id,organization,organization_type,contact_name,contact_role,phone,email,gstin,items,branding,deadline,city,pincode,budget_min_paise,budget_max_paise,notes)
  values(eid,code,s.user_id,sid,fields->>'organization',fields->>'organizationType',fields->>'contactName',fields->>'role',fields->>'phone',fields->>'email',nullif(fields->>'gstin',''),items,fields->'branding',(fields->>'deadline')::date,fields->>'city',fields->>'pincode',(fields->>'budgetMinPaise')::bigint,(fields->>'budgetMaxPaise')::bigint,fields->>'notes');
 end if;
 insert into memocious.phase2_events(entity_id,kind,actor_session_id,version,payload) values(eid,kind||'-created',sid,1,'{}') returning id into ev;
 insert into memocious.phase2_outbox(event_id) values(ev);
 insert into memocious.consent_records(session_id,user_id,enterprise_id,purpose,policy_version,channel) values(sid,s.user_id,case when kind='enterprise' then eid else null end,kind||'-contact','owner-approved-v1','web');
 select value#>>'{}' into dest from memocious.site_settings where key='whatsapp_number';
 result:=jsonb_build_object('id',eid,'code',code,'number',dest,'message',case when kind='enterprise' then 'Hello Memocious, please discuss enterprise enquiry '||code||'. Organization: '||(fields->>'organization')||'. '||(select string_agg((x->>'name')||' x '||(x->>'quantity'),'; ') from jsonb_array_elements(items) x)||'. Requested date: '||(fields->>'deadline')||'. Final scope and price by quotation.' else 'Message saved for owner review.' end,'notification','Available in the owner dashboard. Email is not configured.');
 insert into memocious.idempotency_keys(actor_session_id,operation,key,payload_hash,result,completed_at) values(sid,kind,request_key,digest,result,now());
 return result;
end $$;
create function public.memocious_admin_inquiries(sid uuid,entity uuid default null,expected_version int default null,action text default 'list',fields jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor uuid;e memocious.enterprise_inquiries;ev uuid;oid uuid;item jsonb;next_state text;old_event memocious.phase2_events;
begin
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
 return jsonb_build_object('enterprise',coalesce((select jsonb_agg(to_jsonb(x)||jsonb_build_object('assets',(select coalesce(jsonb_agg(a.id),'[]') from memocious.phase2_assets a where a.kind='enterprise' and a.parent_id=x.id and a.status='ready'))) from(select * from memocious.enterprise_inquiries order by updated_at desc limit 100)x),'[]'),
 'contacts',coalesce((select jsonb_agg(to_jsonb(x)) from(select id,name,email,body,status,created_at from memocious.contact_messages order by created_at desc limit 100)x),'[]'),
 'privacy',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',p.full_name,'status',r.status,'createdAt',r.created_at)) from memocious.privacy_requests r join memocious.profiles p on p.user_id=r.user_id),'[]'),
 'newCount',(select count(*) from memocious.enterprise_inquiries where pipeline='new'),
 'events',coalesce((select jsonb_agg(to_jsonb(x)) from(select entity_id,kind,version,payload,created_at from memocious.phase2_events order by created_at desc limit 200)x),'[]'));
end $$;

create function public.memocious_asset_begin(sid uuid,kind text,parent uuid,bytes int,mime text,consent boolean) returns uuid language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;v int;aid uuid:=gen_random_uuid();n int;total bigint;
begin
 s:=memocious_private.assert_session(sid,null,true);
 if kind='proof' then perform memocious_private.assert_admin(sid,true,true);select version into v from memocious.sales_proof_items where id=parent for update;
 elsif s.audience='customer' and kind='review' then select version into v from memocious.reviews where id=parent and user_id=s.user_id and deleted_at is null for update;
 elsif s.audience='customer' and kind='enterprise' then select version into v from memocious.enterprise_inquiries where id=parent and user_id=s.user_id for update;
 else raise exception 'Unavailable' using errcode='42501';end if;
 if v is null or (kind in ('review','proof') and not coalesce(consent,false)) then raise exception 'Unavailable or missing consent' using errcode='42501';end if;
 if bytes is null or bytes not between 1 and 2097152 or mime not in ('image/jpeg','image/png','image/webp') then raise exception 'Invalid image' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('assets:'||s.user_id::text,0));
 select count(*),coalesce(sum(a.bytes),0) into n,total from memocious.phase2_assets a where a.user_id=s.user_id and ((a.status in ('issued','processing') and a.expires_at>now()) or a.status='ready');
 if n>=100 or total+bytes>104857600 or (select count(*) from memocious.phase2_assets a where a.user_id=s.user_id and a.created_at>now()-interval '1 day')>=20 or (select count(*) from memocious.phase2_assets a where a.parent_id=parent and a.status in ('issued','processing','ready') and (a.status='ready' or a.expires_at>now()))>=5 then raise exception 'Quota reached' using errcode='54000';end if;
 insert into memocious.phase2_assets(id,user_id,session_id,kind,parent_id,expected_version,bytes,mime,private_path,consent_at,policy_version) values(aid,s.user_id,sid,kind,parent,v,bytes,mime,'phase2/'||aid||'.webp',case when consent then now() end,case when consent then 'owner-approved-v1' end);
 return aid;
end $$;
create function public.memocious_asset(sid uuid,asset uuid,action text,details jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;a memocious.phase2_assets;v int;allowed boolean:=false;owner uuid;
begin
 if sid is not null then
  s:=memocious_private.assert_session(sid);
  if s.audience='admin' then owner:=memocious_private.assert_admin(sid,true,action in ('publish','published'));end if;
 end if;
 if action='ready' then perform pg_advisory_xact_lock(814262710001::bigint);end if;
 select * into a from memocious.phase2_assets where id=asset for update;
 if not found then raise exception 'Unavailable' using errcode='42501';end if;
 if action='public' then
  allowed:=a.status='ready' and a.public_copy is not null and a.public_ready and a.consent_at is not null and (
    (a.kind='review' and exists(select 1 from memocious.reviews r join public.memocious_catalogue_products p on p.id=r.product_id where r.id=a.parent_id and r.photo_id=a.id and r.status='approved' and r.deleted_at is null)) or
    (a.kind='proof' and exists(select 1 from memocious.sales_proof_items p where p.id=a.parent_id and p.asset_id=a.id and p.active)));
  if not coalesce(allowed,false) then raise exception 'Unavailable' using errcode='42501';end if;
  return jsonb_build_object('path',a.public_copy);
 end if;
 if s.id is null or (owner is null and (s.audience<>'customer' or a.user_id is distinct from s.user_id)) then raise exception 'Unavailable' using errcode='42501';end if;
 if action='read' then
  if a.status<>'ready' then raise exception 'Unavailable' using errcode='22023';end if;
 elsif action='claim' then
  if a.status<>'issued' or a.expires_at<=now() then raise exception 'Expired or consumed' using errcode='40001';end if;
  update memocious.phase2_assets set status='processing',lease_until=now()+interval '2 minutes' where id=a.id;
 elsif action='ready' then
  if a.status<>'processing' or a.lease_until<=now() then raise exception 'Expired' using errcode='40001';end if;
  if (details->>'width')::int not between 1 and 2048 or (details->>'height')::int not between 1 and 2048 or (details->>'bytes')::int not between 1 and 2097152 or coalesce(details->>'digest','')!~'^[a-f0-9]{64}$' then raise exception 'Invalid normalized image' using errcode='22023';end if;
  if a.kind='review' then
   select version into v from memocious.reviews where id=a.parent_id and user_id=a.user_id and deleted_at is null for update;
  elsif a.kind='enterprise' then select version into v from memocious.enterprise_inquiries where id=a.parent_id and user_id=a.user_id for update;
  else select version into v from memocious.sales_proof_items where id=a.parent_id for update;end if;
  if v is distinct from a.expected_version then raise exception 'Parent changed' using errcode='40001';end if;
  update memocious.phase2_assets set status='ready',width=(details->>'width')::int,height=(details->>'height')::int,digest=details->>'digest',updated_at=now() where id=a.id;
  if a.kind='review' then update memocious.reviews set photo_id=a.id,status='pending',version=version+1,updated_at=now() where id=a.parent_id;
  elsif a.kind='proof' then update memocious.sales_proof_items set asset_id=a.id,active=false,version=version+1 where id=a.parent_id;end if;
 elsif action='publish' then
  if owner is null or a.status<>'ready' or a.consent_at is null or a.kind='enterprise' then raise exception 'Not publishable' using errcode='42501';end if;
  update memocious.phase2_assets set public_copy=coalesce(public_copy,'phase2-public/'||gen_random_uuid()||'.webp') where id=a.id returning * into a;
 elsif action='published' then
  if owner is null or a.status<>'ready' or a.public_copy is null or a.consent_at is null then raise exception 'Unavailable' using errcode='42501';end if;
  update memocious.phase2_assets set public_ready=true where id=a.id;
 elsif action='reject' then update memocious.phase2_assets set status='rejected',updated_at=now() where id=a.id and status in ('issued','processing');
 else raise exception 'Invalid operation' using errcode='22023';end if;
 return jsonb_build_object('path',a.private_path,'copy',a.public_copy,'bytes',a.bytes,'mime',a.mime,'kind',a.kind,'parent',a.parent_id);
end $$;

create function public.memocious_admin_proof(sid uuid,action text default 'list',entity uuid default null,expected_version int default null,fields jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor uuid;p memocious.sales_proof_items;c memocious.proof_counters;doc memocious.catalogue_documents;did uuid;line jsonb;
begin
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
  select 'Memocious enterprise catalogue',coalesce(jsonb_agg(jsonb_build_object('name',q.name,'description',q.description,'moq',q.moq,'leadDays',q.lead_days,'pricePaise',q.price_paise) order by q.name),'[]') from (select q.* from memocious.products q join public.memocious_catalogue_products cp on cp.id=q.id where q.enterprise order by q.name limit 100)q returning id into did;
 elsif action in ('catalogue-publish','catalogue-hide') then
  select * into doc from memocious.catalogue_documents where id=entity for update;
  if not found or doc.version<>expected_version then raise exception 'Changed' using errcode='40001';end if;
  if action='catalogue-publish' and jsonb_array_length(doc.lines)=0 then raise exception 'No enterprise products' using errcode='22023';end if;
  update memocious.catalogue_documents set published=false where published=true;
  update memocious.catalogue_documents set published=action='catalogue-publish',version=version+1 where id=entity;
 elsif action<>'list' then raise exception 'Invalid action' using errcode='22023';end if;
 if action<>'list' then insert into memocious.audit_log(actor_session_id,actor_kind,action,entity,entity_id,request_id) values(sid,'admin',action,'proof',coalesce(entity,did),gen_random_uuid());end if;
 return jsonb_build_object('proof',coalesce((select jsonb_agg(to_jsonb(q)) from memocious.sales_proof_items q),'[]'),
 'counters',coalesce((select jsonb_agg(to_jsonb(q)) from memocious.proof_counters q),'[]'),
 'documents',coalesce((select jsonb_agg(to_jsonb(x)) from(select id,title,created_at,version,published from memocious.catalogue_documents order by created_at desc limit 20)x),'[]'));
end $$;
create function public.memocious_phase2_public() returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('proof',coalesce((select jsonb_agg(jsonb_build_object('photo','/community-media/'||a.id,'caption',p.caption,'firstName',p.first_name,'city',p.city) order by p.sort_order,p.id) from memocious.sales_proof_items p join memocious.phase2_assets a on a.id=p.asset_id where p.active and a.status='ready' and a.consent_at is not null and a.public_copy is not null and a.public_ready),'[]'),
 'counters',coalesce((select jsonb_agg(jsonb_build_object('label',label,'value',value)) from memocious.proof_counters where active),'[]'),
 'catalogue',(select id from memocious.catalogue_documents where published limit 1),
 'bestsellers',coalesce((select jsonb_agg(x.data) from(select cp.data from public.memocious_catalogue_products cp join memocious.order_items i on i.product_id=cp.id join memocious.orders o on o.id=i.order_id where o.status='delivered' and o.updated_at>now()-interval '90 days' group by cp.id order by sum(i.quantity) desc,cp.id limit 4)x),'[]'),
 'testimonials',(select public.memocious_reviews(null,1)->'items'));
$$;
create function public.memocious_catalogue_document(sid uuid,document uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare d memocious.catalogue_documents;
begin
 select * into d from memocious.catalogue_documents where id=document;
 if not found then return null;end if;
 if not d.published then perform memocious_private.assert_admin(sid,true);end if;
 return jsonb_build_object('title',d.title,'lines',d.lines);
end $$;
-- Expiry/reconciliation returns paths only to a scheduled trusted server worker.
create function public.memocious_phase2_cleanup(asset uuid default null,finished boolean default false) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if asset is not null and finished then update memocious.phase2_assets set status='deleted',updated_at=now() where id=asset and status='deleting';end if;
 update memocious.phase2_assets a set status='deleting',updated_at=now() where
 (a.status in ('issued','processing','rejected') and a.expires_at<now()-interval '1 day') or
 (a.status='ready' and a.created_at<now()-interval '1 day' and a.kind='review' and not exists(select 1 from memocious.reviews r where r.id=a.parent_id and r.photo_id=a.id and r.deleted_at is null)) or
 (a.status='ready' and a.created_at<now()-interval '1 day' and a.kind='proof' and not exists(select 1 from memocious.sales_proof_items p where p.asset_id=a.id)) or
 (a.status='ready' and a.kind='enterprise' and exists(select 1 from memocious.enterprise_inquiries e where e.id=a.parent_id and e.pipeline in ('won','lost') and e.updated_at<now()-interval '90 days'));
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'path',private_path,'copy',public_copy)) from(select * from memocious.phase2_assets where status='deleting' order by updated_at limit 100)x),'[]');
end $$;
do $$ declare r record;begin
 for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('memocious_inquiry','memocious_admin_inquiries','memocious_asset_begin','memocious_asset','memocious_admin_proof','memocious_phase2_public','memocious_catalogue_document','memocious_phase2_cleanup') loop
 execute format('revoke execute on function %s from public,anon,authenticated',r.signature);execute format('grant execute on function %s to service_role',r.signature);
 end loop;
end $$;

create function public.memocious_enterprise_choices() returns jsonb language sql security invoker set search_path='' as $$
select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'moq',p.moq,'leadDays',p.lead_days) order by p.name),'[]') from (select p.* from memocious.products p join public.memocious_catalogue_products c on c.id=p.id where p.enterprise and p.in_stock order by p.name limit 100)p;
$$;
revoke execute on function public.memocious_enterprise_choices() from public,anon,authenticated;
grant execute on function public.memocious_enterprise_choices() to service_role;

create function public.memocious_my_enterprise(sid uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;
begin
 s:=memocious_private.assert_session(sid,'customer');
 return coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'code',e.code,'organization',e.organization,'pipeline',e.pipeline,'createdAt',e.created_at,'assets',(select coalesce(jsonb_agg(a.id),'[]') from memocious.phase2_assets a where a.parent_id=e.id and a.user_id=s.user_id and a.status='ready'))) from (select * from memocious.enterprise_inquiries where user_id=s.user_id order by created_at desc limit 100)e),'[]');
end $$;
revoke execute on function public.memocious_my_enterprise(uuid) from public,anon,authenticated;
grant execute on function public.memocious_my_enterprise(uuid) to service_role;
