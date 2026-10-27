import { redirect } from "next/navigation";
import { phase4Ready } from "@/lib/config";
import { requireCustomerSession } from "@/lib/session";
import { OrderTracking } from "@/components/order-tracking";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your enquiries and orders",
  robots: { index: false, follow: false },
};
export default async function Orders() {
  if (!phase4Ready)
    return (
      <article className="container section">
        <h1>Order tracking is being set up</h1>
        <p>
          Account order timelines will appear after their verification gates are
          ready.
        </p>
      </article>
    );
  const session = await requireCustomerSession().catch(() => null);
  if (!session) redirect("/login?next=/orders");
  return (
    <article className="container section">
      <h1>Your enquiries and orders</h1>
      <OrderTracking />
    </article>
  );
}
