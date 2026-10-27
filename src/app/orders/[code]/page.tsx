import { notFound, redirect } from "next/navigation";
import { phase4Ready } from "@/lib/config";
import { orderCode } from "@/lib/order-domain";
import { requireCustomerSession } from "@/lib/session";
import { rpc } from "@/lib/server-db";
import { OrderTracking } from "@/components/order-tracking";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your order timeline",
  robots: { index: false, follow: false },
};
export default async function Order({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  if (!phase4Ready) notFound();
  const parsed = orderCode.safeParse((await params).code);
  if (!parsed.success) notFound();
  const s = await requireCustomerSession().catch(() => null);
  if (!s)
    redirect(`/login?next=${encodeURIComponent(`/orders/${parsed.data}`)}`);
  await rpc("memocious_customer_orders", {
    sid: s.id,
    order_code: parsed.data,
  }).catch(() => notFound());
  return (
    <article className="container section">
      <h1>Your order timeline</h1>
      <OrderTracking code={parsed.data} />
    </article>
  );
}
