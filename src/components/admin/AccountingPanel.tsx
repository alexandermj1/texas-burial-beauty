import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, RefreshCw, CheckCircle2, Clock, AlertCircle, Download, TrendingUp, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Tx {
  id: string;
  submission_id: string | null;
  kind: string;
  description: string | null;
  recipient_email: string | null;
  recipient_name: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  stripe_session_id: string | null;
  checkout_url: string | null;
  paid_at: string | null;
  created_at: string;
  environment: string;
}

interface SoldSubmission {
  id: string;
  name: string | null;
  cemetery: string | null;
  section: string | null;
  accepted_quote_amount: number | null;
  sold_price: number | null;
  sold_at: string | null;
  seller_payout_status: string | null;
  seller_payout_paid_at: string | null;
  email: string | null;
}

const fmt = (cents: number, currency = "usd") =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: currency.toUpperCase() });
const fmtDollars = (dollars: number | null | undefined) =>
  ((dollars ?? 0)).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function AccountingPanel() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [sold, setSold] = useState<SoldSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "failed">("all");

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: s }] = await Promise.all([
      supabase.from("payment_transactions").select("*").order("created_at", { ascending: false }).limit(500),
      supabase
        .from("contact_submissions")
        .select("id, name, cemetery, section, accepted_quote_amount, sold_price, sold_at, seller_payout_status, seller_payout_paid_at, email")
        .not("sold_at", "is", null)
        .order("sold_at", { ascending: false })
        .limit(200),
    ]);
    setTxs((t as Tx[]) || []);
    setSold((s as SoldSubmission[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredTxs = txs.filter(t => statusFilter === "all" ? true : t.status === statusFilter);

  // Stats
  const paidTxs = txs.filter(t => t.status === "paid");
  const totalCollected = paidTxs.reduce((a, b) => a + b.amount_cents, 0);
  const pendingPayouts = sold.filter(s => s.seller_payout_status === "pending");
  const pendingPayoutTotal = pendingPayouts.reduce((a, b) => a + (b.accepted_quote_amount || 0), 0);
  const totalProfit = sold
    .filter(s => s.sold_price != null && s.accepted_quote_amount != null)
    .reduce((a, b) => a + ((b.sold_price || 0) - (b.accepted_quote_amount || 0)), 0);

  const markPayoutPaid = async (subId: string) => {
    const { error } = await supabase
      .from("contact_submissions")
      .update({ seller_payout_status: "paid", seller_payout_paid_at: new Date().toISOString() })
      .eq("id", subId);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payout marked as paid" });
      load();
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Date sold", "Seller", "Cemetery", "Section", "Sold price", "Seller payout", "Profit", "Payout status"],
      ...sold.map(s => [
        s.sold_at ? new Date(s.sold_at).toLocaleDateString() : "",
        s.name || "",
        s.cemetery || "",
        s.section || "",
        fmtDollars(s.sold_price),
        fmtDollars(s.accepted_quote_amount),
        fmtDollars((s.sold_price || 0) - (s.accepted_quote_amount || 0)),
        s.seller_payout_status || "pending",
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `plot-sales-${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard icon={Wallet} label="Total collected" value={fmt(totalCollected)} subtitle={`${paidTxs.length} payments`} tint="emerald" />
        <StatCard icon={TrendingUp} label="Net profit" value={fmtDollars(totalProfit)} subtitle={`${sold.length} sold plots`} tint="primary" />
        <StatCard icon={Clock} label="Owed to sellers" value={fmtDollars(pendingPayoutTotal)} subtitle={`${pendingPayouts.length} pending`} tint="amber" />
        <StatCard icon={DollarSign} label="Listing fees" value={fmt(paidTxs.filter(t => t.kind === "listing_fee").reduce((a, b) => a + b.amount_cents, 0))} subtitle={`${paidTxs.filter(t => t.kind === "listing_fee").length} fees`} tint="violet" />
      </div>

      {/* Sold plots — accounting */}
      <div className="bg-card/80 backdrop-blur-md rounded-2xl border border-border/60 shadow-[0_4px_20px_-12px_hsl(var(--primary)/0.18)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div>
            <h3 className="font-display text-lg text-foreground">Sold plots — accounting</h3>
            <p className="text-xs text-muted-foreground">Sale price vs. seller payout (accepted quote)</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-border/60 hover:bg-muted/50">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-border/60 hover:bg-muted/50">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>
        {sold.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No plots sold yet. Send a payment link to a buyer to record a sale.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Seller</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Cemetery</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Sold for</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Seller payout</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Profit</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {sold.map(s => {
                  const profit = (s.sold_price || 0) - (s.accepted_quote_amount || 0);
                  const paid = s.seller_payout_status === "paid";
                  return (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.sold_at ? new Date(s.sold_at).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-3 text-foreground">{s.name || "—"}</td>
                      <td className="px-4 py-3 text-xs text-foreground">{s.cemetery || "—"}{s.section ? `, §${s.section}` : ""}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{fmtDollars(s.sold_price)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{fmtDollars(s.accepted_quote_amount)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${profit > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>{fmtDollars(profit)}</td>
                      <td className="px-4 py-3 text-center">
                        {paid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        ) : (
                          <button onClick={() => markPayoutPaid(s.id)} className="text-[11px] px-2.5 py-1 rounded-full border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100">
                            Mark payout sent
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment transactions log */}
      <div className="bg-card/80 backdrop-blur-md rounded-2xl border border-border/60 shadow-[0_4px_20px_-12px_hsl(var(--primary)/0.18)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div>
            <h3 className="font-display text-lg text-foreground">All payment links</h3>
            <p className="text-xs text-muted-foreground">{filteredTxs.length} transactions</p>
          </div>
          <div className="flex gap-1">
            {(["all", "paid", "pending", "failed"] as const).map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-full capitalize ${statusFilter === f ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:text-foreground"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : filteredTxs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No transactions to show.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">Created</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Kind</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Description</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Recipient</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Amount</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredTxs.map(t => (
                  <tr key={t.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs">
                      <KindBadge kind={t.kind} />
                    </td>
                    <td className="px-4 py-3 text-foreground text-xs max-w-xs truncate" title={t.description || ""}>{t.description || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{t.recipient_name || t.recipient_email || "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">{fmt(t.amount_cents, t.currency)}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatCard({ icon: Icon, label, value, subtitle, tint }: { icon: any; label: string; value: string; subtitle: string; tint: "emerald" | "primary" | "amber" | "violet" }) {
  const tints: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    primary: "bg-primary/5 border-primary/20 text-primary",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    violet: "bg-violet-50 border-violet-200 text-violet-700",
  };
  return (
    <div className={`rounded-2xl p-4 border ${tints[tint]}`}>
      <div className="flex items-center gap-2 mb-2"><Icon className="w-4 h-4 opacity-70" /><span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">{label}</span></div>
      <div className="text-xl font-display text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "paid") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700"><CheckCircle2 className="w-3 h-3" />Paid</span>;
  if (status === "failed") return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-rose-50 text-rose-700"><AlertCircle className="w-3 h-3" />Failed</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-700"><Clock className="w-3 h-3" />Pending</span>;
}

function KindBadge({ kind }: { kind: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    plot_sale: { label: "Plot sale", cls: "bg-primary/10 text-primary" },
    listing_fee: { label: "Listing fee", cls: "bg-violet-50 text-violet-700" },
    custom: { label: "Custom", cls: "bg-muted text-muted-foreground" },
  };
  const v = map[kind] || { label: kind, cls: "bg-muted text-muted-foreground" };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${v.cls}`}>{v.label}</span>;
}
