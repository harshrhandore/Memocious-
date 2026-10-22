create function public.memocious_taxonomy() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('categories',coalesce(jsonb_agg(jsonb_build_object('id',id,'slug',slug,'label',label,'parentSlug',parent_slug,'icon',icon,'sortOrder',sort_order) order by sort_order) filter(where kind='category'),'[]'),'occasions',coalesce(jsonb_agg(jsonb_build_object('id',id,'slug',slug,'label',label,'parentSlug',parent_slug,'icon',icon,'sortOrder',sort_order) order by sort_order) filter(where kind='occasion'),'[]')) from public.memocious_taxonomy_items;
$$;
create function public.memocious_product(product_slug text) returns jsonb language sql stable security invoker set search_path='' as $$ select data from public.memocious_catalogue_products where slug=product_slug and char_length(product_slug)<=80; $$;
-- This single-key public response deliberately contains no settings table access.
create function public.memocious_public_settings() returns jsonb language sql stable security invoker set search_path='' as $$ select jsonb_build_object('whatsappNumber',null); $$;

create function public.memocious_catalogue(filters jsonb default '{}') returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; lim int:=coalesce((filters->>'limit')::int,24); page_num int:=coalesce((filters->>'page')::int,1); sorting text:=coalesce(filters->>'sort','featured');
begin
 if lim not between 1 and 48 or page_num not between 1 and 10000 or char_length(coalesce(filters->>'q',''))>100 or jsonb_typeof(coalesce(filters->'category','[]'))<>'array' or jsonb_array_length(coalesce(filters->'category','[]'))>20 or sorting not in ('featured','price-asc','price-desc','newest','top-rated','best-selling') then raise exception 'Invalid catalogue filters';end if;
 with recursive cats as (select id,slug from public.memocious_taxonomy_items where kind='category' and slug in (select jsonb_array_elements_text(coalesce(filters->'category','[]'))) union select t.id,t.slug from public.memocious_taxonomy_items t join cats c on t.parent_slug=c.slug where t.kind='category'),
 occs as (select id,slug from public.memocious_taxonomy_items where kind='occasion' and slug=filters->>'occasion' union select t.id,t.slug from public.memocious_taxonomy_items t join occs o on t.parent_slug=o.slug where t.kind='occasion'),
 matching as (select p.*,ts_rank(p.search_vector,websearch_to_tsquery('english',coalesce(filters->>'q',''))) rank from public.memocious_catalogue_products p where
 (coalesce(filters->>'q','')='' or p.search_vector@@websearch_to_tsquery('english',filters->>'q')) and
 (jsonb_array_length(coalesce(filters->'category','[]'))=0 or exists(select 1 from cats c where p.data->'categories' ? c.slug)) and
 (coalesce(filters->>'occasion','')='' or exists(select 1 from occs o where p.data->'occasions' ? o.slug)) and
 (filters->>'min' is null or p.price_paise >= (filters->>'min')::bigint*100) and (filters->>'max' is null or p.price_paise <= (filters->>'max')::bigint*100) and
 (filters->>'rating' is null or p.avg_rating>=4) and (filters->>'customizable' is distinct from 'true' or (p.data->>'customizable')::boolean) and
 (filters->>'stock' is distinct from 'true' or (p.data->>'inStock')::boolean) and (filters->>'combos' is distinct from 'true' or p.data->'categories' ? 'combos') and
 (filters->>'lead' is null or p.data->>'lead'=filters->>'lead') and
 (jsonb_array_length(coalesce(filters->'colour','[]'))=0 or p.data->>'colour' in(select jsonb_array_elements_text(filters->'colour')))),
 paged as (select * from matching order by
 case when sorting='price-asc' then price_paise end asc nulls last,
 case when sorting='price-desc' then price_paise end desc nulls last,
 case when sorting='newest' then created_at end desc,
 case when sorting='top-rated' then avg_rating end desc nulls last,
 case when sorting='top-rated' then review_count end desc,
 case when sorting in ('featured','best-selling') then rank end desc,
 case when sorting in ('featured','best-selling') then featured end desc,id
 limit lim offset (page_num-1)*lim),
 counts as (select t.slug,(select count(*) from matching m where m.data->'categories' ? t.slug or exists(select 1 from public.memocious_taxonomy_items child where child.kind='category' and child.parent_slug=t.slug and m.data->'categories' ? child.slug)) n from public.memocious_taxonomy_items t where t.kind='category')
 select jsonb_build_object('products',coalesce((select jsonb_agg(data) from paged),'[]'),'total',(select count(*) from matching),'counts',coalesce((select jsonb_object_agg(slug,n) from counts),'{}')) into result;
 return result;
end $$;


revoke execute on all functions in schema memocious_private from public,anon,authenticated;
grant execute on all functions in schema memocious_private to service_role;

-- Scope revocation to this application's named RPCs only.
do $$ declare r record; begin
 for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'memocious_%' loop
 execute format('revoke execute on function %s from public,anon,authenticated',r.signature);
 execute format('grant execute on function %s to service_role',r.signature);
 end loop;
end $$;

grant execute on function public.memocious_taxonomy(),public.memocious_product(text),public.memocious_public_settings(),public.memocious_catalogue(jsonb) to anon,authenticated;
