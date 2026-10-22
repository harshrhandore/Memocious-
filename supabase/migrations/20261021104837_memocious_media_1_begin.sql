create function public.memocious_media_begin(sid uuid, product uuid, bytes int, alt_text text) returns uuid language plpgsql security invoker set search_path='' as $$
declare actor uuid; jid uuid;
begin
 actor:=memocious_private.assert_admin(sid);perform pg_advisory_xact_lock(hashtextextended('memocious:media:quota',0));
 if bytes not between 1 and 2097152 or char_length(alt_text) not between 1 and 300 or not exists(select 1 from memocious.products where id=product and deleted_at is null) then raise exception 'Invalid upload' using errcode='22023';end if;
 if (select count(*) from memocious_private.product_media_jobs where user_id=actor and created_at>now()-interval '1 hour')>=10 or (select coalesce(sum(reserved_bytes),0) from memocious_private.product_media_jobs where created_at>now()-interval '1 day')+bytes>104857600 or (select count(*) from memocious.product_images where product_id=product)+(select count(*) from memocious_private.product_media_jobs where product_id=product and status in ('issued','processing','ready') and expires_at>now())>=10 then raise exception 'Upload quota reached' using errcode='54000';end if;
 insert into memocious_private.product_media_jobs(product_id,session_id,user_id,reserved_bytes,alt) values(product,sid,actor,bytes,alt_text) returning id into jid;return jid;
end $$;
revoke execute on function public.memocious_media_begin(uuid,uuid,int,text) from public,anon,authenticated;grant execute on function public.memocious_media_begin(uuid,uuid,int,text) to service_role;
