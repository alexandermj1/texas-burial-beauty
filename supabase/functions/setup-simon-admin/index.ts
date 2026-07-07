import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EMAIL = "simonjamesphd@gmail.com";

Deno.serve(async () => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Try to find existing user by paging through listUsers
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

  // If not found, create (email-confirmed so Google sign-in with same email links)
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      email_confirm: true,
      user_metadata: { full_name: "Simon James" },
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    userId = data.user!.id;
  }

  const { error: roleError } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

  return new Response(
    JSON.stringify({ success: true, userId, email: EMAIL, roleError: roleError?.message }),
    { headers: { "Content-Type": "application/json" } }
  );
});
