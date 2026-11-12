// Lets sellers (who never log in) see only the files inside their own private
// upload folder. Folder names are long random ids the seller's link already
// carries; listing the whole bucket is not possible from the browser.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ID = /^[0-9a-f-]{16,}$/;

/** Returns the folder prefix if it is an allowed seller folder, else null. */
export function sellerFolder(bucket: string, folder: string): string | null {
  const f = String(folder ?? "").replace(/\/+$/, "");
  if (bucket === "portal-uploads") return ID.test(f) ? f : null;
  if (bucket === "customer-files") {
    const m = f.match(/^public-intake\/([^/]+)$/);
    return m && ID.test(m[1]) ? f : null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const { bucket, folder, prefix, path } = await req.json();
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (path) {
      const p = String(path);
      const dir = sellerFolder(bucket, p.slice(0, p.lastIndexOf("/")));
      if (!dir || p.includes("..")) return json({ error: "Not allowed" }, 403);
      const { data, error } = await db.storage.from(bucket).createSignedUrl(p, 3600);
      if (error) return json({ error: error.message }, 404);
      return json({ url: data.signedUrl });
    }
    const dir = sellerFolder(bucket, folder);
    if (!dir) return json({ error: "Not allowed" }, 403);
    const { data, error } = await db.storage.from(bucket).list(dir, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    if (error) return json({ error: error.message }, 500);
    const files = (data ?? []).filter((o) => o.name && o.id && (!prefix || o.name.startsWith(String(prefix))));
    const paths = files.map((o) => `${dir}/${o.name}`);
    const signed = paths.length ? (await db.storage.from(bucket).createSignedUrls(paths, 3600)).data ?? [] : [];
    return json({
      files: files.map((o, i) => ({
        name: o.name, path: paths[i], created_at: o.created_at,
        size: (o.metadata as { size?: number } | null)?.size ?? 0,
        url: signed[i]?.signedUrl ?? "",
      })),
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
});
