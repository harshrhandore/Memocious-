// Run once from an approved operator context, with server secrets and OWNER_EMAIL. No credential/email output.
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
const secret =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email || !secret || !process.env.SUPABASE_URL)
  throw new Error(
    "Configure operator identity and server credentials securely.",
  );
const db = createClient(process.env.SUPABASE_URL, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let owner;
for (let page = 1; page <= 50; page++) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw new Error("Managed identity lookup unavailable.");
  owner = data.users.find((u) => u.email?.toLowerCase() === email);
  if (owner || data.users.length < 200) break;
}
if (!owner?.email_confirmed_at || owner.is_anonymous)
  throw new Error(
    "Create and verify the intended owner through managed Auth first.",
  );
const { error } = await db.rpc("memocious_operator_bootstrap", {
  provider_user: owner.id,
  approved_email_hash: createHash("sha256").update(email).digest("hex"),
});
if (error)
  throw new Error(
    "Bootstrap refused. Existing membership or identity must be handled through the operator procedure.",
  );
console.log(
  "Owner provisioned. Primary login still requires managed TOTP before business access.",
);
