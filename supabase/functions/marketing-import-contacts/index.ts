// Bulk upsert marketing contacts from a parsed CSV.
// Admin-only. Dedupes on (brand, lower(email)).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    const body = await req.json();
    const brand = body?.brand as string;
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    if (!["texas", "bayer"].includes(brand)) return json({ error: "Invalid brand" }, 400);
    if (!rows.length) return json({ error: "No rows provided" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const batchId = crypto.randomUUID();
    const seen = new Set<string>();
    const cleaned: any[] = [];
    let skipped = 0;
    for (const r of rows) {
      const email = String(r?.email || r?.email_address || r?.e_mail || "").trim().toLowerCase();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { skipped++; continue; }
      if (seen.has(email)) { skipped++; continue; }
      seen.add(email);
      const website = str(r.website || r.website_domain || r.domain);
      const extra = { ...(r._extra || {}) };
      if (website) extra.website = website;
      cleaned.push({
        brand,
        email,
        first_name: str(r.first_name || r.firstname || r.fname),
        last_name: str(r.last_name || r.lastname || r.lname),
        company: str(r.company || r.mortuary || r.funeral_home || r.funeral_home_name || r.organization),
        city: str(r.city),
        state: str(r.state),
        phone: str(r.phone || r.telephone),
        extra,
        source: "csv_upload",
        csv_batch_id: batchId,
      });
    }

    if (!cleaned.length) return json({ error: "No valid rows", skipped }, 400);

    // Chunked upsert to avoid oversized single requests.
    let inserted = 0;
    for (let i = 0; i < cleaned.length; i += 500) {
      const chunk = cleaned.slice(i, i + 500);
      const { error, count } = await admin
        .from("marketing_contacts")
        .upsert(chunk, { onConflict: "brand,email", ignoreDuplicates: false, count: "exact" });
      if (error) return json({ error: error.message }, 500);
      inserted += count ?? chunk.length;
    }

    return json({ ok: true, batchId, imported: cleaned.length, skipped });
  } catch (e: any) {
    return json({ error: e?.message || "Unknown error" }, 500);
  }
});

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
