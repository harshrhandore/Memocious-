-- Run only on the owned, empty Memocious staging project. All fixtures roll back.
begin;
do $$
declare x record; v_guest uuid; v_product uuid:=gen_random_uuid(); req uuid:=gen_random_uuid(); r1 jsonb; r2 jsonb; failed boolean; count_before bigint;
begin
 for x in select n.nspname,c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('memocious','memocious_private') and c.relkind='r' loop
 if not x.relrowsecurity then raise exception 'RLS missing';end if;
 if has_table_privilege('anon',format('%I.%I',x.nspname,x.relname),'SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated',format('%I.%I',x.nspname,x.relname),'SELECT,INSERT,UPDATE,DELETE') then raise exception 'Private grants exposed';end if;end loop;
 for x in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'memocious_%' and p.proname not in ('memocious_catalogue','memocious_product','memocious_taxonomy','memocious_public_settings','memocious_reviews') loop
 if has_function_privilege('anon',x.oid,'EXECUTE') or has_function_privilege('authenticated',x.oid,'EXECUTE') then raise exception 'Mutation execution exposed';end if;end loop;
 execute 'set local role anon';
 perform public.memocious_taxonomy(); perform public.memocious_catalogue('{}');
 failed:=false;begin perform public.memocious_session_open(repeat('a',64),repeat('b',64),null,'guest',null,'1');exception when insufficient_privilege then failed:=true;end;
 if not failed then raise exception 'Anon session mutation succeeded';end if;
 execute 'reset role';
 execute 'set local role authenticated';
 failed:=false;begin perform 1 from memocious_private.app_sessions;exception when insufficient_privilege then failed:=true;end;
 if not failed then raise exception 'Private sessions exposed';end if;
 failed:=false;begin insert into public.memocious_catalogue_products(id,slug,data,search_vector,featured,created_at) values(gen_random_uuid(),'attack','{}',''::tsvector,false,now());exception when insufficient_privilege then failed:=true;end;
 if not failed then raise exception 'Direct catalogue write succeeded';end if;
 execute 'reset role';
 v_guest:=public.memocious_session_open(repeat('a',64),repeat('b',64),null,'guest',null,'1');
 if public.memocious_session_open(repeat('a',64),repeat('b',64),null,'guest',null,'1')<>v_guest then raise exception 'Duplicate guest scope';end if;
 failed:=false;begin perform public.memocious_admin_product(v_guest,null,1,'create','{"slug":"attack","name":"Attack"}');exception when insufficient_privilege or invalid_authorization_specification then failed:=true;end;
 if not failed then raise exception 'Guest admin mutation succeeded';end if;
 failed:=false;begin perform public.memocious_enquiry(v_guest,req,v_product,1,'{}','',null,'','');exception when others then failed:=true;end;
 if not failed then raise exception 'Missing number accepted enquiry';end if;
 update memocious.site_settings set value='"447700900123"' where key='whatsapp_number'; -- UK reserved drama/test range; never sent.
 update memocious.site_settings set value='true' where key='policies_approved';
 insert into memocious.products(id,slug,name,price_paise,active,publication_state) values(v_product,'transaction-test','Transaction fixture',0,true,'published');
 insert into memocious.product_images(product_id,public_path,alt,sanitized_at,published_at) values(v_product,'/media/test.webp','SQL test fixture',now(),now());
 insert into memocious.product_categories(product_id,category_id) select v_product,id from memocious.categories where slug='gift-hampers';
 perform memocious_private.refresh_publication();
 r1:=public.memocious_enquiry(v_guest,req,v_product,1,'{}','test',null,'Birthday','400001');
 r2:=public.memocious_enquiry(v_guest,req,v_product,1,'{}','test',null,'Birthday','400001');
 if r1<>r2 or r1->>'code' !~ '^GFT-[0-9]{4}-[0-9]{6,}-[0-9A-HJKMNP-TV-Z]{12}$' or (r1->>'estimatePaise')::bigint<>0 then raise exception 'Replay/code/zero price invariant failed';end if;
 if (select count(*) from memocious.orders where code=r1->>'code')<>1 or (select count(*) from memocious.order_items where product_id=v_product)<>1 then raise exception 'Duplicate enquiry';end if;
 failed:=false;begin perform public.memocious_enquiry(v_guest,req,v_product,2,'{}','changed',null,'Birthday','400001');exception when serialization_failure then failed:=true;end;
 if not failed then raise exception 'Changed replay accepted';end if;
 failed:=false;begin perform public.memocious_enquiry(v_guest,gen_random_uuid(),v_product,-1,'{}','',null,'','');exception when others then failed:=true;end;
 if not failed then raise exception 'Negative quantity accepted';end if;
 update memocious.products set active=false where id=v_product;
 perform memocious_private.refresh_publication();
 if public.memocious_product('transaction-test') is not null then raise exception 'Hidden product exposed';end if;
 update memocious.products set active=true where id=v_product;
 update memocious.categories set active=false where slug='gift-hampers';perform memocious_private.refresh_publication();
 if public.memocious_product('transaction-test') is not null or exists(select 1 from public.memocious_taxonomy_items where slug='festive-hampers') then raise exception 'Inactive parent child exposed';end if;
 delete from memocious.products where id=v_product;
 if not exists(select 1 from memocious.order_items where product_name='Transaction fixture' and product_id is null and immutable_snapshot->>'unitPricePaise'='0') then raise exception 'History lost on product deletion';end if;
 perform public.memocious_session_revoke(v_guest,false);
 failed:=false;begin perform public.memocious_session_read(repeat('a',64));exception when invalid_authorization_specification then failed:=true;end;
 if not failed then raise exception 'Revoked session accepted';end if;
end $$;
rollback;
select 'PASS: grants, denied bypass, guest admin denial, zero-price snapshot, replay, changed-payload conflict, negative quantity, visibility, history, revocation; fixtures rolled back' as result;
