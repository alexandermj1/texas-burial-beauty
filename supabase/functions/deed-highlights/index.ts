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

async function isStaff(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data } = await db.auth.getUser(token);
  if (!data.user) return false;
  const { data: roles } = await db.from("user_roles").select("role").eq("user_id", data.user.id).in("role", ["admin", "staff"]);
  return Boolean(roles?.length);
}

type Cand = { path: string; name: string; score: number; at: string; pdf: boolean };

const IS_PDF = (name: string, mime?: string | null) => /\.pdf$/i.test(name) || mime === "application/pdf";
// Positive evidence a file IS the deed (from the AI file summary / type), and
// evidence it clearly is not (logos, blank images, IDs, medical/billing papers,
// sales contracts). A file only becomes the thumbnail with positive evidence —
// never as a "best of a bad bunch" fallback.
const DEED_TEXT = /(\bdeed\b|certificate of (interment|ownership|burial|title)|interment rights?|burial rights?|right of (interment|sepulture)|sepulture|deed of (sale|conveyance)|certificate of purchase)/i;
const NOT_DEED_TEXT = /(death certificate|driver|licen[cs]e|passport|\bid card\b|photo id|logo|linkedin|facebook|instagram|blank|damaged|no readable|unreadable|signature block|email signature|health|hospital|medical|patient|invoice|receipt|bank|statement|installment contract|retail installment|keyboard|screenshot of (an )?email|power of attorney|affidavit)/i;

function scoreFile(name: string, text: string): number {
  if (NOT_DEED_TEXT.test(text)) return 0;
  if (DEED_TEXT.test(text)) return 3;
  if (/(deed|certificate|sepulture|interment)/i.test(name)) return 1;
  return 0;
}

async function findDeed(submissionId: string): Promise<Cand | null> {
  const { data: sub } = await db.from("contact_submissions").select("id,customer_profile_id,seller_attachments,created_at").eq("id", submissionId).maybeSingle();
  if (!sub) return null;
  const c: Cand[] = [];
  const seen = new Set<string>();
  if (sub.customer_profile_id) {
    const { data } = await db.from("customer_files").select("file_name,file_path,mime_type,document_type,extracted_summary,created_at").eq("customer_profile_id", sub.customer_profile_id).is("deleted_at", null).order("created_at", { ascending: false }).limit(60);
    for (const f of data ?? []) {
      const name = f.file_name ?? "";
      const pdf = IS_PDF(name, f.mime_type);
      if (!pdf && !(IMG.test(name) || /^image\//.test(f.mime_type ?? ""))) continue;
      seen.add(f.file_path);
      const score = scoreFile(name, `${f.document_type ?? ""} ${f.extracted_summary ?? ""}`);
      // Images draw sharper thumbnails than a first PDF page, so prefer them on a tie.
      if (score > 0) c.push({ path: f.file_path, name, score: score + (pdf ? 0 : 0.1), at: f.created_at, pdf });
    }
  }
  for (const f of (Array.isArray(sub.seller_attachments) ? sub.seller_attachments : []) as any[]) {
    if (!f?.path || seen.has(f.path)) continue;
    const name = String(f.name ?? f.path);
    const pdf = IS_PDF(name, f.type);
    if (!pdf && !(IMG.test(name) || /^image\//.test(f.type ?? ""))) continue;
    const score = scoreFile(name, name);
    if (score > 0) c.push({ path: f.path, name, score: score + (pdf ? 0 : 0.1), at: sub.created_at, pdf });
  }
  c.sort((a, b) => b.score - a.score || b.at.localeCompare(a.at));
  return c[0] ?? null;
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
    if (cached && (cached.path !== deed.path || !cached.upright)) cached = null;

    if (body.action === "scan" && (!cached || body.force === true)) {
      // Phone photos often carry an EXIF rotation the AI ignores, so boxes would land
      // in the wrong place. The caller sends the image already turned upright, exactly
      // as the browser displays it; boxes are then relative to what staff see.
      const upright = typeof body.image === "string" && /^data:image\/jpeg;base64,/.test(body.image) && body.image.length < 9_000_000 ? body.image : null;
      if (!upright) return json({ error: "Upright image required" }, 400);
      const prompt = `This is a photo a seller sent us of a cemetery deed / certificate of ownership. Locate the key details.
Return ONLY JSON: {"is_deed": boolean, "regions": [{"kind": "owner"|"space", "text": string exactly as written, "box_2d": [ymin, xmin, ymax, xmax]}]}
- "owner": each owner/purchaser name line.
- "space": each section / lot / block / grave / space / crypt / niche identifier line.
box_2d is 0-1000 relative to the image as provided. Boxes must be tight around the text. Never invent text; at most 12 regions. If it is not a deed, is_deed=false and regions=[].`;
      const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-3.8-flash", response_format: { type: "json_object" },
          messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: upright } }] }] }),
      });
      if (ai.status === 429 || ai.status === 402) return json({ deed: { url: signed?.signedUrl, name: deed.name, pdf: deed.pdf }, highlights: null, error: ai.status === 402 ? "AI credits used up" : "AI busy" });
      if (!ai.ok) throw new Error(`Deed reading failed (${ai.status})`);
      const raw = (await ai.json())?.choices?.[0]?.message?.content ?? "{}";
      let p: any = {}; try { p = JSON.parse(String(raw).replace(/^```json|```$/g, "").trim()); } catch { p = {}; }
      const regions = (Array.isArray(p.regions) ? p.regions : []).filter((r: any) => Array.isArray(r?.box_2d) && r.box_2d.length === 4 && r.box_2d.every((n: any) => Number.isFinite(Number(n))))
        .slice(0, 12).map((r: any) => ({ kind: r.kind === "owner" ? "owner" : "space", text: String(r.text ?? "").slice(0, 160), box: r.box_2d.map((n: any) => Math.max(0, Math.min(1000, Number(n)))) }));
      cached = { path: deed.path, upright: true, is_deed: p.is_deed !== false, regions, scanned_at: new Date().toISOString() };
      await db.storage.from(BUCKET).upload(cachePath(id), new Blob([JSON.stringify(cached)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
    }
    return json({ deed: { url: signed?.signedUrl ?? null, name: deed.name, pdf: deed.pdf }, highlights: cached });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Failed" }, 500);
  }
});
