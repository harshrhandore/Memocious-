create function memocious_private.product_fields_options(sid uuid,pid uuid,fields jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare p memocious.products;opt jsonb;val jsonb;optid uuid;n int:=0;j int;
begin perform memocious_private.assert_admin(sid);select * into p from memocious.products where id=pid for update;
 if fields?'options' then
 if jsonb_array_length(fields->'options')>10 then raise exception 'Too many options' using errcode='22023';end if;
 delete from memocious.product_options po where po.product_id=p.id;
 for opt in select value from jsonb_array_elements(fields->'options') loop
 if opt->>'kind' not in ('colour','size','addon') or jsonb_array_length(opt->'values') not between 1 and 20 then raise exception 'Invalid options' using errcode='22023';end if;
 insert into memocious.product_options(product_id,kind,label,required,max_count,sort_order) values(p.id,opt->>'kind',opt->>'label',(opt->>'required')::boolean,(opt->>'maxCount')::int,n) returning id into optid;
 n:=n+1;j:=0;
 for val in select value from jsonb_array_elements(opt->'values') loop
 insert into memocious.option_values(option_id,label,delta_paise,sort_order) values(optid,val->>'label',(val->>'deltaPaise')::bigint,j);j:=j+1;
 end loop;
 end loop;
 end if;

end $$;
revoke execute on function memocious_private.product_fields_options(uuid,uuid,jsonb) from public,anon,authenticated;grant execute on function memocious_private.product_fields_options(uuid,uuid,jsonb) to service_role;
