-- Phase 3 increment 1: only owned draft persistence. No uploads/estimates/submission yet.
create function public.memocious_builder_draft(sid uuid, action text default 'list', draft_id uuid default null, expected_version int default null, draft_schema int default 1, step_num int default 1, fields jsonb default '{}')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;d memocious.builder_drafts;out jsonb;
begin
 s:=memocious_private.assert_session(sid,'customer',action in ('create','save','delete'));
 if action='list' then
  return coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'version',x.version,'schemaVersion',x.schema_version,'step',x.current_step,'payload',x.payload,'expiresAt',x.expires_at,'updatedAt',x.updated_at) order by x.updated_at desc,x.id)
   from(select * from memocious.builder_drafts where user_id=s.user_id and expires_at>now() and submitted_request_id is null order by updated_at desc,id limit 10)x),'[]');
 end if;
 if action not in ('read','create','save','delete') or draft_id is null then raise exception 'Invalid action' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('builder-owner:'||s.user_id::text,0));
 select * into d from memocious.builder_drafts where id=draft_id for update;
 if d.id is not null and (d.user_id is distinct from s.user_id or d.expires_at<=now() or d.submitted_request_id is not null) then raise exception 'Draft unavailable' using errcode='42501';end if;
 if action='delete' and d.id is null then return jsonb_build_object('deleted',true);end if;
 if action in ('read','save') and d.id is null then raise exception 'Draft unavailable' using errcode='42501';end if;
 if action in ('save','delete') and d.version is distinct from expected_version then raise exception 'Draft changed' using errcode='40001';end if;
 if action in ('create','save') then
  if draft_schema is distinct from 1 or step_num is null or step_num not between 1 and 4 or jsonb_typeof(fields) is distinct from 'object' or
   exists(select 1 from jsonb_object_keys(fields) k where k not in ('budgetMinPaise','budgetMaxPaise','giftTypeId','occasionId','recipient','message')) or
   not(fields ?& array['budgetMinPaise','budgetMaxPaise','giftTypeId','occasionId','recipient','message']) or
   jsonb_typeof(fields->'recipient') is distinct from 'string' or jsonb_typeof(fields->'message') is distinct from 'string' or char_length(fields->>'recipient')>80 or char_length(fields->>'message')>500 then raise exception 'Invalid draft payload' using errcode='22023';end if;
  if ((fields->>'budgetMinPaise') is null)<>((fields->>'budgetMaxPaise') is null) or
   ((fields->>'budgetMinPaise') is not null and (jsonb_typeof(fields->'budgetMinPaise')<>'number' or jsonb_typeof(fields->'budgetMaxPaise')<>'number' or (fields->>'budgetMinPaise')!~'^[0-9]+$' or (fields->>'budgetMaxPaise')!~'^[0-9]+$' or (fields->>'budgetMinPaise')::bigint>(fields->>'budgetMaxPaise')::bigint or (fields->>'budgetMaxPaise')::bigint>100000000)) then raise exception 'Invalid budget range' using errcode='22023';end if;
  if fields->>'giftTypeId' is not null and not exists(select 1 from public.memocious_taxonomy_items where id=(fields->>'giftTypeId')::uuid and kind='category') then raise exception 'Gift type unavailable' using errcode='22023';end if;
  if fields->>'occasionId' is not null and not exists(select 1 from public.memocious_taxonomy_items where id=(fields->>'occasionId')::uuid and kind='occasion') then raise exception 'Occasion unavailable' using errcode='22023';end if;
  if (step_num>1 and fields->>'budgetMinPaise' is null) or (step_num>2 and fields->>'giftTypeId' is null) then raise exception 'Complete earlier steps first' using errcode='22023';end if;
  if action='create' and d.id is not null then
   if d.version<>1 or d.payload<>fields or d.current_step<>step_num or d.schema_version<>draft_schema then raise exception 'Creation changed' using errcode='40001';end if;
  elsif action='create' then
   if expected_version is distinct from 0 or (select count(*) from memocious.builder_drafts where user_id=s.user_id and expires_at>now() and submitted_request_id is null)>=10 then raise exception 'Draft limit or version' using errcode='22023';end if;
   insert into memocious.builder_drafts(id,user_id,schema_version,current_step,payload) values(draft_id,s.user_id,draft_schema,step_num,fields) returning * into d;
  else
   if d.schema_version<>draft_schema then raise exception 'Unsupported draft schema' using errcode='40001';end if;
   update memocious.builder_drafts set payload=fields,current_step=step_num,version=version+1,updated_at=now() where id=d.id returning * into d;
  end if;
 elsif action='delete' then
  -- Never silently orphan uploads once that prerequisite is activated.
  if exists(select 1 from memocious.request_uploads where memocious.request_uploads.draft_id=d.id and status<>'deleted') then raise exception 'File cleanup required' using errcode='40001';end if;
  delete from memocious.builder_drafts where id=d.id;
  return jsonb_build_object('deleted',true);
 end if;
 return jsonb_build_object('id',d.id,'version',d.version,'schemaVersion',d.schema_version,'step',d.current_step,'payload',d.payload,'expiresAt',d.expires_at,'updatedAt',d.updated_at);
end $$;
revoke execute on function public.memocious_builder_draft(uuid,text,uuid,int,int,int,jsonb) from public,anon,authenticated;
grant execute on function public.memocious_builder_draft(uuid,text,uuid,int,int,int,jsonb) to service_role;

create function public.memocious_builder_cleanup() returns jsonb language plpgsql security invoker set search_path='' as $$
declare n int;
begin
 with candidates as (select d.id from memocious.builder_drafts d where d.expires_at<=now() and d.submitted_request_id is null
 and not exists(select 1 from memocious.custom_requests r where r.draft_id=d.id)
 and not exists(select 1 from memocious.request_uploads u where u.draft_id=d.id)
 order by d.expires_at,d.id limit 100 for update skip locked)
 delete from memocious.builder_drafts where id in(select id from candidates);
 get diagnostics n=ROW_COUNT;
 return jsonb_build_object('operation','builder-draft-cleanup','processed',n);
end $$;
revoke execute on function public.memocious_builder_cleanup() from public,anon,authenticated;
grant execute on function public.memocious_builder_cleanup() to service_role;

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
