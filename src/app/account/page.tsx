import { CustomRequests } from "@/components/custom-requests";
import Link from "next/link";
import { AccountPhase2 } from "@/components/account-phase2";
import { Wishlist } from "@/components/wishlist";
import { redirect } from "next/navigation";
import { authReady, phase2Ready, phase3Ready, phase4Ready } from "@/lib/config";
import { requireCustomerSession } from "@/lib/session";
import { rpc } from "@/lib/server-db";
import { EmptyState } from "@/components/ui";
import { AccountForm } from "@/components/account";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};
export default async function Account() {
  if (!authReady)
    return (
      <div className="container section">
        <EmptyState title="Your little corner is coming soon.">
          Private accounts are being set up. You can browse the collection while
          sign-in is unavailable.
        </EmptyState>
      </div>
    );
  const s = await requireCustomerSession().catch(() => null);
  if (!s) redirect("/login?next=/account");
  const profile = await rpc<{ fullName: string }>("memocious_profile", {
    sid: s.id,
    new_name: null,
  });
  return (
    <div className="center-page">
      <h1>Your little corner.</h1>
      <p>
        <Link href="/build-a-gift">Explore the custom gift draft editor</Link>
      </p>
      {phase3Ready && <CustomRequests />}
      {phase4Ready && (
        <p>
          <Link className="underline" href="/orders">
            Your enquiries and orders
          </Link>
        </p>
      )}
      <AccountForm fullName={profile.fullName} />
      {phase2Ready && (
        <>
          <Wishlist />
          <AccountPhase2 />
        </>
      )}
      <p className="quiet-note">
        Reviews, private drafts and tracking will appear here after their
        verification gates are complete.
      </p>
    </div>
  );
}
