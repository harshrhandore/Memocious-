create or replace function public.memocious_admin_product(sid uuid, product_id uuid, expected_version int, action text, fields jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare p memocious.products; newid uuid; opt jsonb; val jsonb; optid uuid; n int:=0; j int; allowed text[]:=array['slug','name','description','detail','pricePaise','maxPricePaise','materials','dimensions','colour','customizable','featured','inStock','lead','leadDays','moq','enterprise','seoTitle','seoDescription','messageLimit','categories','occasions','options'];
begin
 perform memocious_private.assert_admin(sid,action in ('delete','purge'),action in ('delete','purge'));
 perform pg_advisory_xact_lock(hashtextextended('memocious:catalogue',0));
 if action not in ('create','edit','hide','show','delete','purge','duplicate') or jsonb_typeof(fields)<>'object' or exists(select 1 from jsonb_object_keys(fields) k where not k=any(allowed)) then raise exception 'Invalid product action' using errcode='22023';end if;
 if action='create' then
 insert into memocious.products(slug,name) values(fields->>'slug',fields->>'name') returning * into p;
 else
 select * into p from memocious.products where id=product_id for update;
 if not found then raise exception 'Unavailable' using errcode='22023';end if;
 if p.version<>expected_version then raise exception 'Version conflict' using errcode='40001';end if;
 end if;
 if action='purge' then
 if p.deleted_at is null then raise exception 'Soft delete first' using errcode='22023';end if;
 delete from memocious.products where id=p.id;
 elsif action='duplicate' then
 insert into memocious.products(slug,name,description,detail,price_paise,max_price_paise,materials,dimensions,colour,customizable,lead_type,lead_days,in_stock,moq,enterprise,message_limit,seo_title,seo_description)
 values(left(p.slug,60)||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,8),left(p.name||' (copy)',120),p.description,p.detail,p.price_paise,p.max_price_paise,p.materials,p.dimensions,p.colour,p.customizable,p.lead_type,p.lead_days,p.in_stock,p.moq,p.enterprise,p.message_limit,p.seo_title,p.seo_description) returning id into newid;
 insert into memocious.product_categories(product_id,category_id) select newid,category_id from memocious.product_categories pc where pc.product_id=p.id;
 insert into memocious.product_occasions(product_id,occasion_id) select newid,occasion_id from memocious.product_occasions po where po.product_id=p.id;
 for optid in select id from memocious.product_options po where po.product_id=p.id loop
 insert into memocious.product_options(product_id,kind,label,required,max_count,active,sort_order) select newid,kind,label,required,max_count,active,sort_order from memocious.product_options where id=optid returning id into product_id;
 insert into memocious.option_values(option_id,label,delta_paise,active,sort_order) select product_id,label,delta_paise,active,sort_order from memocious.option_values where option_id=optid;
 end loop;
 -- Duplicates deliberately require their own media review/publication.
 elsif action in ('create','edit') then
 p:=memocious_private.save_product_fields(sid,p.id,fields);
 else
 if action='show' then
 if p.deleted_at is not null or not exists(select 1 from memocious.product_categories pc where pc.product_id=p.id) or not exists(select 1 from memocious.product_images i where i.product_id=p.id and published_at is not null and sanitized_at is not null) then raise exception 'Review media and categories before publishing' using errcode='22023';end if;
 if exists(select 1 from memocious.product_categories pc where pc.product_id=p.id and not exists(select 1 from public.memocious_taxonomy_items t where t.id=pc.category_id)) or exists(select 1 from memocious.product_occasions po where po.product_id=p.id and not exists(select 1 from public.memocious_taxonomy_items t where t.id=po.occasion_id)) then raise exception 'Hidden taxonomy' using errcode='22023';end if;
 end if;
 update memocious.products set active=action='show',publication_state=case when action='show' then 'published' else publication_state end,deleted_at=case when action='delete' then now() else deleted_at end,version=version+1,updated_at=now() where id=p.id returning * into p;
 end if;
 perform memocious_private.refresh_publication();
 insert into memocious.audit_log(actor_session_id,actor_kind,action,entity,entity_id,request_id,redacted_diff) values(sid,'admin','product.'||action,'product',coalesce(newid,p.id),gen_random_uuid(),jsonb_build_object('version',p.version));
 return jsonb_build_object('id',coalesce(newid,p.id),'version',case when newid is null then p.version else 1 end);
end $$;
