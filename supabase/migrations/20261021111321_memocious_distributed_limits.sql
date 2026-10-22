-- Atomic shared-store alternative to Redis, supported by the selected Postgres deployment.
create table memocious_private.rate_buckets(operation text not null,scope text not null check(scope in ('ip','actor','global')),subject_hash text not null,hits int not null check(hits>0),expires_at timestamptz not null,primary key(operation,scope,subject_hash));
alter table memocious_private.rate_buckets enable row level security;
revoke all on memocious_private.rate_buckets from public,anon,authenticated;
grant select,insert,update,delete on memocious_private.rate_buckets to service_role;
create index rate_expiry_idx on memocious_private.rate_buckets(expires_at);
create function public.memocious_rate_limit(operation_name text,ip_hash text,actor_hash text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare seconds int[];limits int[];subjects text[];scopes text[]:=array['ip','actor','global'];i int;n int;expiry timestamptz;allowed boolean:=true;retry int:=0;
begin
 if operation_name not in ('auth','enquiry','profile','admin-product','admin-taxonomy','admin-settings','admin-delete','admin-upload','admin-upload-bytes','admin-media') or ip_hash!~'^[a-f0-9]{64}$' or actor_hash!~'^[a-f0-9]{64}$' then raise exception 'Invalid protection request' using errcode='22023';end if;
 seconds:=case operation_name when 'auth' then array[60,3600,3600] when 'enquiry' then array[600,86400,3600] when 'admin-upload' then array[60,3600,3600] else array[60,60,3600] end;
 limits:=case operation_name when 'auth' then array[5,10,1000] when 'enquiry' then array[5,20,1000] when 'admin-upload' then array[60,10,1000] else array[60,30,1000] end;
 subjects:=array[ip_hash,actor_hash,'global'];
 -- All calls take row locks in the same order; an UPSERT never loses concurrent increments.
 for i in 1..3 loop
 insert into memocious_private.rate_buckets(operation,scope,subject_hash,hits,expires_at) values(operation_name,scopes[i],subjects[i],1,now()+make_interval(secs=>seconds[i]))
 on conflict(operation,scope,subject_hash) do update set hits=case when rate_buckets.expires_at<=now() then 1 else least(rate_buckets.hits+1,1000000) end,expires_at=case when rate_buckets.expires_at<=now() then now()+make_interval(secs=>seconds[i]) else rate_buckets.expires_at end returning hits,expires_at into n,expiry;
 if n>limits[i] then allowed:=false;retry:=greatest(retry,ceil(extract(epoch from expiry-now()))::int);end if;
 end loop;
 delete from memocious_private.rate_buckets where ctid in(select ctid from memocious_private.rate_buckets where expires_at<now()-interval '1 day' limit 100);
 return jsonb_build_object('allowed',allowed,'retryAfter',greatest(retry,1));
end $$;
revoke execute on function public.memocious_rate_limit(text,text,text) from public,anon,authenticated;
grant execute on function public.memocious_rate_limit(text,text,text) to service_role;
