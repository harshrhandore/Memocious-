-- Schema 2 adds trusted product configurations. Schema 1 stays readable and upgradeable.
create function public.memocious_builder_choices(gift_type uuid, selected_product uuid default null) returns jsonb language sql security invoker set search_path='' as $$
 with recursive allowed as (
 select id,slug from public.memocious_taxonomy_items where id=gift_type and kind='category'
 union all select c.id,c.slug from public.memocious_taxonomy_items c join allowed a on c.parent_slug=a.slug where c.kind='category')
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'name',q.name,'version',q.version,'pricePaise',q.price_paise,'maxPricePaise',q.max_price_paise,'moq',coalesce(q.moq,1),'leadDays',q.lead_days,'messageLimit',least(q.message_limit,500),'requiresPhotos',exists(select 1 from memocious.product_options po where po.product_id=q.id and po.active and po.required and po.kind='upload'),'optionGroups',q.data->'optionGroups') order by q.name,q.id),'[]')
 from(select p.*,cp.data from memocious.products p join public.memocious_catalogue_products cp on cp.id=p.id where p.active and p.customizable and p.in_stock and p.publication_state='published' and p.deleted_at is null and exists(select 1 from allowed a where cp.data->'categories' ? a.slug) order by (p.id=selected_product) desc,p.name,p.id limit 48)q;
$$;
create function memocious_private.builder_configuration(fields jsonb,step_num int) returns jsonb language plpgsql security invoker set search_path='' as $$
declare p memocious.products;chosen uuid[];delta bigint;min_price bigint;max_price bigint;choice jsonb;qt int;ct jsonb;requested date;
begin
 if jsonb_typeof(fields) is distinct from 'object' or not(fields ?& array['budgetMinPaise','budgetMaxPaise','giftTypeId','occasionId','recipient','message','productId','pricingVersion','options','quantity','requestedDate','contact']) or exists(select 1 from jsonb_object_keys(fields) k where k not in ('budgetMinPaise','budgetMaxPaise','giftTypeId','occasionId','recipient','message','productId','pricingVersion','options','quantity','requestedDate','contact')) or step_num not between 1 and 8 then raise exception 'Invalid draft shape' using errcode='22023';end if;
 if jsonb_typeof(fields->'recipient') is distinct from 'string' or jsonb_typeof(fields->'message') is distinct from 'string' or char_length(fields->>'recipient')>80 or char_length(fields->>'message')>500 then raise exception 'Invalid text' using errcode='22023';end if;
 if ((fields->>'budgetMinPaise') is null)<>((fields->>'budgetMaxPaise') is null) or ((fields->>'budgetMinPaise') is not null and (jsonb_typeof(fields->'budgetMinPaise')<>'number' or jsonb_typeof(fields->'budgetMaxPaise')<>'number' or (fields->>'budgetMinPaise')!~'^[0-9]+$' or (fields->>'budgetMaxPaise')!~'^[0-9]+$' or (fields->>'budgetMinPaise')::bigint>(fields->>'budgetMaxPaise')::bigint or (fields->>'budgetMaxPaise')::bigint>100000000)) then raise exception 'Invalid budget' using errcode='22023';end if;
 if fields->>'giftTypeId' is not null and not exists(select 1 from public.memocious_taxonomy_items where id=(fields->>'giftTypeId')::uuid and kind='category') then raise exception 'Unavailable gift type' using errcode='22023';end if;
 if fields->>'occasionId' is not null and not exists(select 1 from public.memocious_taxonomy_items where id=(fields->>'occasionId')::uuid and kind='occasion') then raise exception 'Unavailable occasion' using errcode='22023';end if;
 if (step_num>1 and fields->>'budgetMinPaise' is null) or (step_num>2 and fields->>'giftTypeId' is null) then raise exception 'Complete prior steps' using errcode='22023';end if;
 if jsonb_typeof(fields->'options') is distinct from 'array' or jsonb_array_length(fields->'options')>20 or exists(select 1 from jsonb_array_elements(fields->'options') x where jsonb_typeof(x)<>'string') then raise exception 'Invalid options' using errcode='22023';end if;
 select coalesce(array_agg(x::uuid),'{}') into chosen from jsonb_array_elements_text(fields->'options')x;
 if cardinality(chosen)<>(select count(distinct x) from unnest(chosen)x) or jsonb_typeof(fields->'quantity')<>'number' or coalesce(fields->>'quantity','')!~'^[0-9]+$' then raise exception 'Invalid quantity/options' using errcode='22023';end if;
 qt:=(fields->>'quantity')::int;if qt not between 1 and 10000 then raise exception 'Invalid quantity' using errcode='22023';end if;
 ct:=fields->'contact';
 if jsonb_typeof(ct) is distinct from 'object' or not(ct ?& array['name','phone','email','city','pincode']) or exists(select 1 from jsonb_object_keys(ct) k where k not in ('name','phone','email','city','pincode')) or exists(select 1 from jsonb_each(ct) x where jsonb_typeof(x.value)<>'string') or char_length(ct->>'name')>120 or char_length(ct->>'phone')>20 or char_length(ct->>'email')>254 or char_length(ct->>'city')>120 or ((ct->>'pincode')<>'' and (ct->>'pincode')!~'^[0-9]{6}$') then raise exception 'Invalid contact fields' using errcode='22023';end if;
 if (fields->>'productId') is null then
  if (fields->>'pricingVersion') is not null or cardinality(chosen)>0 or step_num>2 then raise exception 'Choose a current gift' using errcode='22023';end if;
  return jsonb_build_object('status','unselected','minPaise',null,'maxPaise',null,'pricingVersion',null);
 end if;
 if fields->>'giftTypeId' is null then raise exception 'Gift type required' using errcode='22023';end if;
 select * into p from memocious.products where id=(fields->>'productId')::uuid for share;
 if not found or not exists(select 1 from jsonb_array_elements(public.memocious_builder_choices((fields->>'giftTypeId')::uuid,p.id)) x where x->>'id'=p.id::text) then raise exception 'Gift unavailable for type' using errcode='22023';end if;
 if coalesce(fields->>'pricingVersion','')!~'^[0-9]+$' or p.version<>(fields->>'pricingVersion')::int then raise exception 'Pricing changed; review latest configuration' using errcode='40001';end if;
 if qt<coalesce(p.moq,1) or char_length(fields->>'message')>least(p.message_limit,500) then raise exception 'Gift limits exceeded' using errcode='22023';end if;
 if exists(select 1 from unnest(chosen)v where not exists(select 1 from memocious.option_values ov join memocious.product_options po on po.id=ov.option_id where ov.id=v and ov.active and po.active and po.product_id=p.id and po.kind in ('colour','size','addon'))) or exists(select 1 from memocious.product_options po where po.product_id=p.id and po.active and po.kind in ('colour','size','addon') and ((select count(*) from memocious.option_values v where v.option_id=po.id and v.id=any(chosen))>coalesce(po.max_count,1) or (step_num>5 and po.required and not exists(select 1 from memocious.option_values v where v.option_id=po.id and v.id=any(chosen))))) then raise exception 'Options no longer valid' using errcode='22023';end if;
 if step_num>4 and exists(select 1 from memocious.product_options po where po.product_id=p.id and po.active and po.kind='text' and po.required) and char_length(btrim(fields->>'message'))=0 then raise exception 'Personal message required' using errcode='22023';end if;
 -- Upload-dependent progress stays blocked until the separate file lifecycle is implemented.
 if step_num>6 and exists(select 1 from memocious.product_options po where po.product_id=p.id and po.active and po.kind='upload' and po.required) then raise exception 'Required photo upload is not enabled yet' using errcode='22023';end if;
 requested:=(fields->>'requestedDate')::date;
 if requested is not null and (requested<(now() at time zone 'Asia/Kolkata')::date+coalesce(p.lead_days,0) or requested>(now() at time zone 'Asia/Kolkata')::date+730) then raise exception 'Date unavailable' using errcode='22023';end if;
 if step_num=8 and (requested is null or coalesce(char_length(btrim(ct->>'name')),0)=0 or coalesce(char_length(btrim(ct->>'city')),0)=0 or coalesce(ct->>'phone','')!~'^[1-9][0-9]{6,14}$' or coalesce(ct->>'pincode','')!~'^[0-9]{6}$' or ((ct->>'email')<>'' and (ct->>'email')!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')) then raise exception 'Complete contact/date details' using errcode='22023';end if;
 select coalesce(sum(delta_paise),0) into delta from memocious.option_values where id=any(chosen);
 min_price:=(p.price_paise+delta)*qt;max_price:=(p.max_price_paise+delta)*qt;
 if min_price>1000000000000 or max_price>1000000000000 then raise exception 'Estimate exceeds supported limit' using errcode='22023';end if;
 return jsonb_build_object('status',case when min_price is null then 'quote' else 'provisional' end,'minPaise',min_price,'maxPaise',max_price,'pricingVersion',p.version);
end $$;
create function memocious_private.builder_result(d memocious.builder_drafts) returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('id',d.id,'version',d.version,'schemaVersion',d.schema_version,'step',d.current_step,'payload',d.payload,'expiresAt',d.expires_at,'updatedAt',d.updated_at,'estimate',jsonb_build_object('status',case when d.payload->>'productId' is null then 'unselected' when p.id is null or not p.active or p.deleted_at is not null or not p.in_stock or p.publication_state<>'published' or not exists(select 1 from public.memocious_catalogue_products cp where cp.id=p.id) then 'unavailable' when d.pricing_version is distinct from p.version then 'changed' when d.estimate_min_paise is null then 'quote' else 'provisional' end,'minPaise',case when p.version=d.pricing_version then d.estimate_min_paise end,'maxPaise',case when p.version=d.pricing_version then d.estimate_max_paise end,'pricingVersion',d.pricing_version))
 from (select 1) seed left join memocious.products p on p.id=nullif(d.payload->>'productId','')::uuid;
$$;
alter function public.memocious_builder_draft(uuid,text,uuid,int,int,int,jsonb) rename to memocious_builder_draft_v1;
create function public.memocious_builder_draft(sid uuid,action text default 'list',draft_id uuid default null,expected_version int default null,draft_schema int default 1,step_num int default 1,fields jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;d memocious.builder_drafts;estimate jsonb;result jsonb;
begin
 if action in ('read','list','delete') then
  result:=public.memocious_builder_draft_v1(sid,action,draft_id,expected_version,draft_schema,step_num,fields);
  if action='delete' then return result;end if;
  s:=memocious_private.assert_session(sid,'customer');
  if action='read' then select * into d from memocious.builder_drafts where id=draft_id and user_id=s.user_id;return memocious_private.builder_result(d);end if;
  return coalesce((select jsonb_agg(memocious_private.builder_result(x) order by x.updated_at desc,x.id) from (select * from memocious.builder_drafts where user_id=s.user_id and expires_at>now() and submitted_request_id is null order by updated_at desc,id limit 10)x),'[]');
 end if;
 if draft_schema=1 then return public.memocious_builder_draft_v1(sid,action,draft_id,expected_version,draft_schema,step_num,fields);end if;
 if draft_schema is distinct from 2 or action not in ('create','save') or draft_id is null then raise exception 'Unsupported draft operation' using errcode='22023';end if;
 s:=memocious_private.assert_session(sid,'customer',true);
 perform pg_advisory_xact_lock(hashtextextended('builder-owner:'||s.user_id::text,0));
 select * into d from memocious.builder_drafts where id=draft_id for update;
 if d.id is not null and (d.user_id is distinct from s.user_id or d.expires_at<=now() or d.submitted_request_id is not null) then raise exception 'Unavailable' using errcode='42501';end if;
 if action='create' and d.id is not null then
  if d.version<>1 or d.schema_version<>2 or d.payload<>fields or d.current_step<>step_num then raise exception 'Creation changed' using errcode='40001';end if;return memocious_private.builder_result(d);
 end if;
 if action='save' and (d.id is null or d.version is distinct from expected_version) then raise exception 'Draft changed' using errcode='40001';end if;
 if d.id is not null and (d.payload->>'giftTypeId' is distinct from fields->>'giftTypeId' or d.payload->>'productId' is distinct from fields->>'productId') and exists(select 1 from memocious.request_uploads u where u.draft_id=d.id and u.status<>'deleted') then raise exception 'Clear incompatible uploads first' using errcode='40001';end if;
 estimate:=memocious_private.builder_configuration(fields,step_num);
 if action='create' then
  if expected_version is distinct from 0 or (select count(*) from memocious.builder_drafts where user_id=s.user_id and expires_at>now() and submitted_request_id is null)>=10 then raise exception 'Draft limit/version' using errcode='22023';end if;
  insert into memocious.builder_drafts(id,user_id,schema_version,current_step,payload,pricing_version,estimate_min_paise,estimate_max_paise) values(draft_id,s.user_id,2,step_num,fields,(estimate->>'pricingVersion')::int,(estimate->>'minPaise')::bigint,(estimate->>'maxPaise')::bigint) returning * into d;
 else
  update memocious.builder_drafts set schema_version=2,payload=fields,current_step=step_num,pricing_version=(estimate->>'pricingVersion')::int,estimate_min_paise=(estimate->>'minPaise')::bigint,estimate_max_paise=(estimate->>'maxPaise')::bigint,version=version+1,updated_at=now() where id=draft_id returning * into d;
 end if;
 return memocious_private.builder_result(d);
end $$;
revoke execute on function public.memocious_builder_choices(uuid,uuid),public.memocious_builder_draft(uuid,text,uuid,int,int,int,jsonb),memocious_private.builder_configuration(jsonb,int),memocious_private.builder_result(memocious.builder_drafts) from public,anon,authenticated;
grant execute on function public.memocious_builder_choices(uuid,uuid),public.memocious_builder_draft(uuid,text,uuid,int,int,int,jsonb),memocious_private.builder_configuration(jsonb,int),memocious_private.builder_result(memocious.builder_drafts) to service_role;
