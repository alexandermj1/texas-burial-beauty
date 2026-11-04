import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ExternalLink, Loader2 } from "lucide-react";

// Deeds received from this moment onwards are outlined automatically the first
// time a staff member opens the record (one cheap AI read, then cached).
const AUTO_OUTLINE_FROM = "2026-11-04T19:00:00Z";

type Region = { kind: "owner" | "space"; text: string; box: [number, number, number, number] };
type Resp = { deed: { url: string | null; name: string } | null; highlights: { is_deed: boolean; regions: Region[] } | null };

// Draw the photo the way the browser shows it (EXIF rotation applied) so the AI's
// boxes line up with what staff see.
async function uprightJpeg(url: string): Promise<string | null> {
  try {
    const blob = await (await fetch(url)).blob();
    const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } catch { return null; }
}

const cache = new Map<string, Resp>();

export default function SellerDeedPreview({ submissionId, createdAt, sellingLocation, deedLocation }: { submissionId: string; createdAt?: string | null; sellingLocation?: string; deedLocation?: string }) {
  const [data, setData] = useState<Resp | null>(cache.get(submissionId) ?? null);
  const [loading, setLoading] = useState(!cache.has(submissionId));
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (cache.has(submissionId)) { setData(cache.get(submissionId)!); setLoading(false); return; }
    let alive = true;
    setLoading(true); setData(null);
    const auto = !!createdAt && createdAt >= AUTO_OUTLINE_FROM;
    (async () => {
      const call = (action: string, image?: string) => supabase.functions.invoke("deed-highlights", { body: { submission_id: submissionId, action, image } });
      let { data: r } = await call("view");
      if (alive && r?.deed && !r.highlights && auto) {
        if (alive) { setData(r); setLoading(false); }
        const image = await uprightJpeg(r.deed.url);
        const scanned = image ? await call("scan", image) : { data: null };
        if (scanned.data?.deed) r = scanned.data;
      }
      if (!alive) return;
      const value = (r ?? { deed: null, highlights: null }) as Resp;
      cache.set(submissionId, value); setData(value); setLoading(false);
    })().catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [submissionId, createdAt]);

  if (loading && !data) return null;
  if (!data?.deed?.url) return null;
  const regions = data.highlights?.is_deed ? data.highlights.regions : [];
  const owners = regions.filter(r => r.kind === "owner").map(r => r.text).filter(Boolean);
  const spaces = regions.filter(r => r.kind === "space").map(r => r.text).filter(Boolean);

  const Deed = ({ big }: { big: boolean }) => (
    <div className="relative w-fit">
      <img src={data.deed!.url!} alt={`Deed: ${data.deed!.name}`} loading="lazy" className={`block w-auto rounded ${big ? "max-h-[640px] max-w-full" : "h-36 max-w-[180px] object-contain"}`} />
      {regions.map((r, i) => {
        const [y1, x1, y2, x2] = r.box;
        return <span key={i} title={r.text} className={`pointer-events-none absolute rounded-[2px] border-destructive ${big ? "border-2" : "border"}`}
          style={{ top: `${y1 / 10}%`, left: `${x1 / 10}%`, height: `${Math.max(1, (y2 - y1) / 10)}%`, width: `${Math.max(1, (x2 - x1) / 10)}%` }} />;
      })}
    </div>
  );

  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
      <div className="flex gap-4">
        <button type="button" onClick={() => setOpen(v => !v)} className="shrink-0 rounded-md bg-background p-1.5 shadow-sm ring-1 ring-border/60 transition hover:ring-primary/50" title={open ? "Hide large view" : "Enlarge deed"}>
          <Deed big={false} />
        </button>
        <div className="min-w-0 flex-1 space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Deed they sent</span>
            {regions.length > 0 && <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-sm border-2 border-destructive" />outlined</span>}
          </div>
          {deedLocation && <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">AI read from deed:</span> {deedLocation}</p>}
          {owners.length > 0 && <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Names:</span> {owners.join(" · ")}</p>}
          {spaces.length > 0 && <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Spaces:</span> {spaces.join(" · ")}</p>}
          {loading && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Outlining names and spaces…</p>}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
            <button type="button" onClick={() => setOpen(v => !v)} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />{open ? "Hide large view" : "Enlarge"}</button>
            <a href={data.deed.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><ExternalLink className="h-3 w-3" />Open full size</a>
          </div>
        </div>
      </div>
      {open && <div className="mt-3 flex justify-center rounded-lg bg-background p-2 ring-1 ring-border/60"><Deed big /></div>}
    </div>
  );
}
