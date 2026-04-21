import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    const adminEmail = "alexandermaclarenjames@gmail.com";
    const adminPassword = "123456";

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let userId: string;
    
    const existing = existingUsers?.users?.find(u => u.email === adminEmail);
    if (existing) {
      userId = existing.id;
    } else {
      // Create the user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });
      if (createError) throw createError;
      userId = newUser.user.id;
    }

    // Assign admin role (upsert)
    const { error: roleError } = await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role: "admin" },
      { onConflict: "user_id,role" }
    );
    if (roleError) throw roleError;

    // Generate random profit for all listings that don't have one
    const { data: listings } = await supabaseAdmin
      .from("listings")
      .select("id, asking_price")
      .is("profit", null);

    if (listings && listings.length > 0) {
      for (const listing of listings) {
        const profit = Math.floor(Math.random() * 48000) + 2000; // 2k-50k
        const costPrice = (listing.asking_price || 10000) - profit;
        await supabaseAdmin
          .from("listings")
          .update({ profit, cost_price: Math.max(costPrice, 500) })
          .eq("id", listing.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, userId, listingsUpdated: listings?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
