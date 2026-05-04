import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ADMINS: Array<{ email: string; password: string; full_name: string }> = [
  { email: "alexandermaclarenjames@gmail.com", password: "123456", full_name: "Alexander Maclaren James" },
  { email: "emmamaclaren@gmail.com", password: "123456", full_name: "Emma Maclaren" },
  // Bayer staff (8-stage pipeline roles)
  { email: "cathy@bayerbrokers.com", password: "Bayer123!", full_name: "Cathy (CC) — Quote approver" },
  { email: "em@bayerbrokers.com", password: "Bayer123!", full_name: "EM — Forest Lawn / template owner" },
  { email: "cici@bayerbrokers.com", password: "Bayer123!", full_name: "Cici (CA) — Quote sender / file scans" },
  { email: "ym@bayerbrokers.com", password: "Bayer123!", full_name: "YM — Payment & document receipt" },
  { email: "zm@bayerbrokers.com", password: "Bayer123!", full_name: "ZM — Website publisher" },
  { email: "broker@bayerbrokers.com", password: "Bayer123!", full_name: "Senior Broker — L.A. countersign" },
];

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const results: Array<{ email: string; userId: string; created: boolean }> = [];

    for (const a of ADMINS) {
      let userId: string;
      let created = false;
      const existing = existingUsers?.users?.find((u) => u.email === a.email);
      if (existing) {
        userId = existing.id;
        // Reset password to ensure access
        await supabaseAdmin.auth.admin.updateUserById(userId, { password: a.password });
      } else {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: a.email,
          password: a.password,
          email_confirm: true,
          user_metadata: { full_name: a.full_name },
        });
        if (createError) throw createError;
        userId = newUser.user.id;
        created = true;
      }

      await supabaseAdmin.from("user_roles").upsert(
        { user_id: userId, role: "admin" },
        { onConflict: "user_id,role" }
      );

      await supabaseAdmin.from("profiles").upsert(
        { id: userId, email: a.email, full_name: a.full_name },
        { onConflict: "id" }
      );

      results.push({ email: a.email, userId, created });
    }

    return new Response(
      JSON.stringify({ success: true, admins: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
