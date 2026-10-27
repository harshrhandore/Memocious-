-- Private builder uploads: bounded ingress, immutable random paths, one-use DB tickets.
alter table memocious.upload_tickets add column parent_version int not null default 0;
alter table memocious.request_uploads add column quarantine_deleted_at timestamptz;
create unique index builder_upload_job_unique on memocious.upload_jobs(upload_id);
create function public.memocious_builder_file_begin(sid uuid,draft uuid,expected_version int,bytes int,declared_mime text) returns uuid language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;d memocious.builder_drafts;uid uuid:=gen_random_uuid();n int;total bigint;
begin
 s:=memocious_private.assert_session(sid,'customer',true);
 perform pg_advisory_xact_lock(hashtextextended('builder-owner:'||s.user_id::text,0));
 select * into d from memocious.builder_drafts where id=draft for update;
 if not found or d.user_id is distinct from s.user_id or d.expires_at<=now() or d.submitted_request_id is not null then raise exception 'Draft unavailable' using errcode='42501';end if;
 if d.version is distinct from expected_version or d.schema_version<>2 or d.payload->>'productId' is null then raise exception 'Save current configuration first' using errcode='40001';end if;
 perform memocious_private.builder_configuration(d.payload,least(d.current_step,6),(select count(*)::int from memocious.request_uploads where draft_id=d.id and user_id=s.user_id and status='ready_private'));
 if bytes is null or bytes not between 1 and 2097152 or declared_mime not in ('image/jpeg','image/png','image/webp') then raise exception 'Invalid image' using errcode='22023';end if;
 select count(*),coalesce(sum(size_bytes),0) into n,total from memocious.request_uploads where user_id=s.user_id and status<>'deleted';
 if n>=100 or total+bytes>104857600 or (select count(*) from memocious.request_uploads where user_id=s.user_id and created_at>now()-interval '1 day')>=20 or (select count(*) from memocious.request_uploads where draft_id=d.id and (status in ('processing','ready_private') or (status='issued' and expires_at>now())))>=5 or (select coalesce(sum(size_bytes),0) from memocious.request_uploads where draft_id=d.id and status<>'deleted')+bytes>26214400 then raise exception 'Upload quota reached' using errcode='54000';end if;
 insert into memocious.request_uploads(id,user_id,draft_id,object_path,mime,size_bytes,expires_at) values(uid,s.user_id,d.id,'builder/'||uid||'.webp',declared_mime,bytes,now()+interval '15 minutes');
 insert into memocious.upload_tickets(upload_id,session_id,object_path,reserved_bytes,expires_at,parent_version) values(uid,sid,'builder/'||uid,bytes,now()+interval '15 minutes',d.version);
 insert into memocious.upload_jobs(upload_id) values(uid);
 return uid;
end $$;
create function public.memocious_builder_file(sid uuid,file_id uuid,action text,details jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;u memocious.request_uploads;d memocious.builder_drafts;t memocious.upload_tickets;j memocious.upload_jobs;admin_id uuid;
begin
 s:=memocious_private.assert_session(sid,null,action<>'read');
 if s.audience='admin' then admin_id:=memocious_private.assert_admin(sid,true);elsif s.audience<>'customer' then raise exception 'Unavailable' using errcode='42501';end if;
 select * into u from memocious.request_uploads where id=file_id;
 if not found or u.object_path<>'builder/'||u.id||'.webp' or (admin_id is null and u.user_id is distinct from s.user_id) then raise exception 'Unavailable' using errcode='42501';end if;
 if action<>'read' then
  if admin_id is not null or u.draft_id is null then raise exception 'Unavailable' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended('builder-owner:'||s.user_id::text,0));
 end if;
 if u.draft_id is not null then select * into d from memocious.builder_drafts where id=u.draft_id for update;end if;
 select * into u from memocious.request_uploads where id=file_id for update;
 if action='read' then
  if u.status not in ('ready_private','attached') or (u.draft_id is not null and (d.id is null or d.expires_at<=now() or d.submitted_request_id is not null)) or (u.custom_request_id is not null and not exists(select 1 from memocious.custom_requests r where r.id=u.custom_request_id and (admin_id is not null or r.user_id=s.user_id) and (r.status not in ('closed','cancelled') or r.updated_at>now()-interval '90 days'))) then raise exception 'Unavailable' using errcode='42501';end if;
  return jsonb_build_object('path',u.object_path,'bytes',u.size_bytes,'width',u.width,'height',u.height);
 end if;
 if d.id is null or d.user_id is distinct from s.user_id or d.submitted_request_id is not null then raise exception 'Unavailable' using errcode='42501';end if;
 select * into t from memocious.upload_tickets where upload_id=u.id for update;
 select * into j from memocious.upload_jobs where upload_id=u.id for update;
 if action='remove' then
  if u.status in ('deleted','deleting') then return jsonb_build_object('version',d.version);end if;
  if d.version is distinct from (details->>'version')::int then raise exception 'Draft changed' using errcode='40001';end if;
  update memocious.request_uploads set status='deleting',updated_at=now() where id=u.id;
  update memocious.upload_tickets set status='expired' where upload_id=u.id;
  update memocious.upload_jobs set status='dead',failure_code='removed' where upload_id=u.id and status<>'done';
  update memocious.builder_drafts set version=version+1,updated_at=now() where id=d.id returning * into d;
 elsif action='reject' then
  update memocious.request_uploads set status='rejected',updated_at=now() where id=u.id and status in ('issued','processing');
  update memocious.upload_tickets set status='expired' where upload_id=u.id;
  update memocious.upload_jobs set status='dead',failure_code='processing-failed' where upload_id=u.id and status<>'done';
 elsif action='quarantine-removed' then
  update memocious.request_uploads set quarantine_deleted_at=now() where id=u.id and status='ready_private';
 elsif action='claim' then
  if d.expires_at<=now() or t.id is null or t.status<>'issued' or t.expires_at<=now() or u.status<>'issued' or d.version<>t.parent_version then raise exception 'Expired, changed or consumed ticket' using errcode='40001';end if;
  update memocious.upload_tickets set status='consumed',consumed_at=now() where upload_id=u.id;
  update memocious.request_uploads set status='processing',updated_at=now() where id=u.id;
  update memocious.upload_jobs set status='leased',attempts=attempts+1,lease_until=now()+interval '2 minutes' where upload_id=u.id;
 elsif action='ready' then
  if u.status='ready_private' and u.content_hash=details->>'digest' then return jsonb_build_object('id',u.id,'version',d.version);end if;
  if d.expires_at<=now() or u.status<>'processing' or j.status<>'leased' or j.lease_until<=now() or d.version<>t.parent_version then raise exception 'Upload parent changed' using errcode='40001';end if;
  if coalesce((details->>'width')::int,0) not between 1 and 2048 or coalesce((details->>'height')::int,0) not between 1 and 2048 or coalesce((details->>'bytes')::int,0) not between 1 and 2097152 or coalesce(details->>'digest','')!~'^[a-f0-9]{64}$' then raise exception 'Invalid normalized output' using errcode='22023';end if;
  update memocious.request_uploads set status='ready_private',mime='image/webp',size_bytes=(details->>'bytes')::int,width=(details->>'width')::int,height=(details->>'height')::int,content_hash=details->>'digest',expires_at=d.expires_at,updated_at=now() where id=u.id;
  update memocious.upload_jobs set status='done',ready_path=u.object_path,lease_until=null where upload_id=u.id;
  update memocious.builder_drafts set version=version+1,updated_at=now() where id=d.id returning * into d;
 else raise exception 'Invalid operation' using errcode='22023';end if;
 return jsonb_build_object('id',u.id,'path',u.object_path,'quarantine',t.object_path,'bytes',t.reserved_bytes,'mime',u.mime,'version',d.version);
end $$;
create function public.memocious_builder_file_cleanup(file_id uuid default null,finished boolean default false,quarantine_only boolean default false) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if file_id is not null and finished then
  if quarantine_only then update memocious.request_uploads set quarantine_deleted_at=now() where id=file_id and object_path='builder/'||id||'.webp';
  else update memocious.request_uploads set status='deleted',quarantine_deleted_at=now(),updated_at=now() where id=file_id and status='deleting' and object_path='builder/'||id||'.webp';end if;
 end if;
 update memocious.request_uploads u set status='deleting',updated_at=now() where u.object_path='builder/'||u.id||'.webp' and u.status not in ('deleting','deleted') and (
 (u.status in ('issued','processing','rejected','expired') and u.expires_at<now()-interval '1 day') or
 exists(select 1 from memocious.builder_drafts d where d.id=u.draft_id and d.expires_at<=now() and d.submitted_request_id is null) or
 exists(select 1 from memocious.custom_requests r where r.id=u.custom_request_id and r.status in ('closed','cancelled') and r.updated_at<now()-interval '90 days'));
 return coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'path',q.object_path,'quarantine','builder/'||q.id,'quarantineOnly',q.status<>'deleting')) from(
 select * from memocious.request_uploads where object_path='builder/'||id||'.webp' and ((status='deleting' and updated_at<now()-interval '1 day') or (status in ('ready_private','attached') and quarantine_deleted_at is null)) order by updated_at,id limit 100)q),'[]');
end $$;

drop function memocious_private.builder_configuration(jsonb,int);
create function memocious_private.builder_configuration(fields jsonb,step_num int,ready_files int default 0) returns jsonb language plpgsql security invoker set search_path='' as $$
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
 if step_num>6 and ready_files<1 and exists(select 1 from memocious.product_options po where po.product_id=p.id and po.active and po.kind='upload' and po.required) then raise exception 'Add a ready private reference photo' using errcode='22023';end if;
 requested:=(fields->>'requestedDate')::date;
 if requested is not null and (requested<(now() at time zone 'Asia/Kolkata')::date+coalesce(p.lead_days,0) or requested>(now() at time zone 'Asia/Kolkata')::date+730) then raise exception 'Date unavailable' using errcode='22023';end if;
 if step_num=8 and (requested is null or coalesce(char_length(btrim(ct->>'name')),0)=0 or coalesce(char_length(btrim(ct->>'city')),0)=0 or coalesce(ct->>'phone','')!~'^[1-9][0-9]{6,14}$' or coalesce(ct->>'pincode','')!~'^[0-9]{6}$' or ((ct->>'email')<>'' and (ct->>'email')!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')) then raise exception 'Complete contact/date details' using errcode='22023';end if;
 select coalesce(sum(delta_paise),0) into delta from memocious.option_values where id=any(chosen);
 min_price:=(p.price_paise+delta)*qt;max_price:=(p.max_price_paise+delta)*qt;
 if min_price>1000000000000 or max_price>1000000000000 then raise exception 'Estimate exceeds supported limit' using errcode='22023';end if;
 return jsonb_build_object('status',case when min_price is null then 'quote' else 'provisional' end,'minPaise',min_price,'maxPaise',max_price,'pricingVersion',p.version);
end $$;
create or replace function memocious_private.builder_result(d memocious.builder_drafts) returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('id',d.id,'version',d.version,'schemaVersion',d.schema_version,'step',d.current_step,'payload',d.payload,'expiresAt',d.expires_at,'updatedAt',d.updated_at,'files',(select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'status',u.status,'bytes',u.size_bytes,'width',u.width,'height',u.height) order by u.created_at,u.id),'[]') from memocious.request_uploads u where u.draft_id=d.id and u.user_id=d.user_id and u.object_path='builder/'||u.id||'.webp' and u.status not in ('deleted','deleting','rejected','expired')),'estimate',jsonb_build_object('status',case when d.payload->>'productId' is null then 'unselected' when p.id is null or not p.active or p.deleted_at is not null or not p.in_stock or p.publication_state<>'published' or not exists(select 1 from public.memocious_catalogue_products cp where cp.id=p.id) then 'unavailable' when d.pricing_version is distinct from p.version then 'changed' when d.estimate_min_paise is null then 'quote' else 'provisional' end,'minPaise',case when p.version=d.pricing_version then d.estimate_min_paise end,'maxPaise',case when p.version=d.pricing_version then d.estimate_max_paise end,'pricingVersion',d.pricing_version))
 from (select 1) seed left join memocious.products p on p.id=nullif(d.payload->>'productId','')::uuid;
$$;
create or replace function public.memocious_builder_draft(sid uuid,action text default 'list',draft_id uuid default null,expected_version int default null,draft_schema int default 1,step_num int default 1,fields jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;d memocious.builder_drafts;estimate jsonb;result jsonb;
begin
 if action='delete' then
  s:=memocious_private.assert_session(sid,'customer',true);
  perform pg_advisory_xact_lock(hashtextextended('builder-owner:'||s.user_id::text,0));
  select * into d from memocious.builder_drafts where id=draft_id for update;
  if not found then return jsonb_build_object('deleted',true);end if;
  if d.user_id is distinct from s.user_id or d.submitted_request_id is not null then raise exception 'Unavailable' using errcode='42501';end if;
  if d.expires_at>now() and d.version is distinct from expected_version then raise exception 'Draft changed' using errcode='40001';end if;
  if exists(select 1 from memocious.request_uploads where memocious.request_uploads.draft_id=d.id) then
   update memocious.builder_drafts set expires_at=least(expires_at,now()),version=version+1,updated_at=now() where id=d.id;
   update memocious.request_uploads set status='deleting',updated_at=now() where memocious.request_uploads.draft_id=d.id and status not in ('deleted','deleting');
   return jsonb_build_object('deleted',true,'cleanupPending',true);
  end if;
  delete from memocious.builder_drafts where id=d.id;return jsonb_build_object('deleted',true);
 end if;
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
 if d.id is not null and (d.payload->>'giftTypeId' is distinct from fields->>'giftTypeId' or d.payload->>'productId' is distinct from fields->>'productId') and exists(select 1 from memocious.request_uploads u where u.draft_id=d.id and u.status not in ('deleted','deleting','rejected','expired')) then raise exception 'Clear incompatible uploads first' using errcode='40001';end if;
 estimate:=memocious_private.builder_configuration(fields,step_num,(select count(*)::int from memocious.request_uploads u where u.draft_id=d.id and u.user_id=s.user_id and u.status='ready_private'));
 if action='create' then
  if expected_version is distinct from 0 or (select count(*) from memocious.builder_drafts where user_id=s.user_id and expires_at>now() and submitted_request_id is null)>=10 then raise exception 'Draft limit/version' using errcode='22023';end if;
  insert into memocious.builder_drafts(id,user_id,schema_version,current_step,payload,pricing_version,estimate_min_paise,estimate_max_paise) values(draft_id,s.user_id,2,step_num,fields,(estimate->>'pricingVersion')::int,(estimate->>'minPaise')::bigint,(estimate->>'maxPaise')::bigint) returning * into d;
 else
  update memocious.builder_drafts set schema_version=2,payload=fields,current_step=step_num,pricing_version=(estimate->>'pricingVersion')::int,estimate_min_paise=(estimate->>'minPaise')::bigint,estimate_max_paise=(estimate->>'maxPaise')::bigint,version=version+1,updated_at=now() where id=draft_id returning * into d;
 end if;
 return memocious_private.builder_result(d);
end $$;
create or replace function public.memocious_builder_cleanup() returns jsonb language plpgsql security invoker set search_path='' as $$
declare ids uuid[];n int;
begin
 select array_agg(x.id) into ids from(select d.id from memocious.builder_drafts d where d.expires_at<=now() and d.submitted_request_id is null and not exists(select 1 from memocious.custom_requests r where r.draft_id=d.id) and not exists(select 1 from memocious.request_uploads u where u.draft_id=d.id and u.status<>'deleted') order by d.expires_at,d.id limit 100 for update skip locked)x;
 delete from memocious.upload_jobs where upload_id in(select id from memocious.request_uploads where draft_id=any(ids));
 delete from memocious.upload_tickets where upload_id in(select id from memocious.request_uploads where draft_id=any(ids));
 delete from memocious.request_uploads where draft_id=any(ids);
 delete from memocious.builder_drafts where id=any(ids);
 get diagnostics n=ROW_COUNT;
 return jsonb_build_object('operation','builder-draft-cleanup','processed',n);
end $$;
revoke execute on function public.memocious_builder_file_begin(uuid,uuid,int,int,text),public.memocious_builder_file(uuid,uuid,text,jsonb),public.memocious_builder_file_cleanup(uuid,boolean,boolean),memocious_private.builder_configuration(jsonb,int,int) from public,anon,authenticated;
grant execute on function public.memocious_builder_file_begin(uuid,uuid,int,int,text),public.memocious_builder_file(uuid,uuid,text,jsonb),public.memocious_builder_file_cleanup(uuid,boolean,boolean),memocious_private.builder_configuration(jsonb,int,int) to service_role;
