create function memocious_private.product_fields_taxonomy(sid uuid,pid uuid,fields jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare p memocious.products;opt jsonb;val jsonb;optid uuid;n int:=0;j int;
begin perform memocious_private.assert_admin(sid);select * into p from memocious.products where id=pid for update;
 if fields?'categories' then
 if jsonb_array_length(fields->'categories') not between 1 and 20 then raise exception 'Select categories' using errcode='22023';end if;
 delete from memocious.product_categories pc where pc.product_id=p.id;
 insert into memocious.product_categories(product_id,category_id) select p.id,v::uuid from jsonb_array_elements_text(fields->'categories') v;
 end if;
 if fields?'occasions' then
 if jsonb_array_length(fields->'occasions')>20 then raise exception 'Invalid occasions' using errcode='22023';end if;
 delete from memocious.product_occasions po where po.product_id=p.id;
 insert into memocious.product_occasions(product_id,occasion_id) select p.id,v::uuid from jsonb_array_elements_text(fields->'occasions') v;
 end if;

end $$;
revoke execute on function memocious_private.product_fields_taxonomy(uuid,uuid,jsonb) from public,anon,authenticated;grant execute on function memocious_private.product_fields_taxonomy(uuid,uuid,jsonb) to service_role;
