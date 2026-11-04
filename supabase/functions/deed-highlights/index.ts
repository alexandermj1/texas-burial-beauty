// Seller deed preview: returns a short-lived link to the deed image a seller sent,
// plus (optionally) AI-located boxes around owner names and space/lot numbers.
// "view" never calls AI; "scan" reads the deed once with a cheap vision model and
// caches the boxes in storage so later views are free.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const BUCKET = "customer-files";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const IMG = /\.(jpe?g|png|webp)$/i;
const DEEDISH = /(deed|certificate|sepulture|ownership|interment|title|lot|plot)/i;

async function isStaff(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data } = await db.auth.getUser(token);
  if (!data.user) return false;
  const { data: roles } = await db.from("user_roles").select("role").eq("user_id", data.user.id).in("role", ["admin", "staff"]);
  return Boolean(roles?.length);
}

type Cand = { path: string; name: string; score: number; at: string };

async function findDeed(submissionId: string): Promise<Cand | null> {
  const { data: sub } = await db.from("contact_submissions").select("id,customer_profile_id,seller_attachments,created_at").eq("id", submissionId).maybeSingle();
  if (!sub) return null;
  const c: Cand[] = [];
  for (const f of (Array.isArray(sub.seller_attachments) ? sub.seller_attachments : []) as any[]) {
    if (f?.path && (IMG.test(f.name ?? f.path) || /^image\//.test(f.type ?? ""))) c.push({ path: f.path, name: f.name ?? "Deed", score: DEEDISH.test(f.name ?? "") ? 1 : 0.5, at: sub.created_at });
  }
  if (sub.customer_profile_id) {
    const { data } = await db.from("customer_files").select("file_name,file_path,mime_type,document_type,extracted_summary,created_at").eq("customer_profile_id", sub.customer_profile_id).is("deleted_at", null).order("created_at", { ascending: false }).limit(40);
    for (const f of data ?? []) {
      if (!(IMG.test(f.file_name ?? "") || /^image\//.test(f.mime_type ?? ""))) continue;
      const deed = /(deed|certificate|sepulture|ownership|interment right)/i.test(`${f.document_type} ${f.extracted_summary}`);
      const notDeed = /(death certificate|driver|license|passport|\bid\b|photo of (a|the) (person|keyboard))/i.test(`${f.document_type} ${f.extracted_summary}`);
      c.push({ path: f.file_path, name: f.file_name, score: notDeed ? 0 : deed ? 2 : DEEDISH.test(f.file_name) ? 1 : 0.4, at: f.created_at });
    }
  }
  c.sort((a, b) => b.score - a.score || b.at.localeCompare(a.at));
  return c.find((x) => x.score > 0) ?? null;
}

const cachePath = (id: string) => `deed-highlights/${id}.json`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!(await isStaff(req))) return json({ error: "Staff only" }, 401);
    const body = await req.json().catch(() => ({}));
    const id = String(body.submission_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "submission_id required" }, 400);
    const deed = await findDeed(id);
    if (!deed) return json({ deed: null });
    const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(deed.path, 60 * 30);
    let cached: any = null;
    const c = await db.storage.from(BUCKET).download(cachePath(id));
    if (!c.error) { try { cached = JSON.parse(await c.data.text()); } catch { cached = null; } }
    if (cached && cached.path !== deed.path) cached = null;

    if (body.action === "scan" && !cached) {
      const dl = await db.storage.from(BUCKET).download(deed.path); if (dl.error) throw dl.error;
      const bytes = new Uint8Array(await dl.data.arrayBuffer());
      if (bytes.length > 7_000_000) return json({ error: "Deed image too large to read" }, 413);
      let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const mime = /png$/i.test(deed.path) ? "image/png" : /webp$/i.test(deed.path) ? "image/webp" : "image/jpeg";
      const prompt = `This is a photo a seller sent us of a cemetery deed / certificate of ownership. Locate the key details.
Return ONLY JSON: {"is_deed": boolean, "regions": [{"kind": "owner"|"space", "text": string exactly as written, "box_2d": [ymin, xmin, ymax, xmax]}]}
- "owner": each owner/purchaser name line.
- "space": each section / lot / block / grave / space / crypt / niche identifier line.
box_2d is 0-1000 relative to the image as provided. Boxes must be tight around the text. Never invent text; at most 12 regions. If it is not a deed, is_deed=false and regions=[].`;
      const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3.8-flash", response_format: { type: "json_object" },
          messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:${mime};base64,${btoa(bin)}` } }] }] }),
      });
      if (ai.status === 429 || ai.status === 402) return json({ deed: { url: signed?.signedUrl, name: deed.name }, highlights: null, error: ai.status === 402 ? "AI credits used up" : "AI busy" });
      if (!ai.ok) throw new Error(`Deed reading failed (${ai.status})`);
      const raw = (await ai.json())?.choices?.[0]?.message?.content ?? "{}";
      let p: any = {}; try { p = JSON.parse(String(raw).replace(/^```json|```$/g, "").trim()); } catch { p = {}; }
      const regions = (Array.isArray(p.regions) ? p.regions : []).filter((r: any) => Array.isArray(r?.box_2d) && r.box_2d.length === 4 && r.box_2d.every((n: any) => Number.isFinite(Number(n))))
        .slice(0, 12).map((r: any) => ({ kind: r.kind === "owner" ? "owner" : "space", text: String(r.text ?? "").slice(0, 160), box: r.box_2d.map((n: any) => Math.max(0, Math.min(1000, Number(n)))) }));
      cached = { path: deed.path, is_deed: p.is_deed !== false, regions, scanned_at: new Date().toISOString() };
      await db.storage.from(BUCKET).upload(cachePath(id), new Blob([JSON.stringify(cached)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
    }
    return json({ deed: { url: signed?.signedUrl ?? null, name: deed.name }, highlights: cached });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Failed" }, 500);
  }
});
