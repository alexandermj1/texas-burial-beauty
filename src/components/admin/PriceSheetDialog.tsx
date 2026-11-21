import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Download, Printer, Search, FileSpreadsheet, SlidersHorizontal, ChevronDown, ChevronRight, ExternalLink, RefreshCw, CheckCircle2, Clock3, AlertCircle, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { buildSheetRow, sheetEligible, type SheetRow, type SheetRecord, type SheetDocument, type SheetCemetery, type PaperworkState } from "@/lib/priceSheet";

interface Props { open: boolean; onClose: () => void; onOpenSubmission?: (id: string) => void }
type Key = keyof SheetRow;
const money = (n: number | null) => n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 });
const date = (s: string | null) => s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
const percent = (n: number | null) => n == null ? "—" : `${n.toFixed(1)}%`;
const PAPERWORK = {
  complete: { label: "All docs back", Icon: CheckCircle2, cls: "text-primary" },
  pending: { label: "Docs returning", Icon: Clock3, cls: "price-sheet-returning-label" },
  review: { label: "Check completion", Icon: AlertCircle, cls: "text-destructive" },
  not_requested: { label: "Docs not started", Icon: Circle, cls: "text-muted-foreground" },
} satisfies Record<PaperworkState, { label: string; Icon: typeof Circle; cls: string }>;
const COLS: { key: Key; label: string; num?: boolean }[] = [
  { key: "seller", label: "Seller" }, { key: "cemetery", label: "Cemetery" }, { key: "city", label: "City" }, { key: "metro", label: "Metro" },
  { key: "location", label: "Lawn / section / spaces" }, { key: "propertyType", label: "Type" }, { key: "plots", label: "Spaces", num: true },
  { key: "netPerSpace", label: "Property price / space", num: true }, { key: "transferFee", label: "Transfer fee · once", num: true },
  { key: "sellerTotal", label: "Property price · all spaces", num: true }, { key: "sellerProceeds", label: "Seller proceeds", num: true },
  { key: "buyerPerSpace", label: "Buyer · separate space", num: true }, { key: "buyerTotal", label: "Buyer · all spaces", num: true },
  { key: "sellerCommission", label: "Seller commission · 15%", num: true }, { key: "buyerCommission", label: "Buyer commission · 15%", num: true },
  { key: "profit", label: "Our gross commission", num: true }, { key: "extraFees", label: "Other buyer fees", num: true },
  { key: "adjustmentFee", label: "Brokerage adjustment · all spaces", num: true }, { key: "adjustmentPerSpace", label: "Brokerage adjustment · separate space", num: true },
  { key: "retail", label: "Retail / space", num: true }, { key: "pctRetail", label: "Separate buyer % of retail", num: true },
  { key: "pctRetailBundle", label: "Bundle buyer % of retail", num: true }, { key: "documentState", label: "Paperwork" },
  { key: "docsReceived", label: "Docs received", num: true }, { key: "docsTotal", label: "Docs required", num: true },
  { key: "status", label: "Status" }, { key: "stage", label: "Recorded stage" }, { key: "acceptedAt", label: "Accepted" }, { key: "listingNumber", label: "Listing number" },
];
const HEADERS: { key: Key; label: string; num?: boolean }[] = [
  { key: "cemetery", label: "Property" }, { key: "metro", label: "Metro" }, { key: "documentState", label: "Paperwork" },
  { key: "plots", label: "Spaces", num: true }, { key: "buyerPerSpace", label: "Buyer / space", num: true },
  { key: "buyerTotal", label: "Final buyer total", num: true }, { key: "adjustmentFee", label: "Adjustment fee", num: true }, { key: "profit", label: "Our gross earnings", num: true },
  { key: "pctRetail", label: "% of retail", num: true }, { key: "status", label: "Status" },
];

// Every read is paginated and errors are explicit: never present a truncated sheet as complete.
async function readPages<T>(query: (start: number, end: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const result: T[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await query(start, start + 999);
    if (error) throw new Error(error.message);
    const page = (data || []) as T[];
    result.push(...page);
    if (page.length < 1000) return result;
  }
}

const PriceSheetDialog = ({ open, onClose, onOpenSubmission }: Props) => {
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState("active");
  const [metro, setMetro] = useState("all");
  const [docsFilter, setDocsFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "metro", dir: 1 });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true); setError("");
    (async () => {
      try {
        const [submissions, directory] = await Promise.all([
          readPages<SheetRecord>((start, end) => supabase.from("contact_submissions")
            .select("id,name,source,customer_kind,cemetery,cemetery_city,lawn,section,space_numbers,property_type,plot_count,spaces,quote_amount,accepted_quote_amount,transfer_fee_amount,cemetery_retail,buyer_fees,quote_response,quote_responded_at,sold_at,closed_at,reserved_until,listing_live_at,la_signed_at,contracts_completed_at,documents_requested_at,documents_completed_at,ownership_answers,pipeline_stage_override,listing_number")
            .is("deleted_at", null).is("archived_at", null)
            .or("quote_response.eq.accepted,la_signed_at.not.is.null,listing_live_at.not.is.null,documents_completed_at.not.is.null,contracts_completed_at.not.is.null")
            .order("id").range(start, end)),
          readPages<SheetCemetery>((start, end) => supabase.from("texas_cemeteries").select("name,city,region,transfer_fee").is("deleted_at", null).order("id").range(start, end)),
        ]);
        const eligible = submissions.filter(sheetEligible);
        const documentGroups = await Promise.all(Array.from({ length: Math.ceil(eligible.length / 100) }, (_, index) => {
          const ids = eligible.slice(index * 100, (index + 1) * 100).map(s => s.id);
          return readPages<SheetDocument>((start, end) => supabase.from("submission_documents").select("submission_id,status,doc_code,document_type").is("deleted_at", null).in("submission_id", ids).order("id").range(start, end));
        }));
        const byId = new Map<string, SheetDocument[]>();
        for (const doc of documentGroups.flat()) byId.set(doc.submission_id, [...(byId.get(doc.submission_id) || []), doc]);
        if (live) {
          setRows(eligible.map(s => buildSheetRow(s, byId.get(s.id) || [], directory)));
          setUpdated(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
        }
      } catch (e) { if (live) setError(e instanceof Error ? e.message : "The full price sheet could not be loaded."); }
      finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [open, reload]);

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(r => (scope === "all" || (scope === "active" ? r.active : !r.active)) &&
      (metro === "all" || metro === r.metro) && (status === "all" || status === r.status) &&
      (docsFilter === "all" || (docsFilter === "issues" ? r.issues.length > 0 : r.documentState === docsFilter)) &&
      (!needle || [r.seller, r.cemetery, r.city, r.metro, r.location, r.propertyType, r.stage, r.listingNumber].join(" ").toLowerCase().includes(needle)))
      .sort((a, b) => {
        const av = a[sort.key], bv = b[sort.key];
        const missingA = av == null || av === "", missingB = bv == null || bv === "";
        if (missingA || missingB) return missingA === missingB ? a.id.localeCompare(b.id) : missingA ? 1 : -1;
        return (typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv))) * sort.dir || a.cemetery.localeCompare(b.cemetery) || a.id.localeCompare(b.id);
      });
  }, [rows, q, scope, metro, status, docsFilter, sort]);
  const toggleSort = (key: Key) => setSort(s => ({ key, dir: s.key === key && s.dir === 1 ? -1 : 1 }));
  const exportCsv = useCallback(() => {
    const esc = (v: unknown) => { const text = String(v ?? ""); return `"${(/^[=+@-]/.test(text) ? "'" : "") + text.replace(/"/g, '""')}"`; };
    const csv = [COLS.map(c => esc(c.label)).concat([esc("Buyer AI eligible"), esc("Checks / discrepancies")]).join(","), ...view.map(r => COLS.map(c => esc(c.key === "documentState" ? PAPERWORK[r.documentState].label : r[c.key])).concat([esc(r.aiEligible ? "Yes" : "No"), esc(r.issues.join(" | "))]).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `price-sheet-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }, [view]);
  const openRecord = (id: string) => { onClose(); onOpenSubmission?.(id); };
  const field = (label: string, value: string) => <div className="flex justify-between gap-4 border-b border-border/50 py-2 text-xs"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium tabular-nums">{value}</dd></div>;

  return <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
    <DialogContent className="flex h-[94dvh] w-[calc(100%-24px)] max-w-[1536px] flex-col gap-0 overflow-y-auto rounded-xl bg-card p-0 font-body sm:overflow-hidden [&_h2]:!font-body [&_h4]:!font-body sm:w-[calc(100%-48px)] motion-reduce:animate-none [&>button]:print:hidden">
      <header className="flex flex-wrap items-center shrink-0 gap-3 border-b border-border px-5 py-3 pr-12 sm:px-7 sm:pr-14">
        <FileSpreadsheet className="h-6 w-6 text-primary" />
        <div className="mr-auto min-w-0 flex-1"><DialogTitle className="text-xl font-semibold tracking-normal">Price sheet</DialogTitle><DialogDescription className="mt-1 text-xs">{loading ? "Checking inventory and paperwork…" : `${rows.filter(r => r.active).length} active seller records · ${rows.filter(r => !r.active).length} sold / closed · Checked ${updated || "—"}`}</DialogDescription></div>
        <div className="flex items-center gap-1 print:hidden">
          <Button variant="ghost" size="icon" title="Refresh price sheet" aria-label="Refresh price sheet" onClick={() => setReload(n => n + 1)} disabled={loading}><RefreshCw className={loading ? "animate-spin motion-reduce:animate-none" : ""} /></Button>
          <Button variant="ghost" size="icon" title="Download full CSV" aria-label="Download full CSV" onClick={exportCsv} disabled={loading || !!error}><Download /></Button>
          <Button variant="ghost" size="icon" title="Print price sheet" aria-label="Print price sheet" onClick={() => window.print()} disabled={loading || !!error}><Printer /></Button>
        </div>
      </header>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-muted/25 px-5 py-3 sm:px-7 print:hidden">
        <div className="relative min-w-40 flex-1"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search price sheet" value={q} onChange={e => setQ(e.target.value)} placeholder="Search seller, cemetery, section…" className="bg-card pl-9" /></div>
        <Button variant="outline" size="icon" className="sm:hidden" aria-label="Show price sheet filters" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(v => !v)}><SlidersHorizontal /></Button>
        <div className={`${filtersOpen ? "flex" : "hidden"} w-full flex-wrap gap-2 sm:contents`}>
        <Select value={scope} onValueChange={setScope}><SelectTrigger aria-label="Inventory scope" className="w-[calc(50%-4px)] bg-card sm:w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="history">Sold / closed</SelectItem><SelectItem value="all">All records</SelectItem></SelectContent></Select>
        <Select value={metro} onValueChange={setMetro}><SelectTrigger aria-label="Metro area" className="w-[calc(50%-4px)] bg-card sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All metro areas</SelectItem>{[...new Set(rows.map(r => r.metro))].sort().map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
        <Select value={docsFilter} onValueChange={setDocsFilter}><SelectTrigger aria-label="Paperwork filter" className="w-[calc(50%-4px)] bg-card sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All paperwork</SelectItem>{Object.entries(PAPERWORK).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}<SelectItem value="issues">Any checks needed</SelectItem></SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger aria-label="Listing status" className="w-[calc(50%-4px)] bg-card sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{["Accepted", "Agreement signed", "Listed", "Reserved", "Sold", "Closed"].map(s => <SelectItem value={s} key={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Select value={sort.key} onValueChange={key => setSort({ key: key as Key, dir: 1 })}><SelectTrigger aria-label="Sort price sheet" className="w-[calc(50%-4px)] bg-card sm:w-44"><SelectValue /></SelectTrigger><SelectContent>{COLS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent></Select>
        <Button variant="outline" size="icon" aria-label="Reverse sort order" title="Reverse sort order" onClick={() => setSort(s => ({ ...s, dir: s.dir === 1 ? -1 : 1 }))}>{sort.dir === 1 ? <ArrowUp /> : <ArrowDown />}</Button>
        </div>
      </div>
      <div className="min-h-[260px] shrink-0 overflow-auto sm:min-h-0 sm:flex-1" aria-busy={loading}>
        {error ? <div role="alert" className="p-8 text-sm"><p className="font-medium text-destructive">The complete sheet could not be verified.</p><p className="mt-2 text-muted-foreground">{error}</p><Button variant="outline" className="mt-4" onClick={() => setReload(n => n + 1)}><RefreshCw /> Try again</Button></div> : loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none" /> Checking all records…</div> : !view.length ? <p className="p-12 text-center text-sm text-muted-foreground">No inventory matches these filters.</p> : <table className="w-full min-w-[1180px] border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur"><tr>{HEADERS.map(c => <th key={c.key} aria-sort={sort.key === c.key ? sort.dir === 1 ? "ascending" : "descending" : "none"} className={`border-b border-border px-3 py-3 ${c.num ? "text-right" : "text-left"}`}><Button variant="ghost" onClick={() => toggleSort(c.key)} className={`h-auto gap-1 p-0 text-[11px] hover:bg-transparent ${sort.key === c.key ? "text-foreground" : "text-muted-foreground"}`}>{c.label}{sort.key !== c.key ? <ArrowUpDown className="!h-3 !w-3" /> : sort.dir === 1 ? <ArrowUp className="!h-3 !w-3" /> : <ArrowDown className="!h-3 !w-3" />}</Button></th>)}<th className="w-12"><span className="sr-only">Details</span></th></tr></thead>
          <tbody>{view.map(r => {
            const p = PAPERWORK[r.documentState]; const isOpen = expanded === r.id;
            return <Fragment key={r.id}><tr data-paperwork={r.documentState} className="price-sheet-row border-b border-border/60 transition-colors">
              <td className="max-w-[230px] px-4 py-4"><Button variant="link" className="h-auto max-w-full justify-start whitespace-normal p-0 text-left font-semibold text-foreground" onClick={() => openRecord(r.id)}>{r.cemetery}</Button><p className="mt-1 text-[11px] text-muted-foreground">{r.seller}{r.listingNumber ? ` · #${r.listingNumber}` : ""}</p><p className="mt-1 text-[11px] text-muted-foreground">{[r.location, r.propertyType].filter(Boolean).join(" · ") || "Location to confirm"}</p></td>
              <td className="max-w-36 px-3 py-4 text-muted-foreground">{r.metro}<span className="mt-1 block text-[11px]">{r.city}</span></td>
              <td className="px-3 py-4"><p className="mb-1 text-base font-semibold tabular-nums">{r.docsReceived}/{r.docsTotal} <span className="text-[10px] font-normal text-muted-foreground">docs returned</span></p><span className={`inline-flex items-center gap-1.5 whitespace-nowrap font-medium ${p.cls}`}><p.Icon className="h-3.5 w-3.5" />{r.documentState === "not_requested" && r.status === "Agreement signed" ? "Agreement only" : p.label}</span>{r.docsTotal === 0 && <span className="mt-1 block text-[10px] text-muted-foreground">Checklist not confirmed</span>}{r.issues.length > 0 && <Button variant="link" className="mt-1 h-auto p-0 text-[11px] text-muted-foreground" onClick={() => setExpanded(isOpen ? null : r.id)}>{r.issues.length} check{r.issues.length === 1 ? "" : "s"}</Button>}</td>
              <td className="px-3 py-4 text-right tabular-nums">{r.plots ?? "—"}</td><td className="px-3 py-4 text-right tabular-nums">{money(r.buyerPerSpace)}</td>
              <td className="px-3 py-4 text-right text-sm font-semibold tabular-nums">{money(r.buyerTotal)}</td><td className="px-3 py-4 text-right tabular-nums">{money(r.adjustmentFee)}<span className="mt-1 block text-[10px] text-muted-foreground">{money(r.adjustmentPerSpace)} separate</span></td><td className="px-3 py-4 text-right text-sm font-semibold tabular-nums">{money(r.profit)}</td>
              <td className="px-3 py-4 text-right tabular-nums text-muted-foreground">{percent(r.pctRetail)}<span className="mt-1 block text-[10px] text-muted-foreground">{percent(r.pctRetailBundle)} bundle</span></td>
              <td className="px-3 py-4"><p className="whitespace-nowrap font-medium">{r.status}</p><p className="mt-1 max-w-32 text-[10px] text-muted-foreground">{!r.aiEligible ? "Pricing / listing check needed" : r.documentState === "complete" ? "Paperwork returned" : "Transfer not ready"}</p></td>
              <td className="px-2"><Button variant="ghost" size="icon" aria-label={`Details for ${r.seller}`} aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : r.id)}>{isOpen ? <ChevronDown /> : <ChevronRight />}</Button></td>
            </tr>{isOpen && <tr><td colSpan={11} className="border-b border-border bg-muted/20 px-6 py-5"><div className="grid grid-cols-3 gap-8">
              <section><h4 className="mb-2 font-semibold">Price & proceeds</h4><dl>{field("Property price / space", money(r.netPerSpace))}{field("Property price · all spaces", money(r.sellerTotal))}{field("Seller commission · 15% of property", money(r.sellerCommission))}{field("Seller receives", money(r.sellerProceeds))}{field("Retail / space", money(r.retail))}{field("Accepted", date(r.acceptedAt))}</dl></section>
              <section><h4 className="mb-2 font-semibold">Final buyer price & our earnings</h4><dl>{field("Transfer fee · once per purchase", money(r.transferFee))}{field("Buyer commission · 15% of property + transfer", money(r.buyerCommission))}{field("Other buyer fees", money(r.extraFees))}{field("Brokerage adjustment · to 70% of retail", money(r.adjustmentFee))}{field("Buyer pays · all spaces together", money(r.buyerTotal))}{field("Our gross earnings · commissions + adjustment", money(r.profit))}</dl>{r.pricing.together && r.pricing.together.buyerFees.length > 0 && <p className="mt-2 text-[11px] text-muted-foreground">{r.pricing.together.buyerFees.map(f => `${f.label}: ${money(f.amount)}`).join(" · ")}</p>}<p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">The adjustment is added only when needed to reach 70% of saved retail. Higher totals stay unchanged. Gross earnings exclude operating costs, referral costs and upfront listing fees; other buyer fees are not assumed to be profit.</p></section>
              <section><h4 className="mb-2 font-semibold">Paperwork & listing evidence</h4><dl>{field("Recorded pipeline stage", r.stage)}{field("Buyer AI timing evidence", r.paperwork.aiReadiness)}{field("Checklist", `${r.docsReceived} / ${r.docsTotal} received`)}</dl>{r.paperwork.pending.length > 0 && <p className="mt-3 text-[11px] text-muted-foreground">Outstanding: {r.paperwork.pending.map(d => ({ D21: "Limited POA", D2P: "Photo ID", D2: "Photo ID", D1: "Deed", D6: "Death certificate", D12: "Heirship affidavit", LA: "Listing agreement", REVIEW: "Staff review", D15: "Existing outside POA" }[d.doc_code || ""] || d.document_type || d.doc_code || "Document")).join(" · ")}</p>}{r.issues.length > 0 && <ul className="mt-3 space-y-2 text-[11px] text-accent">{r.issues.map(issue => <li key={issue} className="flex gap-2"><AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />{issue}</li>)}</ul>}<Button variant="outline" size="sm" className="mt-4" onClick={() => openRecord(r.id)}><ExternalLink /> Open seller record</Button></section>
            </div></td></tr>}</Fragment>;
          })}</tbody>
        </table>}
      </div>
      <footer className="shrink-0 space-y-1 border-t border-border px-5 py-3 text-[11px] leading-relaxed text-muted-foreground sm:px-7">
        <p><span className="font-medium text-foreground">{view.length} records</span> · Buyer / space is a separate purchase including all saved buyer fees; final buyer total buys all spaces together, with one transfer fee. Both prices include the 15% buyer premium.</p>
        <p>Green = all paperwork returned · Blue = documents returning / completion needs checking · White = agreement only or documents not started. A signed agreement does not mean transfer-ready. Uploaded copies are not physical originals. New buyer totals are at least 70% of saved retail; higher prices stay unchanged.</p>
      </footer>
    </DialogContent>
  </Dialog>;
};
export default PriceSheetDialog;
