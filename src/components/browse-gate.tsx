import "server-only";
import { catalogueGateEnabled } from "@/lib/catalogue";
import { redirect } from "next/navigation";
export async function BrowseGate() {
  if (await catalogueGateEnabled()) {
    const { requireCustomerSession } = await import("@/lib/session");
    const session = await requireCustomerSession().catch(() => null);
    if (!session) redirect("/login?next=/shop");
  }
}
