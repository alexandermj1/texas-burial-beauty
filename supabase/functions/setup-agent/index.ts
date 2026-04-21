import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Create agent account
  const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
    email: "alexmaclarenjames@icloud.com",
    password: "123456",
    email_confirm: true,
    user_metadata: { full_name: "Alex James" },
  });

  if (signUpError && !signUpError.message.includes("already")) {
    return new Response(JSON.stringify({ error: signUpError.message }), { status: 400 });
  }

  // Get user id
  let userId = signUpData?.user?.id;
  if (!userId) {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const found = users?.users?.find((u: any) => u.email === "alexmaclarenjames@icloud.com");
    userId = found?.id;
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: "Could not find user" }), { status: 400 });
  }

  // Assign agent role
  const { error: roleError } = await supabaseAdmin.from("user_roles").upsert(
    { user_id: userId, role: "agent" },
    { onConflict: "user_id,role" }
  );

  return new Response(JSON.stringify({ success: true, userId, roleError: roleError?.message }));
});
