import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Award, Calendar, DollarSign, Building2, Search, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";

interface SaleRow {
  id: string;
  sale_date: string;
  sale_number: string | null;
  agent_name: string;
  is_mortuary: boolean;
  cemetery: string | null;
  listing_source: string | null;
  sale_amount: number | null;
  profit: number | null;
}

type RangeKey = "ytd" | "year" | "month" | "all";

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const AgentPerformancePanel = () => {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>("ytd");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth());
  const [showMortuaries, setShowMortuaries] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("agent_sales" as any)
        .select("*")
        .order("sale_date", { ascending: false });
      if (!error) setRows((data ?? []) as any);
      setLoading(false);
    })();
  }, []);

  const years = useMemo(() => {
    const ys = Array.from(new Set(rows.map((r) => parseISO(r.sale_date).getFullYear())));
    return ys.sort((a, b) => b - a);
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (!showMortuaries && r.is_mortuary) return false;
      const d = parseISO(r.sale_date);
      if (range === "year" && d.getFullYear() !== year) return false;
      if (range === "month" && (d.getFullYear() !== year || d.getMonth() !== month)) return false;
      if (range === "ytd") {
        const now = new Date();
        if (d.getFullYear() !== now.getFullYear()) return false;
      }
      return true;
    });
  }, [rows, range, year, month, showMortuaries]);

  // Aggregate by agent
  const byAgent = useMemo(() => {
    const map = new Map<string, { name: string; isMortuary: boolean; count: number; totalSale: number; totalProfit: number; lastSale: string; cemeteries: Map<string, number> }>();
    for (const r of filtered) {
      const key = r.agent_name;
      const cur = map.get(key) ?? { name: key, isMortuary: r.is_mortuary, count: 0, totalSale: 0, totalProfit: 0, lastSale: r.sale_date, cemeteries: new Map() };
      cur.count += 1;
      cur.totalSale += r.sale_amount ?? 0;
      cur.totalProfit += r.profit ?? 0;
      if (r.sale_date > cur.lastSale) cur.lastSale = r.sale_date;
      if (r.cemetery) cur.cemeteries.set(r.cemetery, (cur.cemeteries.get(r.cemetery) ?? 0) + 1);
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.totalProfit - a.totalProfit);
  }, [filtered]);

  const visible = byAgent.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  const totals = useMemo(
    () => ({
      sales: filtered.length,
      revenue: filtered.reduce((s, r) => s + (r.sale_amount ?? 0), 0),
      profit: filtered.reduce((s, r) => s + (r.profit ?? 0), 0),
      agents: byAgent.length,
    }),
    [filtered, byAgent]
  );

  const selected = selectedAgent ? byAgent.find((a) => a.name === selectedAgent) : null;
  const selectedSales = selectedAgent ? filtered.filter((r) => r.agent_name === selectedAgent).sort((a, b) => b.sale_date.localeCompare(a.sale_date)) : [];

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading sales…</div>;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-card rounded-2xl p-4 shadow-soft flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-muted/50 rounded-full p-1">
          {(["ytd", "year", "month", "all"] as RangeKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setRange(k)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${range === k ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {k === "ytd" ? "Year-to-date" : k === "year" ? "By Year" : k === "month" ? "By Month" : "All time"}
            </button>
          ))}
        </div>
        {(range === "year" || range === "month") && (
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-background border border-border rounded-full px-4 py-1.5 text-sm">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        {range === "month" && (
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="bg-background border border-border rounded-full px-4 py-1.5 text-sm">
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{format(new Date(2000, i, 1), "MMMM")}</option>)}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer ml-auto">
          <input type="checkbox" checked={showMortuaries} onChange={(e) => setShowMortuaries(e.target.checked)} className="rounded" />
          Include mortuaries
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agent…"
            className="bg-background border border-border rounded-full pl-9 pr-4 py-1.5 text-sm w-48"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="Sales" value={totals.sales.toString()} />
        <StatCard icon={DollarSign} label="Revenue" value={fmtMoney(totals.revenue)} />
        <StatCard icon={Trophy} label="Profit" value={fmtMoney(totals.profit)} accent />
        <StatCard icon={Award} label="Active Agents" value={totals.agents.toString()} />
      </div>

      {/* Agents grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visible.map((a, idx) => (
          <motion.button
            key={a.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02 }}
            onClick={() => setSelectedAgent(a.name)}
            className="text-left bg-card rounded-2xl p-5 shadow-soft hover:shadow-md transition-all border border-transparent hover:border-primary/30"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg text-foreground">{a.name}</h3>
                  {idx === 0 && range !== "all" && <Trophy className="w-4 h-4 text-amber-500" />}
                </div>
                <span className={`inline-block mt-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${a.isMortuary ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {a.isMortuary ? "Mortuary" : "Agent"}
                </span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-display text-foreground">{a.count}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">sales</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Field label="Revenue" value={fmtMoney(a.totalSale)} />
              <Field label="Profit" value={fmtMoney(a.totalProfit)} highlight />
              <Field label="Avg sale" value={fmtMoney(a.totalSale / Math.max(1, a.count))} />
              <Field label="Last sale" value={format(parseISO(a.lastSale), "MMM d, yyyy")} />
            </div>
            {a.cemeteries.size > 0 && (
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-1 text-xs text-muted-foreground truncate">
                <Building2 className="w-3 h-3 flex-shrink-0" />
                Top: {Array.from(a.cemeteries.entries()).sort((x, y) => y[1] - x[1])[0][0]}
              </div>
            )}
          </motion.button>
        ))}
        {visible.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 text-center text-muted-foreground py-12">
            No sales for this period.
          </div>
        )}
      </div>

      {/* Agent detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedAgent(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border p-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-foreground">{selected.name}</h2>
                <p className="text-sm text-muted-foreground">{selected.count} sales · {fmtMoney(selected.totalProfit)} profit</p>
              </div>
              <button onClick={() => setSelectedAgent(null)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-5 space-y-2">
              {selectedSales.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{format(parseISO(s.sale_date), "MMM d, yyyy")}</span>
                    <span className="text-muted-foreground">{s.cemetery ?? "—"}</span>
                    {s.sale_number && <span className="text-xs text-muted-foreground">#{s.sale_number}</span>}
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground">{fmtMoney(s.sale_amount ?? 0)}</span>
                    <span className="font-medium text-emerald-700 w-20 text-right">{fmtMoney(s.profit ?? 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) => (
  <div className={`bg-card rounded-2xl p-4 shadow-soft ${accent ? "ring-1 ring-primary/30" : ""}`}>
    <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-2">
      <Icon className="w-3.5 h-3.5" /> {label}
    </div>
    <div className={`font-display text-2xl ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
  </div>
);

const Field = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className={`text-sm ${highlight ? "text-emerald-700 font-medium" : "text-foreground"}`}>{value}</div>
  </div>
);

export default AgentPerformancePanel;
