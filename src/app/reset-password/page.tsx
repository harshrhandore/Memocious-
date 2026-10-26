import { PasswordReset } from "@/components/password-reset";
export const metadata = { title: "Reset password", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default function ResetPasswordPage() {
  return <div className="center-page"><h1>Reset your password</h1><PasswordReset /></div>;
}
