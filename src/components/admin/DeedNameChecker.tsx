// Deed viewer used while preparing the seller pack.
//
// Shows every document the seller sent (and anything on their customer file),
// lets the broker click through them, zoom in on the part of the page where the
// owner names sit, and one-click accept the names the AI extractor already read
// off the deed.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ExternalLink, Sparkles, FileText, Loader2 } from "lucide-react";

interface DeedDoc {
  name: string;
  url: string;
  isImage: boolean;
  isPdf: boolean;
  /** Owner-ish names the extractor read from this document. */
  names: string[];
}

interface Props {
  submissionId: string;
  /** Called when the broker accepts a suggested name (or all of them). */
  onUseNames: (names: string[]) => void;
}

const ZOOMS = [1, 1.6, 2.4, 3.2];

const splitNames = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.flatMap((r) => splitNames(r));
  if (typeof raw !== "string") return [];
  return raw
    .split(/\s*(?:,| and | & |;|\/)\s*/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 2 && /[a-z]/i.test(s));
};

export default function DeedNameChecker({ submissionId, onUseNames }: Props) {
  const [docs, setDocs] = useState<DeedDoc[]>([]);
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(1.6);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDocs([]);
    setIdx(0);
    (async () => {
      try {
        const { data: sub } = await supabase
          .from("contact_submissions")
          .select("seller_attachments, customer_profile_id")
          .eq("id", submissionId)
          .maybeSingle();
        const row = (sub as any) || {};
        const entries: { path: string; name: string; type?: string; names: string[] }[] = [];

        const atts = Array.isArray(row.seller_attachments) ? row.seller_attachments : [];
        for (const a of atts) {
          const path = String(a?.path ?? "");
          if (path) entries.push({ path, name: String(a?.name ?? "Attachment"), type: String(a?.type ?? ""), names: [] });
        }

        if (row.customer_profile_id) {
          const { data: files } = await supabase
            .from("customer_files" as any)
            .select("file_name, file_path, mime_type, extracted_data")
            .eq("customer_profile_id", row.customer_profile_id)
            .is("deleted_at", null);
          for (const f of (files as any[]) || []) {
            const path = String(f?.file_path ?? "");
            if (!path) continue;
            const ex = (f?.extracted_data || {}) as any;
            const names = [
              ...splitNames(ex.owners),
              ...splitNames(ex.purchaser),
              ...splitNames(ex.previous_owners),
            ];
            const existing = entries.find((e) => e.path === path);
            if (existing) existing.names = Array.from(new Set([...existing.names, ...names]));
            else entries.push({ path, name: String(f?.file_name ?? "Document"), type: String(f?.mime_type ?? ""), names });
          }
        }

        const signed = await Promise.all(
          entries.slice(0, 12).map(async (e) => {
            const { data: sd } = await supabase.storage.from("customer-files").createSignedUrl(e.path, 3600);
            if (!sd?.signedUrl) return null;
            const lower = e.name.toLowerCase();
            return {
              name: e.name,
              url: sd.signedUrl,
              isImage: (e.type || "").startsWith("image/") || /\.(png|jpe?g|webp|gif|heic)$/i.test(lower),
              isPdf: (e.type || "").includes("pdf") || lower.endsWith(".pdf"),
              names: e.names,
            } as DeedDoc;
          }),
        );
        if (cancelled) return;
        const list = (signed.filter(Boolean) as DeedDoc[]).sort((a, b) => b.names.length - a.names.length);
        setDocs(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [submissionId]);

  const current = docs[idx];
  const suggested = useMemo(() => {
    const all = new Set<string>();
    docs.forEach((d) => d.names.forEach((n) => all.add(n)));
    return Array.from(all).slice(0, 8);
  }, [docs]);

  if (loading) {
    return (
      <div className="rounded-md border border-border/60 bg-background/60 p-4 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading the deed…
      </div>
    );
  }

  if (!docs.length) {
    return (
      <div className="rounded-md border border-border/60 bg-background/60 p-4 text-[11px] text-muted-foreground italic">
        No deed or documents on file for this seller yet.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border/60 bg-background/60 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-border/60">
        <div className="flex items-center gap-1.5 min-w-0">
          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] text-foreground truncate" title={current?.name}>{current?.name}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">({idx + 1}/{docs.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button" title="Previous document"
            onClick={() => setIdx((i) => (i - 1 + docs.length) % docs.length)}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button" title="Next document"
            onClick={() => setIdx((i) => (i + 1) % docs.length)}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button" title="Zoom out"
            onClick={() => setZoom((z) => ZOOMS[Math.max(0, ZOOMS.indexOf(z) - 1)] ?? 1)}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button" title="Zoom in"
            onClick={() => setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(z) + 1)] ?? 3.2)}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <a
            href={current?.url} target="_blank" rel="noopener noreferrer" title="Open full document"
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="h-64 overflow-auto bg-muted/30">
        {current?.isImage ? (
          <img
            src={current.url}
            alt={`Deed uploaded by the seller: ${current.name}`}
            style={{ width: `${zoom * 100}%`, maxWidth: "none" }}
            className="block"
          />
        ) : current?.isPdf ? (
          <iframe src={`${current.url}#zoom=${Math.round(zoom * 100)}`} title={current.name} className="w-full h-full" />
        ) : (
          <div className="p-4 text-[11px] text-muted-foreground">
            Preview not available —{" "}
            <a href={current?.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">open it in a new tab</a>.
          </div>
        )}
      </div>

      {docs.length > 1 && (
        <div className="flex gap-1 overflow-x-auto px-2 py-1.5 border-t border-border/60">
          {docs.map((d, i) => (
            <button
              key={d.url}
              type="button"
              onClick={() => setIdx(i)}
              title={d.name}
              className={`shrink-0 rounded border overflow-hidden ${i === idx ? "border-primary" : "border-border/60"}`}
            >
              {d.isImage ? (
                <img src={d.url} alt="" className="h-12 w-12 object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center text-[9px] text-muted-foreground px-1 text-center">
                  {d.name.slice(0, 12)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {suggested.length > 0 && (
        <div className="border-t border-border/60 px-2 py-2 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary" />
            <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">
              Names the AI read on these documents
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {suggested.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onUseNames([n])}
                className="text-[11px] px-2 py-1 rounded-full border border-primary/40 text-primary hover:bg-primary/10"
                title="Add this name"
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onUseNames(suggested)}
              className="text-[11px] px-2 py-1 rounded-full bg-primary text-primary-foreground hover:opacity-90"
            >
              Use all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
