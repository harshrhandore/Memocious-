-- Customer projections only; guest possession and owner mutations are separate increments.
create index orders_customer_timeline on memocious.orders(user_id,created_at desc,id) where deleted_at is null;
create function memocious_private.customer_order_summary(o memocious.orders) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('code',o.code,'source',o.source,'status',o.status,'version',o.version,'createdAt',o.created_at,'updatedAt',o.updated_at,'estimatePaise',o.estimate_paise,'confirmedTotalPaise',o.confirmed_total_paise,'paymentReceivedPaise',o.payment_received_paise,'paymentVerified',o.payment_verified_at is not null,'eta',o.eta);
$$;
create function public.memocious_customer_orders(sid uuid,order_code text default null,page_num int default 1,event_page int default 1) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;o memocious.orders;
begin
 -- Polling never extends activity; authority is derived solely from this verified session's owner.
 s:=memocious_private.assert_session(sid,'customer',false);
 if s.user_id is null then raise exception 'Unavailable' using errcode='42501';end if;
 if page_num is null or page_num not between 1 and 10000 or event_page is null or event_page not between 1 and 10000 then raise exception 'Invalid page' using errcode='22023';end if;
 if order_code is null then
  return jsonb_build_object('hasMore',(select count(*) from memocious.orders x where x.user_id=s.user_id and x.deleted_at is null)>page_num*24,'orders',coalesce((select jsonb_agg(memocious_private.customer_order_summary(x) order by x.created_at desc,x.id) from(select * from memocious.orders r where r.user_id=s.user_id and r.deleted_at is null order by r.created_at desc,r.id limit 24 offset (page_num-1)*24)x),'[]'));
 end if;
 if order_code !~ '^(GFT|CUS|ENT)-[0-9]{4}-[0-9]{6,12}-[0-9A-HJKMNP-TV-Z]{12}$' then raise exception 'Unavailable' using errcode='42501';end if;
 select * into o from memocious.orders r where r.code=order_code and r.user_id=s.user_id and r.deleted_at is null;
 if not found then raise exception 'Unavailable' using errcode='42501';end if;
 return jsonb_build_object('order',memocious_private.customer_order_summary(o),
  'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'name',i.product_name,'unitPricePaise',i.unit_price_paise,'quantity',i.quantity,'options',(select coalesce(jsonb_agg(jsonb_build_object('label',v->>'label')),'[]') from jsonb_array_elements(i.option_snapshot)v),'message',i.message) order by i.created_at,i.id) from(select * from memocious.order_items where order_id=o.id order by created_at,id limit 100)i),'[]'),
  'hasMoreItems',(select count(*) from memocious.order_items where order_id=o.id)>100,
  'events',coalesce((select jsonb_agg(jsonb_build_object('version',e.order_version,'status',e.to_status,'at',e.created_at,'note',e.customer_note) order by e.order_version) from(select * from memocious.order_events where order_id=o.id order by order_version desc limit 50 offset (event_page-1)*50)e),'[]'),
  'hasOlderEvents',(select count(*) from memocious.order_events where order_id=o.id)>event_page*50);
end $$;
revoke execute on function memocious_private.customer_order_summary(memocious.orders),public.memocious_customer_orders(uuid,text,int,int) from public,anon,authenticated;
grant execute on function memocious_private.customer_order_summary(memocious.orders),public.memocious_customer_orders(uuid,text,int,int) to service_role;
