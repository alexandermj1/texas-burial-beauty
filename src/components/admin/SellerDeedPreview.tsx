import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ExternalLink, FileText, Loader2 } from "lucide-react";

// Deeds received from this moment onwards are outlined automatically the first
// time a staff member opens the record (one cheap AI read, then cached).
const AUTO_OUTLINE_FROM = "2026-11-04T19:00:00Z";

type Region = { kind: "owner" | "space"; text: string; box: [number, number, number, number] };
type Resp = { deed: { url: string | null; name: string } | null; highlights: { is_deed: boolean; regions: Region[] } | null };

const cache = new Map<string, Resp>();

export default function SellerDeedPreview({ submissionId, createdAt }: { submissionId: string; createdAt?: string | null }) {
  const [data, setData] = useState<Resp | null>(cache.get(submissionId) ?? null);
  const [loading, setLoading] = useState(!cache.has(submissionId));
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (cache.has(submissionId)) { setData(cache.get(submissionId)!); setLoading(false); return; }
    let alive = true;
    setLoading(true); setData(null);
    const auto = !!createdAt && createdAt >= AUTO_OUTLINE_FROM;
    (async () => {
      const call = (action: string) => supabase.functions.invoke("deed-highlights", { body: { submission_id: submissionId, action } });
      let { data: r } = await call("view");
      if (alive && r?.deed && !r.highlights && auto) {
        if (alive) { setData(r); setLoading(false); }
        const scanned = await call("scan");
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

  return (
    <div className="rounded-xl border border-border/70 bg-muted/20">
      <button type="button" onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <FileText className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Deed they sent</span>
        {regions.length > 0 && <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-sm border-2 border-destructive" />Names &amp; spaces outlined</span>}
        <ChevronDown className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="grid gap-4 border-t border-border/60 p-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <a href={data.deed.url} target="_blank" rel="noreferrer" className="group block rounded-lg bg-background p-2 shadow-sm ring-1 ring-border/60" title="Open full size">
            <div className="relative mx-auto w-fit">
              <img src={data.deed.url} alt={`Deed: ${data.deed.name}`} loading="lazy" className="block max-h-[380px] w-auto max-w-full rounded" />
              {regions.map((r, i) => {
                const [y1, x1, y2, x2] = r.box;
                return <span key={i} title={r.text} className="pointer-events-none absolute rounded-[3px] border-2 border-destructive shadow-[0_0_0_2px_hsl(var(--background)/0.6)]"
                  style={{ top: `${y1 / 10}%`, left: `${x1 / 10}%`, height: `${Math.max(1, (y2 - y1) / 10)}%`, width: `${Math.max(1, (x2 - x1) / 10)}%` }} />;
              })}
            </div>
          </a>
          <div className="min-w-0 space-y-3 text-sm">
            {owners.length > 0 && <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Names on deed</p>{owners.map((o, i) => <p key={i} className="font-medium text-foreground">{o}</p>)}</div>}
            {spaces.length > 0 && <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Spaces on deed</p>{spaces.map((s, i) => <p key={i} className="text-foreground">{s}</p>)}</div>}
            {loading && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Outlining names and spaces…</p>}
            <a href={data.deed.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ExternalLink className="h-3 w-3" />{data.deed.name}</a>
          </div>
        </div>
      )}
    </div>
  );
}
