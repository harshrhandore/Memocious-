export type SessionPolicy = {
  audience: "customer" | "admin" | "guest";
  assurance: "aal1" | "aal2";
  mfaAt: string | null;
  revokedAt: string | null;
  lastActiveAt: string;
  absoluteExpiresAt: string;
  role: "owner" | "editor" | null;
  activeRole: boolean;
};
export function permitsAdmin(
  s: SessionPolicy,
  now: number,
  ownerOnly = false,
  recent = false,
) {
  return (
    s.audience === "admin" &&
    s.assurance === "aal2" &&
    s.activeRole &&
    !!s.role &&
    (!ownerOnly || s.role === "owner") &&
    !s.revokedAt &&
    Date.parse(s.absoluteExpiresAt) > now &&
    Date.parse(s.lastActiveAt) > now - 30 * 60e3 &&
    !!s.mfaAt &&
    Date.parse(s.mfaAt) <= now &&
    (!recent || Date.parse(s.mfaAt) > now - 5 * 60e3)
  );
}

export function canEnrollInitialFactor(
  assurance: "aal1" | "aal2",
  factors: { status: string }[],
) {
  return (
    assurance === "aal1" && factors.every((f) => f.status === "unverified")
  );
}
