import { useEffect, useMemo, useState } from "react";
import { X, ArrowUpDown, ArrowUp, ArrowDown, Download, Printer, Search, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { quoteFigures, normalizeBuyerFees } from "@/lib/quoteFigures";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenSubmission?: (id: string) => void;
}

type Row = {
  id: string;
  seller: string;
  cemetery: string;
  city: string;
  location: string;
  propertyType: string;
  plots: number;
  netPerSpace: number;
  transferFee: number;
  sellerTotal: number;
  buyerPerSpace: number;
  buyerTotal: number;
  retail: number | null;
  pctRetail: number | null;
  acceptedAt: string | null;
  status: string;
  stage: string;
  metro: string;
  listingNumber: string;
};

type Key = keyof Row;

const money = (n: number | null) => (n == null || !n ? "—" : `$${Math.round(n).toLocaleString()}`);
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");

const statusOf = (s: any): string => {
  if (s.sold_at) return "Sold";
  if (s.reserved_until && new Date(s.reserved_until) > new Date()) return "Reserved";
  if (s.listing_live_at) return "Listed";
  if (s.la_signed_at || s.contracts_completed_at) return "Agreement signed";
  return "Accepted";
};

// Where the seller sits in the process after accepting — most advanced milestone wins.
const stageOf = (s: any): string => {
  if (s.sold_at) return "Sold";
  if (s.contracts_completed_at) return "Completed";
  if (s.listing_live_at) return "Listed";
  if (s.la_signed_at) return "Agreement signed";
  if (s.documents_completed_at) return "Docs returned";
  if (s.documents_requested_at) return "Docs requested";
  return "Quote accepted";
};

const STAGE_CLS: Record<string, string> = {
  "Quote accepted": "bg-amber-500/10 text-amber-700",
  "Docs requested": "bg-sky-500/10 text-sky-700",
  "Docs returned": "bg-sky-600/15 text-sky-800",
  "Agreement signed": "bg-primary/10 text-primary",
  "Listed": "bg-emerald-500/10 text-emerald-700",
  "Completed": "bg-emerald-600/15 text-emerald-800",
  "Sold": "bg-emerald-600/20 text-emerald-900",
};

const COLS: { key: Key; label: string; num?: boolean }[] = [
  { key: "seller", label: "Seller" },
  { key: "cemetery", label: "Cemetery" },
  { key: "city", label: "City" },
  { key: "metro", label: "Metro area" },
  { key: "location", label: "Lawn / section / spaces" },
  { key: "propertyType", label: "Type" },
  { key: "plots", label: "Spaces", num: true },
  { key: "netPerSpace", label: "Seller net / space", num: true },
  { key: "transferFee", label: "Transfer fee", num: true },
  { key: "sellerTotal", label: "Seller total", num: true },
  { key: "buyerPerSpace", label: "Buyer price / space", num: true },
  { key: "buyerTotal", label: "Buyer total", num: true },
  { key: "retail", label: "Retail / space", num: true },
  { key: "pctRetail", label: "Buyer % of retail", num: true },
  { key: "status", label: "Status" },
  { key: "acceptedAt", label: "Accepted" },
];

const PriceSheetDialog = ({ open, onClose, onOpenSubmission }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "acceptedAt", dir: -1 });

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const [{ data }, { data: cemData }] = await Promise.all([
        supabase
          .from("contact_submissions")
          .select("id,name,cemetery,cemetery_city,lawn,section,space_numbers,property_type,plot_count,spaces,quote_amount,accepted_quote_amount,transfer_fee_amount,cemetery_retail,buyer_fees,quote_responded_at,sold_at,reserved_until,listing_live_at,la_signed_at,contracts_completed_at,documents_requested_at,documents_completed_at,listing_number,customer_kind")
          .eq("quote_response", "accepted")
          .is("deleted_at", null)
          .is("archived_at", null),
        supabase.from("texas_cemeteries").select("name,canonical_name,city,region").is("deleted_at", null),
      ]);
      // Metro area lookup: match on cemetery name (or canonical name), fall back to city.
      const byName = new Map<string, string>();
      const byCity = new Map<string, string>();
      for (const c of (cemData as any[]) || []) {
        const region = c.region || "";
        if (!region) continue;
        for (const n of [c.name, c.canonical_name]) {
          const k = String(n || "").trim().toLowerCase();
          if (k && !byName.has(k)) byName.set(k, region);
        }
        const ck = String(c.city || "").trim().toLowerCase();
        if (ck && !byCity.has(ck)) byCity.set(ck, region);
      }
      const metroOf = (s: any): string =>
        byName.get(String(s.cemetery || "").trim().toLowerCase()) ||
        byCity.get(String(s.cemetery_city || "").trim().toLowerCase()) || "";
      const out: Row[] = ((data as any[]) || [])
        .filter((s) => s.customer_kind !== "buyer")
        .map((s) => {
          const plots = Number(s.plot_count) || parseInt(String(s.spaces || ""), 10) || 1;
          const f = quoteFigures({
            quoteAmount: s.quote_amount,
            acceptedAmount: s.accepted_quote_amount,
            transferFee: s.transfer_fee_amount,
            plotCount: plots,
            buyerFees: normalizeBuyerFees(s.buyer_fees),
          });
          const retail = Number(s.cemetery_retail) || null;
          return {
            id: s.id,
            seller: s.name || "Unknown",
            cemetery: s.cemetery || "—",
            city: s.cemetery_city || "",
            location: [s.lawn, s.section, s.space_numbers].filter(Boolean).join(" · "),
            propertyType: s.property_type || "",
            plots: f.plotCount,
            netPerSpace: f.netPerSpace,
            transferFee: f.transferFee,
            sellerTotal: f.totalInclFee,
            buyerPerSpace: f.buyerPricePerSpace,
            buyerTotal: f.buyerPriceTotal,
            retail,
            pctRetail: retail && f.buyerPricePerSpace ? Math.round((f.buyerPricePerSpace / retail) * 100) : null,
            acceptedAt: s.quote_responded_at,
            status: statusOf(s),
            stage: stageOf(s),
            metro: metroOf(s),
            listingNumber: s.listing_number || "",
          };
        });
      setRows(out);
      setLoading(false);
    })();
  }, [open]);

  const view = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let r = rows.filter((x) => (status === "all" || x.status === status) &&
      (!needle || [x.seller, x.cemetery, x.city, x.location, x.propertyType, x.listingNumber].join(" ").toLowerCase().includes(needle)));
    const { key, dir } = sort;
    r = [...r].sort((a, b) => {
      const av = a[key], bv = b[key];
      if (av == null || av === "") return 1;
      if (bv == null || bv === "") return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return r;
  }, [rows, q, status, sort]);

  const totals = useMemo(() => ({
    plots: view.reduce((a, r) => a + r.plots, 0),
    seller: view.reduce((a, r) => a + r.sellerTotal, 0),
    buyer: view.reduce((a, r) => a + r.buyerTotal, 0),
  }), [view]);

  if (!open) return null;

  const toggle = (key: Key) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));

  const exportCsv = () => {
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [COLS.map((c) => esc(c.label)).join(",")].concat(
      view.map((r) => COLS.map((c) => esc(c.key === "acceptedAt" ? fmtDate(r.acceptedAt) : r[c.key])).join(",")),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `price-sheet-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const cell = (r: Row, key: Key) => {
    switch (key) {
      case "netPerSpace": case "transferFee": case "sellerTotal": case "buyerPerSpace": case "buyerTotal": case "retail":
        return money(r[key] as number);
      case "pctRetail":
        return r.pctRetail == null ? "—" : <span className={r.pctRetail > 70 ? "text-destructive font-semibold" : ""}>{r.pctRetail}%</span>;
      case "acceptedAt": return fmtDate(r.acceptedAt);
      case "seller": return <span className="font-medium text-foreground">{r.seller}{r.listingNumber && <span className="ml-1 text-[10px] text-muted-foreground">#{r.listingNumber}</span>}</span>;
      case "status": return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary whitespace-nowrap">{r.status}</span>;
      default: return (r[key] as any) || "—";
    }
  };

  const statuses = ["all", "Accepted", "Agreement signed", "Listed", "Reserved", "Sold"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-foreground/40 print:static print:bg-transparent print:p-0" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl w-full max-w-[1500px] h-[92vh] flex flex-col shadow-xl print:h-auto print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-border">
          <span className="w-9 h-9 rounded-full bg-primary/15 text-primary grid place-items-center"><FileSpreadsheet className="w-4 h-4" /></span>
          <div className="mr-auto">
            <h3 className="font-display text-lg text-foreground">Price sheet</h3>
            <p className="text-[11px] text-muted-foreground">Every seller who accepted their quote · {view.length} listing{view.length === 1 ? "" : "s"}</p>
          </div>
          <div className="relative print:hidden">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search seller, cemetery, lawn…" className="pl-8 pr-3 py-2 w-64 rounded-full bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="py-2 px-3 rounded-full bg-background border border-border text-xs print:hidden">
            {statuses.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>)}
          </select>
          <button onClick={exportCsv} className="print:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border text-xs hover:bg-muted"><Download className="w-3.5 h-3.5" /> CSV</button>
          <button onClick={() => window.print()} className="print:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border text-xs hover:bg-muted"><Printer className="w-3.5 h-3.5" /> Print</button>
          <button onClick={onClose} className="print:hidden text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <p className="p-10 text-center text-sm text-muted-foreground">Loading…</p>
          ) : view.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">No accepted listings match.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur z-10">
                <tr>
                  {COLS.map((c) => {
                    const active = sort.key === c.key;
                    const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
                    return (
                      <th key={c.key} className={`px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap ${c.num ? "text-right" : "text-left"}`}>
                        <button onClick={() => toggle(c.key)} className={`inline-flex items-center gap-1 hover:text-foreground ${active ? "text-foreground" : ""}`}>
                          {c.label}<Icon className="w-3 h-3 opacity-60" />
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {view.map((r, i) => (
                  <tr key={r.id} onClick={() => { onOpenSubmission?.(r.id); onClose(); }} className={`border-b border-border/40 cursor-pointer hover:bg-primary/5 ${i % 2 ? "bg-muted/20" : ""}`}>
                    {COLS.map((c) => (
                      <td key={c.key} className={`px-3 py-2 text-muted-foreground ${c.num ? "text-right tabular-nums" : ""}`}>{cell(r, c.key)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-card border-t border-border font-semibold text-foreground">
                <tr>
                  <td className="px-3 py-2.5" colSpan={5}>Totals ({view.length})</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{totals.plots}</td>
                  <td colSpan={2} />
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(totals.seller)}</td>
                  <td />
                  <td className="px-3 py-2.5 text-right tabular-nums">{money(totals.buyer)}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
        <p className="px-5 py-2 border-t border-border text-[10px] text-muted-foreground">
          Seller total includes the transfer fee once. Buyer price = (seller net + transfer fee) + 15% buyer's premium, plus any added fees. Red % means above the 70%-of-retail ceiling. Click a row to open that seller.
        </p>
      </div>
    </div>
  );
};

export default PriceSheetDialog;
