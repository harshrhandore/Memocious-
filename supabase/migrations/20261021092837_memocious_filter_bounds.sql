create or replace function public.memocious_catalogue(filters jsonb default '{}') returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb; lim int:=coalesce((filters->>'limit')::int,24); page_num int:=coalesce((filters->>'page')::int,1); sorting text:=coalesce(filters->>'sort','featured');
begin
 if jsonb_typeof(filters)<>'object' or exists(select 1 from jsonb_object_keys(filters) k where k not in ('q','category','occasion','min','max','rating','customizable','colour','lead','stock','combos','sort','page','limit')) then raise exception 'Invalid catalogue filters';end if;
 if jsonb_typeof(coalesce(filters->'colour','[]'))<>'array' or jsonb_array_length(coalesce(filters->'colour','[]'))>5 or (filters->>'min')::bigint<0 or (filters->>'max')::bigint>1000000 or (filters->>'min')::bigint>(filters->>'max')::bigint then raise exception 'Invalid catalogue filters';end if;
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
 closure as (select slug as ancestor,slug as descendant from public.memocious_taxonomy_items where kind='category' union all select c.ancestor,t.slug from closure c join public.memocious_taxonomy_items t on t.parent_slug=c.descendant where t.kind='category'),
 counts as (select t.slug,(select count(*) from matching m where exists(select 1 from closure c where c.ancestor=t.slug and m.data->'categories' ? c.descendant)) n from public.memocious_taxonomy_items t where t.kind='category')
 select jsonb_build_object('products',coalesce((select jsonb_agg(data) from paged),'[]'),'total',(select count(*) from matching),'counts',coalesce((select jsonb_object_agg(slug,n) from counts),'{}')) into result;
 return result;
end $$;


revoke execute on all functions in schema memocious_private from public,anon,authenticated;
grant execute on all functions in schema memocious_private to service_role;

