import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { DeedMatch } from "@/lib/deedLocationMatch";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Loader2, Maximize2 } from "lucide-react";

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

export default function SellerDeedPreview({ submissionId, createdAt, deedLocation, locationMatch, onOwners }: { submissionId: string; createdAt?: string | null; deedLocation?: string; locationMatch?: DeedMatch; onOwners?: (owners: string[]) => void }) {
  const [data, setData] = useState<Resp | null>(cache.get(submissionId) ?? null);
  const [loading, setLoading] = useState(!cache.has(submissionId));

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

  const ownerList = data?.highlights?.is_deed ? data.highlights.regions.filter(r => r.kind === "owner").map(r => r.text).filter(Boolean) : [];
  const ownerKey = ownerList.join("|");
  useEffect(() => { if (ownerKey) onOwners?.(ownerKey.split("|")); }, [ownerKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && !data) return null;
  if (!data?.deed?.url) return null;
  const regions = data.highlights?.is_deed ? data.highlights.regions : [];
  const spaces = regions.filter(r => r.kind === "space").map(r => r.text).filter(Boolean);

  // Draw the outline just outside the text so it never covers what staff are reading.
  const Deed = ({ big }: { big: boolean }) => (
    <div className="relative w-fit">
      <img src={data.deed!.url!} alt={`Deed: ${data.deed!.name}`} loading="lazy" className={`block w-auto rounded-sm ${big ? "max-h-[80vh] max-w-full" : "h-24 max-w-[140px] object-contain"}`} />
      {regions.map((r, i) => {
        const [y1, x1, y2, x2] = r.box;
        const padY = 0.9, padX = 0.6;
        return <span key={i} title={r.text} className="pointer-events-none absolute rounded-[3px] border border-destructive/90"
          style={{ top: `${Math.max(0, y1 / 10 - padY)}%`, left: `${Math.max(0, x1 / 10 - padX)}%`, height: `${(y2 - y1) / 10 + padY * 2}%`, width: `${(x2 - x1) / 10 + padX * 2}%` }} />;
      })}
    </div>
  );
  const showDetails = locationMatch !== "green";

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-muted/20 p-2.5">
      <Dialog>
        <DialogTrigger asChild>
          <button type="button" className="group relative shrink-0 overflow-hidden rounded-md bg-background p-1 ring-1 ring-border/60 transition hover:ring-primary/60" title="View deed">
            <Deed big={false} />
            <span className="absolute inset-0 grid place-items-center bg-foreground/0 opacity-0 transition group-hover:bg-foreground/25 group-hover:opacity-100"><Maximize2 className="h-4 w-4 text-background" /></span>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-5xl p-3">
          <DialogTitle className="sr-only">Deed they sent</DialogTitle>
          <div className="flex justify-center"><Deed big /></div>
          <a href={data.deed.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 justify-self-end text-xs text-muted-foreground hover:text-foreground"><ExternalLink className="h-3 w-3" />Open original</a>
        </DialogContent>
      </Dialog>
      <div className="min-w-0 flex-1 space-y-1 text-xs text-muted-foreground">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">Deed they sent</p>
        {showDetails ? <>
          {deedLocation && <p><span className="font-medium text-foreground">Deed reads:</span> {deedLocation}</p>}
          {!deedLocation && spaces.length > 0 && <p><span className="font-medium text-foreground">Spaces:</span> {spaces.join(" · ")}</p>}
        </> : <p>Matches the locations being sold.</p>}
        {loading && <p className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />Reading deed…</p>}
      </div>
    </div>
  );
}
