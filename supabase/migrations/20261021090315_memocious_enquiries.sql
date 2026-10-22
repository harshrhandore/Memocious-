create function public.memocious_enquiry(sid uuid, request_key uuid, product uuid, qty int, selected uuid[], personal_message text, budget_paise bigint, occasion text, pincode text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions; p memocious.products; opts jsonb; delta bigint; price bigint; existing memocious.idempotency_keys; payload_digest text; dest text; month_key text; sequence_value bigint; suffix text; code text; oid uuid; result jsonb; policy_ok boolean;
begin
 s:=memocious_private.assert_session(sid);
 if s.audience not in ('customer','guest') then raise exception 'Access unavailable' using errcode='42501';end if;
 if qty not between 1 and 10000 or char_length(personal_message)>500 or cardinality(selected)>20 or cardinality(selected)<>(select count(distinct v) from unnest(selected) v) or budget_paise<0 or budget_paise>100000000 or char_length(occasion)>80 or (pincode<>'' and pincode!~'^[0-9]{6}$') then raise exception 'Invalid enquiry';end if;
 payload_digest:=encode(sha256(convert_to(jsonb_build_object('product',product,'qty',qty,'options',(select coalesce(jsonb_agg(v order by v),'[]') from unnest(selected) v),'message',personal_message,'budget',budget_paise,'occasion',occasion,'pincode',pincode)::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended(sid::text||request_key::text,0));
 select * into existing from memocious.idempotency_keys where actor_session_id=sid and operation='enquiry' and key=request_key;
 if found then
 if existing.payload_hash<>payload_digest then raise exception 'Submission conflict' using errcode='40001';end if;
 if existing.expires_at<=now() then raise exception 'Submission expired; start a new enquiry' using errcode='40001';end if;
 return existing.result;end if;
 select value#>>'{}' into dest from memocious.site_settings where key='whatsapp_number';
 select value='true'::jsonb into policy_ok from memocious.site_settings where key='policies_approved';
 if dest is null or dest!~'^[1-9][0-9]{6,14}$' or not coalesce(policy_ok,false) then raise exception 'Ordering temporarily unavailable' using errcode='55000';end if;
 select * into p from memocious.products where id=product and active and publication_state='published' and deleted_at is null for share;
 if not found or not p.in_stock or not exists(select 1 from public.memocious_catalogue_products where id=p.id) or qty<coalesce(p.moq,1) then raise exception 'Gift unavailable';end if;
 if exists(select 1 from unnest(selected) v where not exists(select 1 from memocious.option_values ov join memocious.product_options po on po.id=ov.option_id where ov.id=v and ov.active and po.active and po.product_id=product)) or exists(select 1 from memocious.product_options po where po.product_id=product and po.active and po.required and not exists(select 1 from memocious.option_values v where v.option_id=po.id and v.id=any(selected))) then raise exception 'Options unavailable';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'label',o.label||': '||v.label,'deltaPaise',v.delta_paise) order by v.id),'[]'),coalesce(sum(v.delta_paise),0) into opts,delta from memocious.option_values v join memocious.product_options o on o.id=v.option_id where v.id=any(selected);
 price:=(p.price_paise+delta)*qty;
 month_key:=to_char(now() at time zone 'Asia/Kolkata','YYMM');
 insert into memocious.code_counters(prefix,business_month,next_sequence) values('GFT',month_key,2) on conflict(prefix,business_month) do update set next_sequence=memocious.code_counters.next_sequence+1 returning next_sequence-1 into sequence_value;
 select string_agg(substr('0123456789ABCDEFGHJKMNPQRSTVWXYZ',1+get_byte(uuid_send(gen_random_uuid()),0)%32,1),'') into suffix from generate_series(1,12);
 code:='GFT-'||month_key||'-'||lpad(sequence_value::text,greatest(6,char_length(sequence_value::text)),'0')||'-'||suffix;
 insert into memocious.orders(code,user_id,actor_session_id,source,estimate_paise,pincode) values(code,s.user_id,sid,'product',price,nullif(pincode,'')) returning id into oid;
 insert into memocious.order_items(order_id,product_id,product_name,unit_price_paise,quantity,option_snapshot,message,moq_snapshot,immutable_snapshot) values(oid,p.id,p.name,p.price_paise+delta,qty,opts,personal_message,p.moq,jsonb_build_object('productSlug',p.slug,'version',p.version,'name',p.name,'unitPricePaise',p.price_paise+delta,'currency','INR','options',opts));
 insert into memocious.order_events(order_id,actor_session_id,to_status,order_version,request_id) values(oid,sid,'inquiry',1,request_key);
 insert into memocious.consent_records(session_id,user_id,order_id,purpose,policy_version,channel) values(sid,s.user_id,oid,'enquiry-whatsapp','owner-approved-v1','web');
 result:=jsonb_build_object('code',code,'name',p.name,'slug',p.slug,'quantity',qty,'options',opts,'message',personal_message,'budgetPaise',budget_paise,'occasion',occasion,'pincode',pincode,'estimatePaise',price,'number',dest);
 insert into memocious.idempotency_keys(actor_session_id,operation,key,payload_hash,result,completed_at) values(sid,'enquiry',request_key,payload_digest,result,now());
 return result;
end $$;

create function public.memocious_profile(sid uuid, new_name text default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions; p memocious.profiles;
begin
 s:=memocious_private.assert_session(sid,'customer',new_name is not null);
 if new_name is not null then
 if char_length(new_name)>120 then raise exception 'Invalid name';end if;
 insert into memocious.profiles(user_id,full_name) values(s.user_id,new_name) on conflict(user_id) do update set full_name=excluded.full_name,updated_at=now();end if;
 select * into p from memocious.profiles where user_id=s.user_id;
 return jsonb_build_object('fullName',coalesce(p.full_name,''));
end $$;


-- No public role receives execution of business helpers, session stores or mutations.
revoke execute on all functions in schema memocious_private from public,anon,authenticated;
grant execute on all functions in schema memocious_private to service_role;

revoke execute on all functions in schema memocious_private from public,anon,authenticated;
grant execute on all functions in schema memocious_private to service_role;
-- Scope revocation to this application's named RPCs only.
do $$ declare r record; begin
 for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'memocious_%' loop
 execute format('revoke execute on function %s from public,anon,authenticated',r.signature);
 execute format('grant execute on function %s to service_role',r.signature);
 end loop;
end $$;
grant execute on function public.memocious_taxonomy(),public.memocious_product(text),public.memocious_public_settings(),public.memocious_catalogue(jsonb) to anon,authenticated;
