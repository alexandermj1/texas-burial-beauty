import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Owner-only, create-once provisioning; never resets an existing account.
const EMAIL = "susie@staff.texascemeterybrokers.invalid";
const OWNER = "alexandermaclarenjames@gmail.com";
const SOURCE_ID = "e07b4a4c-56d1-4b2f-bc27-7989314d008f";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Account service unavailable" }, 503);
  const db = createClient(url, key);
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: caller, error: authError } = await db.auth.getUser(token);
  if (authError || !caller.user || caller.user.email?.toLowerCase() !== OWNER) return json({ error: "Forbidden" }, 403);
  const { data: ownerRole } = await db.from("user_roles").select("role").eq("user_id", caller.user.id).eq("role", "admin").maybeSingle();
  if (!ownerRole) return json({ error: "Forbidden" }, 403);
  let body: { password?: unknown };
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  if (typeof body.password !== "string" || body.password.length < 16) return json({ error: "Use a password of at least 16 characters" }, 400);
  const { data: roles, error: rolesError } = await db.from("user_roles").select("role").eq("user_id", SOURCE_ID);
  if (rolesError || !roles?.length) return json({ error: "Cannot verify Cici's permissions" }, 503);
  const { data, error } = await db.auth.admin.createUser({
    email: EMAIL, password: body.password, email_confirm: true,
    user_metadata: { full_name: "Susie", username: "susie" },
    app_metadata: { ai_suggestions_disabled: true },
  });
  if (error || !data.user) return json({ error: "Account could not be created; existing accounts are not reset" }, 409);
  const id = data.user.id;
  const { error: profileError } = await db.from("profiles").upsert({ id, email: EMAIL, full_name: "Susie" }, { onConflict: "id" });
  if (profileError) return json({ error: "Account created but profile setup failed", user_id: id }, 500);
  const { error: roleError } = await db.from("user_roles").upsert(roles.map(({ role }) => ({ user_id: id, role })), { onConflict: "user_id,role" });
  if (roleError) return json({ error: "Account created but permission setup failed", user_id: id }, 500);
  return json({ success: true, user_id: id, username: "susie", full_name: "Susie", roles: roles.map(({ role }) => role) });
});