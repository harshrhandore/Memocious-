create function memocious_private.enquiry_hash(product uuid,qty int,selected uuid[],personal_message text,budget_paise bigint,occasion text,pincode text) returns text language sql immutable security invoker set search_path='' as $$ select encode(sha256(convert_to(jsonb_build_object('product',product,'qty',qty,'options',(select coalesce(jsonb_agg(v order by v),'[]') from unnest(selected) v),'message',personal_message,'budget',budget_paise,'occasion',occasion,'pincode',pincode)::text,'UTF8')),'hex'); $$;
create function public.memocious_enquiry_replay(sid uuid,request_key uuid,product uuid,qty int,selected uuid[],personal_message text,budget_paise bigint,occasion text,pincode text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare prior memocious.idempotency_keys; s memocious_private.app_sessions;
begin
 s:=memocious_private.assert_session(sid);
 if s.audience not in ('customer','guest') then raise exception 'Access unavailable' using errcode='42501';end if;
 select * into prior from memocious.idempotency_keys where actor_session_id=sid and operation='enquiry' and key=request_key;
 if not found then return null;end if;
 if prior.payload_hash<>memocious_private.enquiry_hash(product,qty,selected,personal_message,budget_paise,occasion,pincode) or prior.expires_at<=now() then raise exception 'Submission conflict' using errcode='40001';end if;
 return prior.result;
end $$;
revoke execute on function public.memocious_enquiry_replay(uuid,uuid,uuid,int,uuid[],text,bigint,text,text) from public,anon,authenticated;
grant execute on function public.memocious_enquiry_replay(uuid,uuid,uuid,int,uuid[],text,bigint,text,text) to service_role;
revoke execute on function memocious_private.enquiry_hash(uuid,int,uuid[],text,bigint,text,text) from public,anon,authenticated;
grant execute on function memocious_private.enquiry_hash(uuid,int,uuid[],text,bigint,text,text) to service_role;
