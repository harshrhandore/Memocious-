import { phase2Ready } from "@/lib/config";
import { notFound } from "next/navigation";
import { authReady } from "@/lib/config";
import { readSession } from "@/lib/session";
import { AdminPanel } from "@/components/admin";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};
export default async function Admin({
  params,
}: {
  params: Promise<{ admin: string }>;
}) {
  const path = (await params).admin;
  if (
    !process.env.ADMIN_ROUTE ||
    !/^[a-zA-Z0-9_-]{12,80}$/.test(process.env.ADMIN_ROUTE) ||
    path !== process.env.ADMIN_ROUTE
  )
    notFound();
  const s = authReady ? await readSession().catch(() => null) : null;
  return (
    <div className="container prose">
      <span className="eyebrow">MEMOCIOUS STUDIO</span>
      <h1>A little behind the scenes.</h1>
      <AdminPanel phase2={phase2Ready}
        available={authReady}
        stage={
          !s || s.audience !== "admin"
            ? "primary"
            : s.assurance === "aal2"
              ? "verified"
              : "mfa"
        }
        products={[]}
        sitekey={process.env.TURNSTILE_SITE_KEY ?? ""}
      />
    </div>
  );
}
export type ProductSummary = {
  id: string;
  name: string;
  slug: string;
  pricePaise: number | null;
  active: boolean;
  deleted: boolean;
  version: number;
};
