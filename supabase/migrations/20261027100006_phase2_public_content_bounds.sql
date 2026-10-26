-- Bounded public proof and counter response; never download an unbounded owner collection.
create or replace function public.memocious_phase2_public() returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('proof',coalesce((select jsonb_agg(jsonb_build_object('photo','/community-media/'||a.id,'caption',p.caption,'firstName',p.first_name,'city',p.city) order by p.sort_order,p.id) from (select * from memocious.sales_proof_items where active order by sort_order,id limit 20) p join memocious.phase2_assets a on a.id=p.asset_id where p.active and a.status='ready' and a.consent_at is not null and a.public_copy is not null and a.public_ready),'[]'),
 'counters',coalesce((select jsonb_agg(jsonb_build_object('label',label,'value',value)) from (select * from memocious.proof_counters where active order by label,id limit 20)c),'[]'),
 'catalogue',(select id from memocious.catalogue_documents where published limit 1),
 'bestsellers',coalesce((select jsonb_agg(x.data) from(select cp.data from public.memocious_catalogue_products cp join memocious.order_items i on i.product_id=cp.id join memocious.orders o on o.id=i.order_id where o.status='delivered' and o.updated_at>now()-interval '90 days' group by cp.id order by sum(i.quantity) desc,cp.id limit 4)x),'[]'),
 'testimonials',(select public.memocious_reviews(null,1)->'items'));
$$;
