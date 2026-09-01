// Deed viewer used while preparing the seller pack.
//
// Shows every document the seller sent (and anything on their customer file),
// renders PDFs properly (Chrome blocks cross-origin PDF iframes, so we draw
// them with pdf.js on a canvas), automatically finds and zooms in on the line
// where the owner names appear, and shows what the customer typed on the form
// next to what the deed actually says.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ExternalLink, Sparkles,
  FileText, Loader2, Crosshair, CheckCircle2, AlertTriangle,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

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

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const tokensOf = (s: string) =>
  new Set(norm(s.includes(",") ? s.split(",").reverse().join(" ") : s).split(" ").filter((t) => t.length > 1));

/** Do the customer's typed name and a deed name refer to the same person? */
const namesAgree = (a: string, b: string) => {
  const A = tokensOf(a), B = tokensOf(b);
  if (!A.size || !B.size) return false;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared += 1;
  return shared >= Math.min(2, Math.min(A.size, B.size));
};

/** Words that usually sit on the same line as the owner names on a deed. */
const OWNER_HINTS = /(owner|purchaser|grantee|holder of record|name of|conveyed to|issued to|buyer)/i;

export default function DeedNameChecker({ submissionId, onUseNames }: Props) {
  const [docs, setDocs] = useState<DeedDoc[]>([]);
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(1.6);
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<{ name: string; typedOwners: string }>({ name: "", typedOwners: "" });
  const [pdfError, setPdfError] = useState("");
  const [rendering, setRendering] = useState(false);
  const [foundLine, setFoundLine] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pageHostRef = useRef<HTMLDivElement | null>(null);
  const focusRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDocs([]);
    setIdx(0);
    (async () => {
      try {
        const { data: sub } = await supabase
          .from("contact_submissions")
          .select("seller_attachments, customer_profile_id, name, deed_owner_names")
          .eq("id", submissionId)
          .maybeSingle();
        const row = (sub as any) || {};
        if (!cancelled) {
          setCustomer({
            name: String(row.name || "").trim(),
            typedOwners: String(row.deed_owner_names || "").trim(),
          });
        }
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

        // Download each file and hand the viewer a same-origin blob URL —
        // Chrome refuses to display remote PDFs inside the admin panel.
        const signed = await Promise.all(
          entries.slice(0, 12).map(async (e) => {
            const { data: blob } = await supabase.storage.from("customer-files").download(e.path);
            if (!blob) return null;
            const lower = e.name.toLowerCase();
            const isPdf = (e.type || "").includes("pdf") || lower.endsWith(".pdf");
            const isImage = (e.type || "").startsWith("image/") || /\.(png|jpe?g|webp|gif|heic)$/i.test(lower);
            const typed = blob.type && blob.type !== "application/octet-stream"
              ? blob
              : new Blob([blob], { type: isPdf ? "application/pdf" : blob.type || "application/octet-stream" });
            return {
              name: e.name,
              url: URL.createObjectURL(typed),
              isImage,
              isPdf,
              names: e.names,
            } as DeedDoc;
          }),
        );
        if (cancelled) {
          signed.forEach((d) => d && URL.revokeObjectURL(d.url));
          return;
        }
        const list = (signed.filter(Boolean) as DeedDoc[]).sort((a, b) => b.names.length - a.names.length);
        setDocs(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [submissionId]);

  // Release blob URLs when the list is replaced or the panel closes.
  useEffect(() => () => { docs.forEach((d) => URL.revokeObjectURL(d.url)); }, [docs]);

  const current = docs[idx];
  const suggested = useMemo(() => {
    const all = new Set<string>();
    docs.forEach((d) => d.names.forEach((n) => all.add(n)));
    return Array.from(all).slice(0, 8);
  }, [docs]);

  /** Names we hunt for on the page: what the AI read plus what the customer typed. */
  const targets = useMemo(() => {
    const list = [...suggested, ...splitNames(customer.typedOwners), ...splitNames(customer.name)];
    return Array.from(new Set(list.map((n) => n.trim()).filter((n) => n.length > 2)));
  }, [suggested, customer]);

  // Render the current PDF with pdf.js, then jump to the owner-name line.
  useEffect(() => {
    const host = pageHostRef.current;
    if (!host || !current?.isPdf) return;
    let cancelled = false;
    setPdfError("");
    setRendering(true);
    setFoundLine(null);
    focusRef.current = null;
    const task = pdfjs.getDocument({ url: current.url });

    void task.promise.then(async (pdf) => {
      const staging = document.createElement("div");
      staging.className = "flex flex-col items-center gap-3";
      let hit: { wrap: HTMLElement; top: number; left: number; text: string } | null = null;

      for (let n = 1; n <= pdf.numPages && !cancelled; n += 1) {
        const page = await pdf.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const width = Math.max(260, (viewportRef.current?.clientWidth || 360) - 16);
        const viewport = page.getViewport({ scale: (width / base.width) * zoom });
        const wrap = document.createElement("div");
        wrap.className = "relative";
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Your browser could not draw this page.");
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.className = "block bg-background shadow-sm";
        wrap.appendChild(canvas);
        staging.appendChild(wrap);
        await page.render({
          canvasContext: ctx,
          viewport,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        }).promise;

        // Look for the owner line on this page and mark it.
        if (!hit) {
          try {
            const text = await page.getTextContent();
            for (const item of text.items as any[]) {
              const str = String(item?.str ?? "").trim();
              if (str.length < 3) continue;
              const matched = targets.some((t) => namesAgree(t, str)) || OWNER_HINTS.test(str);
              if (!matched) continue;
              const tx = pdfjs.Util.transform(viewport.transform, item.transform);
              const h = Math.hypot(tx[2], tx[3]) || 12;
              const w = Number(item.width || 0) * viewport.scale;
              const top = tx[5] - h;
              const mark = document.createElement("div");
              mark.className = "absolute rounded-sm ring-2 ring-primary bg-primary/15 pointer-events-none";
              mark.style.left = `${Math.max(0, tx[4] - 4)}px`;
              mark.style.top = `${Math.max(0, top - 4)}px`;
              mark.style.width = `${Math.max(24, w) + 8}px`;
              mark.style.height = `${h + 8}px`;
              wrap.appendChild(mark);
              hit = { wrap, top, left: tx[4], text: str };
              break;
            }
          } catch { /* text layer unavailable — silently skip smart zoom */ }
        }
      }
      if (cancelled) return;
      host.replaceChildren(...Array.from(staging.childNodes));
      setRendering(false);

      const scrollToHit = () => {
        const box = viewportRef.current;
        if (!box || !hit) return;
        box.scrollTop = Math.max(0, hit.wrap.offsetTop + hit.top - box.clientHeight / 3);
        box.scrollLeft = Math.max(0, hit.left - box.clientWidth / 3);
      };
      if (hit) {
        setFoundLine(hit.text);
        focusRef.current = scrollToHit;
        requestAnimationFrame(scrollToHit);
      }
    }).catch((cause: unknown) => {
      if (cancelled) return;
      setRendering(false);
      setPdfError(cause instanceof Error ? cause.message : "This PDF could not be displayed.");
    });

    return () => { cancelled = true; void task.destroy(); };
  }, [current, zoom, targets]);

  const refocus = useCallback(() => focusRef.current?.(), []);

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

  const agrees = suggested.some((n) =>
    namesAgree(n, customer.typedOwners || customer.name),
  );

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
            type="button" title="Jump back to the owner names"
            onClick={refocus}
            disabled={!foundLine}
            className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-40"
          >
            <Crosshair className="w-3.5 h-3.5" />
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

      {/* What the customer told us on the form, so it can be checked against the deed. */}
      {(customer.name || customer.typedOwners) && (
        <div className="px-2 py-1.5 border-b border-border/60 space-y-0.5 bg-muted/20">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            What the customer entered on the form
          </div>
          {customer.name && (
            <div className="text-[11px] text-foreground">
              Name on the enquiry: <span className="font-medium">{customer.name}</span>
            </div>
          )}
          {customer.typedOwners && (
            <div className="text-[11px] text-foreground">
              Owner(s) they typed: <span className="font-medium">{customer.typedOwners}</span>
            </div>
          )}
          {suggested.length > 0 && (
            <div className={`flex items-center gap-1 text-[10.5px] ${agrees ? "text-emerald-600" : "text-amber-600"}`}>
              {agrees
                ? <><CheckCircle2 className="w-3 h-3" /> Matches a name read off the deed</>
                : <><AlertTriangle className="w-3 h-3" /> Doesn't match the deed names — check before sending</>}
            </div>
          )}
        </div>
      )}

      <div ref={viewportRef} className="h-64 overflow-auto bg-muted/30 relative">
        {current?.isImage ? (
          <img
            src={current.url}
            alt={`Deed uploaded by the seller: ${current.name}`}
            style={{ width: `${zoom * 100}%`, maxWidth: "none" }}
            className="block"
          />
        ) : current?.isPdf ? (
          <>
            {rendering && (
              <div className="absolute inset-x-0 top-3 z-10 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Rendering the deed…
              </div>
            )}
            {pdfError && <div className="p-4 text-[11px] text-destructive">{pdfError}</div>}
            <div ref={pageHostRef} className="flex flex-col items-center gap-3 p-2" />
          </>
        ) : (
          <div className="p-4 text-[11px] text-muted-foreground">
            Preview not available —{" "}
            <a href={current?.url} target="_blank" rel="noopener noreferrer" className="text-primary underline">open it in a new tab</a>.
          </div>
        )}
      </div>

      {foundLine && (
        <div className="px-2 py-1 border-t border-border/60 text-[10.5px] text-muted-foreground truncate">
          Zoomed to: <span className="text-foreground">{foundLine}</span>
        </div>
      )}

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
