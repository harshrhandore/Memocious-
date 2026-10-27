-- Read-only owner audit projection; raw stored diffs and session/credential data never cross this boundary.
create index audit_recent_lookup on memocious.audit_log(created_at desc,id desc);
create index audit_entity_lookup on memocious.audit_log(entity_id,created_at desc,id desc) where entity_id is not null;
create index audit_request_lookup on memocious.audit_log(request_id,created_at desc,id desc);
create function memocious_private.audit_entry(a memocious.audit_log) returns jsonb language sql stable security invoker set search_path='' as $$
 with safe as(select
  case when jsonb_typeof(a.redacted_diff->'version')='number' and (a.redacted_diff->>'version')~'^[0-9]{1,9}$' then jsonb_build_object('version',a.redacted_diff->'version') else '{}'::jsonb end ||
  case when jsonb_typeof(a.redacted_diff->'count')='number' and (a.redacted_diff->>'count')~'^[0-9]{1,9}$' then jsonb_build_object('count',a.redacted_diff->'count') else '{}'::jsonb end ||
  case when jsonb_typeof(a.redacted_diff->'configured')='boolean' then jsonb_build_object('configured',a.redacted_diff->'configured') else '{}'::jsonb end as metadata)
 select jsonb_build_object('id',a.id,'at',a.created_at,'actorKind',a.actor_kind,'action',case when a.action~'^[a-z][a-z0-9_.-]{0,63}$' then a.action else 'other' end,'entity',case when a.entity~'^[a-z][a-z0-9_.-]{0,31}$' then a.entity else 'other' end,'entityId',case when a.entity='session' then null else a.entity_id end,'requestId',a.request_id,'metadata',safe.metadata,'withheld',a.redacted_diff<>safe.metadata) from safe;
$$;
create function public.memocious_owner_audit(sid uuid,from_day date default null,to_day date default null,action_prefix text default '',entity_filter text default '',entity_key uuid default null,request_key uuid default null,cursor_at timestamptz default null,cursor_id uuid default null,as_of timestamptz default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor uuid;lo date;hi date;snapshot_time timestamptz;rows_json jsonb;
begin
 actor:=memocious_private.assert_admin(sid,true,true);
 hi:=coalesce(to_day,(now() at time zone 'Asia/Kolkata')::date);lo:=coalesce(from_day,hi-29);snapshot_time:=coalesce(as_of,now());
 if lo>hi or hi-lo>89 or coalesce(action_prefix,'')!~'^[a-z0-9_.-]{0,64}$' or coalesce(entity_filter,'')!~'^[a-z0-9_.-]{0,32}$' or (cursor_at is null)<>(cursor_id is null) or (cursor_at is not null and as_of is null) or snapshot_time>now() or (cursor_at is not null and cursor_at>snapshot_time) then raise exception 'Invalid audit query' using errcode='22023';end if;
 select coalesce(jsonb_agg(memocious_private.audit_entry(x) order by x.created_at desc,x.id desc),'[]') into rows_json from(
  select a.* from memocious.audit_log a where a.created_at>=lo::timestamp at time zone 'Asia/Kolkata' and a.created_at<(hi+1)::timestamp at time zone 'Asia/Kolkata' and a.created_at<=snapshot_time
   and (coalesce(action_prefix,'')='' or starts_with(a.action,action_prefix)) and (coalesce(entity_filter,'')='' or a.entity=entity_filter)
   and (entity_key is null or a.entity_id=entity_key) and (request_key is null or a.request_id=request_key)
   and (cursor_at is null or (a.created_at,a.id)<(cursor_at,cursor_id)) order by a.created_at desc,a.id desc limit 51)x;
 return jsonb_build_object('asOf',snapshot_time,'from',lo,'to',hi,'records',rows_json - case when jsonb_array_length(rows_json)=51 then 50 else 51 end,'hasMore',jsonb_array_length(rows_json)>50,'nextCursor',case when jsonb_array_length(rows_json)>50 then jsonb_build_object('at',rows_json->49->>'at','id',rows_json->49->>'id') end);
end $$;
revoke execute on function memocious_private.audit_entry(memocious.audit_log),public.memocious_owner_audit(uuid,date,date,text,text,uuid,uuid,timestamptz,uuid,timestamptz) from public,anon,authenticated;
grant execute on function memocious_private.audit_entry(memocious.audit_log),public.memocious_owner_audit(uuid,date,date,text,text,uuid,uuid,timestamptz,uuid,timestamptz) to service_role;
