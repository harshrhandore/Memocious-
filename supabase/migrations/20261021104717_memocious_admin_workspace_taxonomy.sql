create function public.memocious_admin_taxonomy(sid uuid, kind text, item_id uuid, expected_version int, fields jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare tbl text; n int;
begin
 perform memocious_private.assert_admin(sid);
 perform pg_advisory_xact_lock(hashtextextended('memocious:catalogue',0));
 tbl:=case kind when 'category' then 'categories' when 'occasion' then 'occasions' else null end;
 if tbl is null or char_length(fields->>'slug')>80 or fields->>'slug'!~'^[a-z0-9]+(-[a-z0-9]+)*$' or (fields->>'sortOrder')::int not between 0 and 10000 or exists(select 1 from jsonb_object_keys(fields) k where k not in ('slug','label','parentId','sortOrder','active')) then raise exception 'Invalid taxonomy' using errcode='22023';end if;
 if item_id is null then
 execute format('insert into memocious.%I(slug,label,parent_id,sort_order,active) values($1,$2,$3,$4,$5) returning id',tbl) into item_id using fields->>'slug',fields->>'label',(fields->>'parentId')::uuid,(fields->>'sortOrder')::int,(fields->>'active')::boolean;
 else
 execute format('update memocious.%I set slug=$1,label=$2,parent_id=$3,sort_order=$4,active=$5,version=version+1,updated_at=now() where id=$6 and version=$7',tbl) using fields->>'slug',fields->>'label',(fields->>'parentId')::uuid,(fields->>'sortOrder')::int,(fields->>'active')::boolean,item_id,expected_version;
 get diagnostics n=row_count;if n<>1 then raise exception 'Version conflict' using errcode='40001';end if;
 end if;
 perform memocious_private.refresh_publication();
 insert into memocious.audit_log(actor_session_id,actor_kind,action,entity,entity_id,request_id) values(sid,'admin','taxonomy.save',kind,item_id,gen_random_uuid());
end $$;
revoke execute on function public.memocious_admin_taxonomy(uuid,text,uuid,int,jsonb) from public,anon,authenticated;grant execute on function public.memocious_admin_taxonomy(uuid,text,uuid,int,jsonb) to service_role;
