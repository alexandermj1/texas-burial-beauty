// Seeder / updater for Cici's staff login. Idempotent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EMAIL = "cici@bayerbrokers.com";
const PASSWORD = "Tb2026!BB";
const FULL_NAME = "Cici";

Deno.serve(async () => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let userId: string | undefined;
  let page = 1;
  while (!userId) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    const found = data?.users?.find((u: any) => u.email?.toLowerCase() === EMAIL);
    if (found) { userId = found.id; break; }
    if (!data?.users?.length || data.users.length < 200) break;
    page++;
  }

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME },
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    userId = data.user!.id;
  } else {
    await admin.auth.admin.updateUserById(userId, {
      password: PASSWORD,
      user_metadata: { full_name: FULL_NAME },
    });
  }

  await admin.from("profiles").upsert(
    { id: userId, email: EMAIL, full_name: FULL_NAME },
    { onConflict: "id" },
  );

  const { error: roleError } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role: "staff" }, { onConflict: "user_id,role" });

  return new Response(
    JSON.stringify({ success: true, userId, email: EMAIL, roleError: roleError?.message }),
    { headers: { "Content-Type": "application/json" } },
  );
});
