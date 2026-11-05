import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { DeedMatch } from "@/lib/deedLocationMatch";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Loader2, Maximize2 } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// When the deed was sent as a PDF, draw its first page as a picture so staff
// see the actual deed in the thumbnail (and the AI outlines line up with it).
async function pdfFirstPageJpeg(url: string): Promise<string | null> {
  try {
    const pdf = await pdfjs.getDocument({ url }).promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(3, 1600 / Math.max(base.width, base.height)) });
    const c = document.createElement("canvas");
    c.width = Math.round(viewport.width); c.height = Math.round(viewport.height);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    return c.toDataURL("image/jpeg", 0.85);
  } catch { return null; }
}

// Deeds received from this moment onwards are outlined automatically the first
// time a staff member opens the record (one cheap AI read, then cached).
const AUTO_OUTLINE_FROM = "2026-11-04T19:00:00Z";

type Region = { kind: "owner" | "space"; text: string; box: [number, number, number, number] };
type Resp = { deed: { url: string | null; name: string; pdf?: boolean; display?: string | null } | null; highlights: { is_deed: boolean; regions: Region[] } | null };

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
      let image: string | null = null;
      if (alive && r?.deed?.url && r.deed.pdf) {
        image = await pdfFirstPageJpeg(r.deed.url);
        r = { ...r, deed: { ...r.deed, display: image } };
      }
      if (alive && r?.deed && !r.highlights && auto) {
        if (alive) { setData(r); setLoading(false); }
        if (!image) image = await uprightJpeg(r.deed.url);
        const scanned = image ? await call("scan", image) : { data: null };
        if (scanned.data?.deed) r = { ...scanned.data, deed: { ...scanned.data.deed, display: r.deed.display } };
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
  if (data.deed.pdf && !data.deed.display) return null;
  const src = data.deed.display || data.deed.url;
  const regions = data.highlights?.is_deed ? data.highlights.regions : [];
  const spaces = regions.filter(r => r.kind === "space").map(r => r.text).filter(Boolean);

  // Draw the outline just outside the text so it never covers what staff are reading.
  const Deed = ({ big }: { big: boolean }) => (
    <div className="relative w-fit">
      <img src={src} alt={`Deed: ${data.deed!.name}`} loading="lazy" className={`block w-auto rounded-sm ${big ? "max-h-[80vh] max-w-full" : "h-24 max-w-[140px] object-contain"}`} />
      {regions.map((r, i) => {
        const [y1, x1, y2, x2] = r.box;
        const padY = 0.9, padX = 0.6;
        return <span key={i} title={r.text} className="pointer-events-none absolute rounded-[3px] border border-destructive/90"
          style={{ top: `${Math.max(0, y1 / 10 - padY)}%`, left: `${Math.max(0, x1 / 10 - padX)}%`, height: `${(y2 - y1) / 10 + padY * 2}%`, width: `${(x2 - x1) / 10 + padX * 2}%` }} />;
      })}
    </div>
  );
  const owners = regions.filter(r => r.kind === "owner").map(r => r.text).filter(Boolean);
  const matchLabel = locationMatch === "green" ? "Matches the locations being sold" : locationMatch === "orange" ? "Selling only some of the spaces on the deed" : locationMatch === "red" ? "Includes a space not on the deed" : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="group relative shrink-0 overflow-hidden rounded-md bg-background p-0.5 shadow-sm ring-1 ring-border/60 transition hover:ring-primary/60" title="View the deed they sent">
          <img src={src} alt={`Deed: ${data.deed.name}`} loading="lazy" className="block h-16 w-12 rounded-[3px] object-cover" />
          <span className="absolute inset-0 grid place-items-center bg-foreground/0 opacity-0 transition group-hover:bg-foreground/30 group-hover:opacity-100"><Maximize2 className="h-3.5 w-3.5 text-background" /></span>
          {loading && <span className="absolute inset-0 grid place-items-center bg-background/60"><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /></span>}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Deed they sent</DialogTitle>
        <div className="grid md:grid-cols-[1fr_260px]">
          <div className="flex justify-center bg-muted/30 p-4"><Deed big /></div>
          <aside className="space-y-4 border-t border-border/60 p-5 text-sm md:border-l md:border-t-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Read from the deed</p>
            {matchLabel && <p className="text-xs font-medium text-foreground">{matchLabel}</p>}
            {owners.length > 0 && <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Names</p><p className="mt-1 text-foreground">{owners.join(" · ")}</p></div>}
            {(deedLocation || spaces.length > 0) && <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Property</p><p className="mt-1 text-foreground">{deedLocation || spaces.join(" · ")}</p></div>}
            {!owners.length && !deedLocation && !spaces.length && <p className="text-xs text-muted-foreground">{loading ? "Reading deed…" : "Nothing read from this deed yet."}</p>}
            <a href={data.deed.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ExternalLink className="h-3 w-3" />Open original</a>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
