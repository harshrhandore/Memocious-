create or replace function memocious_private.refresh_publication() returns void language plpgsql security invoker set search_path='' as $$
begin
 delete from public.memocious_taxonomy_items;
 with recursive visible as (
 select id,parent_id,slug,label,icon,sort_order from memocious.categories where parent_id is null and active
 union all select c.id,c.parent_id,c.slug,c.label,c.icon,c.sort_order from memocious.categories c join visible v on c.parent_id=v.id where c.active)
 insert into public.memocious_taxonomy_items select v.id,'category',v.slug,v.label,p.slug,v.icon,v.sort_order from visible v left join visible p on v.parent_id=p.id;
 with recursive visible as (
 select id,parent_id,slug,label,icon,sort_order from memocious.occasions where parent_id is null and active
 union all select c.id,c.parent_id,c.slug,c.label,c.icon,c.sort_order from memocious.occasions c join visible v on c.parent_id=v.id where c.active)
 insert into public.memocious_taxonomy_items select v.id,'occasion',v.slug,v.label,p.slug,v.icon,v.sort_order from visible v left join visible p on v.parent_id=p.id;
 delete from public.memocious_catalogue_products;
 insert into public.memocious_catalogue_products(id,slug,data,search_vector,price_paise,featured,created_at,avg_rating,review_count)
 select p.id,p.slug,jsonb_build_object('id',p.id,'slug',p.slug,'name',p.name,'description',p.description,'detail',p.detail,'pricePaise',p.price_paise,'maxPricePaise',p.max_price_paise,'categories',cats.slugs,'occasions',occs.slugs,'image',img.public_path,'images',(select coalesce(jsonb_agg(jsonb_build_object('url',i.public_path,'alt',i.alt) order by i.sort_order,i.id),'[]') from memocious.product_images i where i.product_id=p.id and i.published_at is not null and i.sanitized_at is not null),'messageLimit',p.message_limit,'moq',p.moq,'leadDays',p.lead_days,'seoTitle',p.seo_title,'seoDescription',p.seo_description,'colour',p.colour,'customizable',p.customizable,'lead',p.lead_type,'inStock',p.in_stock,'featured',p.featured,'avgRating',null,'reviewCount',0,'materials',p.materials,'dimensions',p.dimensions,'options',opts.items,'optionGroups',(select coalesce(jsonb_agg(jsonb_build_object('id',o.id,'label',o.label,'kind',o.kind,'required',o.required,'maxCount',coalesce(o.max_count,1),'values',(select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'label',v.label,'deltaPaise',v.delta_paise) order by v.sort_order,v.id),'[]') from memocious.option_values v where v.option_id=o.id and v.active)) order by o.sort_order,o.id),'[]') from memocious.product_options o where o.product_id=p.id and o.active and o.kind in ('colour','size','addon')),'createdAt',p.created_at,'demo',false),p.search_vector,p.price_paise,p.featured,p.created_at,null,0
 from memocious.products p
 cross join lateral (select coalesce(jsonb_agg(t.slug order by t.sort_order),'[]') slugs from memocious.product_categories pc join public.memocious_taxonomy_items t on t.id=pc.category_id and t.kind='category' where pc.product_id=p.id) cats
 cross join lateral (select coalesce(jsonb_agg(t.slug order by t.sort_order),'[]') slugs from memocious.product_occasions po join public.memocious_taxonomy_items t on t.id=po.occasion_id and t.kind='occasion' where po.product_id=p.id) occs
 cross join lateral (select i.public_path from memocious.product_images i where i.product_id=p.id and i.published_at is not null and i.sanitized_at is not null order by i.sort_order,i.id limit 1) img
 cross join lateral (select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'label',o.label||': '||v.label,'deltaPaise',v.delta_paise) order by o.sort_order,v.sort_order,v.id),'[]') items from memocious.product_options o join memocious.option_values v on v.option_id=o.id and v.active where o.product_id=p.id and o.active) opts
 where p.active and p.publication_state='published' and p.deleted_at is null and jsonb_array_length(cats.slugs)>0
 and not exists(select 1 from memocious.product_categories pc where pc.product_id=p.id and not exists(select 1 from public.memocious_taxonomy_items t where t.id=pc.category_id))
 and not exists(select 1 from memocious.product_occasions po where po.product_id=p.id and not exists(select 1 from public.memocious_taxonomy_items t where t.id=po.occasion_id));
end $$;
