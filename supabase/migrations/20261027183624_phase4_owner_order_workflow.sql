-- Offline owner attestations only. No website payment capture/provider ledger.
alter table memocious.orders add column refund_recorded_paise bigint not null default 0
 check(refund_recorded_paise>=0 and refund_recorded_paise<=payment_received_paise);
create index orders_owner_queue on memocious.orders(updated_at desc,id) where deleted_at is null;
create table memocious.order_money_records (
 id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
 order_id uuid not null references memocious.orders(id), event_id uuid not null unique references memocious.order_events(id),
 kind text not null check(kind in ('receipt','refund')), amount_paise bigint not null check(amount_paise between 1 and 1000000000000),
 effective_date date not null, reference text not null check(char_length(reference) between 1 and 120),
 verified_by uuid not null, reason text not null check(char_length(reason) between 1 and 2000),
 unique(order_id,kind,reference)
);
alter table memocious.order_money_records enable row level security;
revoke all on memocious.order_money_records from public,anon,authenticated;
grant select,insert on memocious.order_money_records to service_role;
create index order_money_history on memocious.order_money_records(order_id,created_at desc,id);
create table memocious.order_action_receipts (
 owner_id uuid not null, request_key uuid not null, order_id uuid not null references memocious.orders(id),
 payload_hash text not null, event_id uuid not null unique references memocious.order_events(id),
 result jsonb not null, created_at timestamptz not null default now(), primary key(owner_id,request_key)
);
alter table memocious.order_action_receipts enable row level security;
revoke all on memocious.order_action_receipts from public,anon,authenticated;
grant select,insert on memocious.order_action_receipts to service_role;

create or replace function memocious_private.customer_order_summary(o memocious.orders) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('code',o.code,'source',o.source,'status',o.status,'version',o.version,'createdAt',o.created_at,'updatedAt',o.updated_at,'estimatePaise',o.estimate_paise,'confirmedTotalPaise',o.confirmed_total_paise,'paymentReceivedPaise',o.payment_received_paise,'paymentVerified',o.payment_verified_at is not null,'refundRecordedPaise',o.refund_recorded_paise,'eta',o.eta);
$$;
create function memocious_private.owner_order_summary(o memocious.orders) returns jsonb language sql stable security invoker set search_path='' as $$
 select memocious_private.customer_order_summary(o)||jsonb_build_object('id',o.id,'contactName',o.contact_name,'phone',o.phone,'holdFrom',o.hold_from,'refundDue',o.refund_due);
$$;
create function public.memocious_owner_orders(sid uuid,order_code text default null,page_num int default 1,status_filter text default '',event_page int default 1) returns jsonb language plpgsql security invoker set search_path='' as $$
declare o memocious.orders;
begin
 perform memocious_private.assert_admin(sid,true,false);
 if page_num is null or page_num not between 1 and 10000 or event_page is null or event_page not between 1 and 10000 or status_filter is null or status_filter not in ('','inquiry','confirmed','payment_received','in_production','quality_check','packed','shipped','out_for_delivery','delivered','on_hold','cancelled','refunded') then raise exception 'Invalid query' using errcode='22023';end if;
 if order_code is null then
  return jsonb_build_object('orders',coalesce((select jsonb_agg(memocious_private.owner_order_summary(x) order by x.updated_at desc,x.id) from(select * from memocious.orders r where r.deleted_at is null and (status_filter='' or r.status=status_filter) order by r.updated_at desc,r.id limit 24 offset (page_num-1)*24)x),'[]'), 'hasMore',exists(select 1 from memocious.orders r where r.deleted_at is null and(status_filter='' or r.status=status_filter) offset page_num*24 limit 1));
 end if;
 if order_code !~ '^(GFT|CUS|ENT)-[0-9]{4}-[0-9]{6,12}-[0-9A-HJKMNP-TV-Z]{12}$' then raise exception 'Unavailable' using errcode='22023';end if;
 select * into o from memocious.orders where code=order_code and deleted_at is null;
 if not found then raise exception 'Unavailable' using errcode='22023';end if;
 return jsonb_build_object('order',memocious_private.owner_order_summary(o),
  'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'name',i.product_name,'quantity',i.quantity,'message',i.message) order by i.created_at,i.id) from(select * from memocious.order_items where order_id=o.id order by created_at,id limit 100)i),'[]'),
  'hasMoreItems',exists(select 1 from memocious.order_items where order_id=o.id offset 100 limit 1),
  'events',coalesce((select jsonb_agg(jsonb_build_object('version',e.order_version,'status',e.to_status,'at',e.created_at,'note',e.customer_note,'internalNote',e.internal_note) order by e.order_version) from(select * from memocious.order_events where order_id=o.id order by order_version desc limit 50 offset(event_page-1)*50)e),'[]'),
  'hasOlderEvents',exists(select 1 from memocious.order_events where order_id=o.id offset event_page*50 limit 1),
  'moneyRecords',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'kind',m.kind,'amountPaise',m.amount_paise,'date',m.effective_date,'reference',m.reference,'reason',m.reason) order by m.created_at desc,m.id) from(select * from memocious.order_money_records where order_id=o.id order by created_at desc,id limit 50 offset(event_page-1)*50)m),'[]'),
  'hasOlderMoneyRecords',exists(select 1 from memocious.order_money_records where order_id=o.id offset event_page*50 limit 1));
end $$;

create function public.memocious_owner_order_action(sid uuid,order_id uuid,expected_version int,request_key uuid,action text,fields jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor uuid;o memocious.orders;prior text;target text;reason text;note text;amount bigint;agreed bigint;dated date;ref text;ev uuid;fingerprint text;saved memocious.order_action_receipts;result jsonb;ready boolean;
begin
 actor:=memocious_private.assert_admin(sid,true,true);
 if request_key is null or expected_version is null or expected_version<1 or action is null or action not in ('transition','receipt','refund') or fields is null or jsonb_typeof(fields)<>'object' then raise exception 'Invalid action' using errcode='22023';end if;
 if exists(select 1 from jsonb_object_keys(fields)k where (action='transition' and k not in ('status','reason','customerNote','agreedTotalPaise','contactName','phone','readyMadeVerified')) or(action in ('receipt','refund') and k not in ('amountPaise','date','reference','reason','customerNote'))) then raise exception 'Unknown field' using errcode='22023';end if;
 reason:=btrim(fields->>'reason');note:=coalesce(fields->>'customerNote','');
 if jsonb_typeof(fields->'reason') is distinct from 'string' or coalesce(char_length(reason),0) not between 1 and 2000 or char_length(note)>2000 or(fields ? 'customerNote' and jsonb_typeof(fields->'customerNote')<>'string') then raise exception 'Reason required' using errcode='22023';end if;
 select * into o from memocious.orders r where r.id=order_id and r.deleted_at is null for update;
 if not found then raise exception 'Unavailable' using errcode='22023';end if;
 fingerprint:=encode(sha256(convert_to(jsonb_build_object('order',order_id,'version',expected_version,'action',action,'fields',fields)::text,'UTF8')),'hex');
 select * into saved from memocious.order_action_receipts a where a.owner_id=actor and a.request_key=memocious_owner_order_action.request_key;
 if found then
  if saved.payload_hash<>fingerprint then raise exception 'Changed retry' using errcode='40001';end if;
  return saved.result;
 end if;
 if o.version<>expected_version then raise exception 'Order changed' using errcode='40001';end if;
 prior:=o.status;target:=prior;
 if action='transition' then
  target:=fields->>'status';
  if target is null or target=prior or target='refunded' then raise exception 'Invalid transition' using errcode='22023';end if;
  ready:=false;
  if fields ? 'readyMadeVerified' then
   if jsonb_typeof(fields->'readyMadeVerified')<>'boolean' then raise exception 'Invalid ready-made attestation' using errcode='22023';end if;
   ready:=(fields->>'readyMadeVerified')::boolean;
  end if;
  if not (
   (prior='inquiry' and target in ('confirmed','on_hold','cancelled')) or
   (prior='confirmed' and target in ('payment_received','on_hold','cancelled')) or
   (prior='confirmed' and target='in_production' and o.confirmed_total_paise=0) or
   (prior='payment_received' and (target in ('in_production','on_hold','cancelled') or (ready and target in ('quality_check','packed')))) or
   (prior='in_production' and target in ('quality_check','on_hold','cancelled')) or
   (prior='quality_check' and target in ('packed','in_production','on_hold','cancelled')) or
   (prior='packed' and target in ('shipped','out_for_delivery','on_hold','cancelled')) or
   (prior in ('shipped','out_for_delivery') and target in ('delivered','on_hold')) or
   (prior='on_hold' and(target=o.hold_from or target='cancelled')) or
   (prior='cancelled' and target='inquiry' and o.payment_received_paise=0)
  ) then raise exception 'Invalid transition' using errcode='22023';end if;
  -- Courier dispatch is intentionally blocked until the validated dispatch adapter exists.
  if target in ('shipped','out_for_delivery') then raise exception 'Dispatch evidence adapter required' using errcode='22023';end if;
  if ready and not(prior='payment_received' and target in ('quality_check','packed')) then raise exception 'Unexpected attestation' using errcode='22023';end if;
  if fields ?| array['agreedTotalPaise','contactName','phone'] then
   if not(prior='inquiry' and target='confirmed') then raise exception 'Agreement fields only on confirmation' using errcode='22023';end if;
  end if;
  if prior='inquiry' and target='confirmed' then
   if jsonb_typeof(fields->'agreedTotalPaise') is distinct from 'number' or (fields->>'agreedTotalPaise')!~'^[0-9]{1,13}$' then raise exception 'Agreed total required' using errcode='22023';end if;
   agreed:=(fields->>'agreedTotalPaise')::bigint;
   if agreed>1000000000000 then raise exception 'Invalid total' using errcode='22023';end if;
   o.confirmed_total_paise:=agreed;
   if fields ? 'contactName' then
    if jsonb_typeof(fields->'contactName')<>'string' then raise exception 'Invalid contact' using errcode='22023';end if;
    o.contact_name:=btrim(fields->>'contactName');
   end if;
   if fields ? 'phone' then
    if jsonb_typeof(fields->'phone')<>'string' then raise exception 'Invalid phone' using errcode='22023';end if;
    o.phone:=fields->>'phone';
   end if;
   if coalesce(char_length(o.contact_name),0) not between 1 and 120 or o.phone is null or o.phone!~'^[1-9][0-9]{6,14}$' then raise exception 'Contact required' using errcode='22023';end if;
  end if;
  if target='payment_received' and(o.confirmed_total_paise is null or o.payment_verified_at is null or o.payment_received_paise-o.refund_recorded_paise<=0) then raise exception 'Actual receipt required' using errcode='22023';end if;
  if target not in ('inquiry','on_hold','cancelled') and o.confirmed_total_paise is null then raise exception 'Agreement required' using errcode='22023';end if;
  if target='on_hold' then o.hold_from:=prior;
  elsif prior='on_hold' then o.hold_from:=null;end if;
  if target='cancelled' then o.cancellation_reason:=reason;o.hold_from:=null;end if;
 else
  if jsonb_typeof(fields->'amountPaise') is distinct from 'number' or (fields->>'amountPaise')!~'^[0-9]{1,13}$' or jsonb_typeof(fields->'date') is distinct from 'string' or (fields->>'date')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or jsonb_typeof(fields->'reference') is distinct from 'string' then raise exception 'Payment facts required' using errcode='22023';end if;
  amount:=(fields->>'amountPaise')::bigint;dated:=(fields->>'date')::date;ref:=btrim(fields->>'reference');
  if amount not between 1 and 1000000000000 or dated>(now()at time zone 'Asia/Kolkata')::date or char_length(ref) not between 1 and 120 then raise exception 'Invalid payment facts' using errcode='22023';end if;
  if action='receipt' then
   if prior in ('inquiry','cancelled','refunded') or o.confirmed_total_paise is null or o.payment_received_paise+amount>o.confirmed_total_paise then raise exception 'Receipt outside agreement' using errcode='22023';end if;
   o.payment_received_paise:=o.payment_received_paise+amount;o.payment_verified_at:=now();o.payment_verified_by:=actor;
  else
   if prior not in ('cancelled','delivered') or amount>o.payment_received_paise-o.refund_recorded_paise then raise exception 'Refund outside recorded receipts' using errcode='22023';end if;
   o.refund_recorded_paise:=o.refund_recorded_paise+amount;
   if o.refund_recorded_paise=o.payment_received_paise then target:='refunded';end if;
  end if;
 end if;
 o.refund_due:=target='cancelled' and o.payment_received_paise>o.refund_recorded_paise;
 update memocious.orders r set status=target,version=r.version+1,updated_at=now(),confirmed_total_paise=o.confirmed_total_paise,contact_name=o.contact_name,phone=o.phone,payment_received_paise=o.payment_received_paise,payment_verified_by=o.payment_verified_by,payment_verified_at=o.payment_verified_at,refund_recorded_paise=o.refund_recorded_paise,refund_due=o.refund_due,hold_from=o.hold_from,cancellation_reason=o.cancellation_reason where r.id=o.id returning * into o;
 insert into memocious.order_events(order_id,actor_session_id,from_status,to_status,order_version,customer_note,internal_note,request_id) values(o.id,sid,prior,target,o.version,note,reason,request_key) returning id into ev;
 if action in ('receipt','refund') then
  insert into memocious.order_money_records(order_id,event_id,kind,amount_paise,effective_date,reference,verified_by,reason) values(o.id,ev,action,amount,dated,ref,actor,reason);
 end if;
 insert into memocious.notification_outbox(event_id,dedup_key,channel,template_version,recipient_reference) values(ev,'order-event:'||ev::text,'in_app','order-v1',o.user_id);
 insert into memocious.audit_log(actor_session_id,actor_kind,action,entity,entity_id,request_id,redacted_diff) values(sid,'admin','order.'||action,'order',o.id,request_key,jsonb_build_object('version',o.version,'readyMadeVerified',coalesce(ready,false)));
 result:=jsonb_build_object('code',o.code,'version',o.version,'status',o.status);
 insert into memocious.order_action_receipts(owner_id,request_key,order_id,payload_hash,event_id,result) values(actor,request_key,o.id,fingerprint,ev,result);
 return result;
end $$;
revoke execute on function memocious_private.owner_order_summary(memocious.orders),public.memocious_owner_orders(uuid,text,int,text,int),public.memocious_owner_order_action(uuid,uuid,int,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function memocious_private.owner_order_summary(memocious.orders),public.memocious_owner_orders(uuid,text,int,text,int),public.memocious_owner_order_action(uuid,uuid,int,uuid,text,jsonb) to service_role;
