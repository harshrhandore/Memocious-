-- Customer identity is derived exclusively from the live opaque app session.
create function public.memocious_wishlist(sid uuid, product uuid default null, saved boolean default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare s memocious_private.app_sessions;
begin
 s:=memocious_private.assert_session(sid,'customer',saved is not null);
 -- Serialize mutations across all of this customer's sessions; cap retained entries.
 perform pg_advisory_xact_lock(hashtextextended('wishlist:'||s.user_id::text,0));
 if saved is not null then
  if product is null then raise exception 'Product required' using errcode='22023';end if;
  if saved then
   perform 1 from public.memocious_catalogue_products where id=product for share;
   if not found then raise exception 'Gift unavailable' using errcode='22023';end if;
   if not exists(select 1 from memocious.wishlist_items where user_id=s.user_id and product_id=product)
    and (select count(*) from memocious.wishlist_items where user_id=s.user_id)>=200 then
    raise exception 'Wishlist full' using errcode='22023';end if;
   insert into memocious.wishlist_items(user_id,product_id) values(s.user_id,product) on conflict(user_id,product_id) do nothing;
  else
   delete from memocious.wishlist_items where user_id=s.user_id and product_id=product;
  end if;
 end if;
 -- Hidden products expose no metadata. Keep their IDs only in the private store.
 return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'slug',p.slug,'name',p.data->>'name') order by w.created_at desc,w.id)
 from memocious.wishlist_items w join public.memocious_catalogue_products p on p.id=w.product_id where w.user_id=s.user_id),'[]'::jsonb);
end $$;
revoke execute on function public.memocious_wishlist(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.memocious_wishlist(uuid,uuid,boolean) to service_role;
