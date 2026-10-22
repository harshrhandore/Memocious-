import Link from "next/link";
import { authReady } from "@/lib/config";
import { safeReturnPath } from "@/lib/domain";
import { LoginForm } from "@/components/login";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your little corner",
  robots: { index: false, follow: false },
};
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const p = await searchParams;
  return (
    <div className="center-page">
      {p.error && (
        <p className="notice error mb-5" role="alert">
          That sign-in link is unavailable or expired. Please request a new one.
        </p>
      )}
      <LoginForm
        available={authReady}
        next={safeReturnPath(p.next)}
        sitekey={process.env.TURNSTILE_SITE_KEY ?? ""}
      />
      <Link href="/shop" className="text-link mt-5">
        Keep exploring
      </Link>
    </div>
  );
}
