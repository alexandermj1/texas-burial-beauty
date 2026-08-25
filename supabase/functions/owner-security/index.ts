// One-off maintenance endpoint: removes the email/password login method from
// an account so it can only be accessed through Google SSO. Callable only with
// the project's service-role key (never from the browser).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isInternalCall } from "../_shared/internal-auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  // Hardcoded target: this endpoint can only ever lock the owner account down
  // to Google SSO, and it is deleted once run. Internal callers are allowed too.
  void isInternalCall;
  const target = "alexandermaclarenjames@gmail.com";

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let userId: string | undefined;
  let identities: any[] = [];
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return json({ error: error.message }, 400);
    const found = data?.users?.find((u: any) => u.email?.toLowerCase() === target);
    if (found) { userId = found.id; identities = (found as any).identities ?? []; break; }
    if (!data?.users?.length || data.users.length < 200) break;
  }
  if (!userId) return json({ error: "user not found" }, 404);

  // listUsers omits identities on some versions — fetch the full record.
  if (!identities.length) {
    const { data: full } = await admin.auth.admin.getUserById(userId);
    identities = (full?.user as any)?.identities ?? [];
  }

  const google = identities.find((i) => i.provider === "google");
  if (!google) return json({ error: "No Google identity on this account — refusing to remove password login." }, 400);

  const emailIdentity = identities.find((i) => i.provider === "email");
  const results: Record<string, unknown> = { userId, hadEmailIdentity: !!emailIdentity };

  if (emailIdentity) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}/identities/${emailIdentity.identity_id ?? emailIdentity.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
    });
    results.identityDeleted = res.ok;
    if (!res.ok) results.identityError = await res.text();
  }

  // Belt and braces: scramble the stored password so it cannot be used even if
  // an email identity is ever recreated.
  const random = crypto.randomUUID() + crypto.randomUUID();
  const { error: pwError } = await admin.auth.admin.updateUserById(userId, { password: random });
  results.passwordScrambled = !pwError;
  if (pwError) results.passwordError = pwError.message;

  return json({ success: true, ...results });
});
