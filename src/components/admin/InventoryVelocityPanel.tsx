// Inventory velocity dashboard — flags cemeteries that are selling fast and
// where we are running low on stock. Pulls from agent_sales (real sale dates)
// + ca_inventory (current stock) + ca_sold_history (long-term demand signal).

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, AlertTriangle, Package, Flame, Snowflake } from "lucide-react";

interface CemeteryStats {
  cemetery: string;
  active_inventory: number;
  recent_sales_90d: number;
  recent_sales_365d: number;
  total_sold_history: number;
  velocity_score: number; // recent_sales_90d / max(active_inventory, 1)
  status: "hot" | "balanced" | "overstocked" | "stockout_risk";
}

const InventoryVelocityPanel = () => {
  const [stats, setStats] = useState<CemeteryStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Pull all the raw data; we aggregate client-side because it's small.
      const [invRes, salesRes, soldRes] = await Promise.all([
        supabase.from("ca_inventory" as any).select("cemetery,status").eq("status", "active"),
        supabase.from("agent_sales" as any).select("cemetery,sale_date"),
        supabase.from("ca_sold_history" as any).select("cemetery"),
      ]);

      const now = Date.now();
      const D90 = 1000 * 60 * 60 * 24 * 90;
      const D365 = 1000 * 60 * 60 * 24 * 365;

      const map = new Map<string, CemeteryStats>();
      const ensure = (name: string) => {
        if (!map.has(name)) {
          map.set(name, {
            cemetery: name,
            active_inventory: 0,
            recent_sales_90d: 0,
            recent_sales_365d: 0,
            total_sold_history: 0,
            velocity_score: 0,
            status: "balanced",
          });
        }
        return map.get(name)!;
      };

      // Normalize cemetery names so "Rose Hills G-01" and "Rose Hills" roll up.
      // Strategy: use the inventory cemetery name verbatim; for sales, find the
      // best-prefix match.
      const invNames = new Set<string>();
      for (const r of (invRes.data ?? []) as any[]) {
        if (!r.cemetery) continue;
        const e = ensure(r.cemetery);
        e.active_inventory++;
        invNames.add(r.cemetery);
      }

      const matchInvName = (raw: string): string => {
        if (!raw) return raw;
        if (invNames.has(raw)) return raw;
        // Find inv name that shares the first 2 words
        const head = raw.split(/\s+/).slice(0, 2).join(" ").toLowerCase();
        for (const n of invNames) {
          if (n.toLowerCase().startsWith(head)) return n;
        }
        return raw;
      };

      for (const s of (salesRes.data ?? []) as any[]) {
        if (!s.cemetery || !s.sale_date) continue;
        const cem = matchInvName(s.cemetery);
        const e = ensure(cem);
        const ts = new Date(s.sale_date).getTime();
        if (now - ts <= D90) e.recent_sales_90d++;
        if (now - ts <= D365) e.recent_sales_365d++;
      }
      for (const r of (soldRes.data ?? []) as any[]) {
        if (!r.cemetery) continue;
        ensure(matchInvName(r.cemetery)).total_sold_history++;
      }

      // Velocity + status classification
      for (const e of map.values()) {
        e.velocity_score = e.recent_sales_90d / Math.max(1, e.active_inventory);
        if (e.recent_sales_90d >= 2 && e.active_inventory <= 2) e.status = "stockout_risk";
        else if (e.recent_sales_90d >= 3 && e.velocity_score >= 1) e.status = "hot";
        else if (e.active_inventory >= 10 && e.recent_sales_365d <= 1) e.status = "overstocked";
        else e.status = "balanced";
      }

      const arr = Array.from(map.values()).sort((a, b) => b.velocity_score - a.velocity_score);
      setStats(arr);
      setLoading(false);
    })();
  }, []);

  const buckets = useMemo(() => ({
    stockout_risk: stats.filter(s => s.status === "stockout_risk"),
    hot: stats.filter(s => s.status === "hot"),
    balanced: stats.filter(s => s.status === "balanced"),
    overstocked: stats.filter(s => s.status === "overstocked"),
  }), [stats]);

  if (loading) return <div className="text-center py-12 text-sm text-muted-foreground">Loading inventory…</div>;

  return (
    <div className="space-y-6">
      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card icon={AlertTriangle} title="Stockout risk" count={buckets.stockout_risk.length} tone="destructive" desc="Selling fast, low inventory" />
        <Card icon={Flame} title="Hot cemeteries" count={buckets.hot.length} tone="amber" desc="High recent demand" />
        <Card icon={Package} title="Balanced" count={buckets.balanced.length} tone="muted" desc="Healthy stock levels" />
        <Card icon={Snowflake} title="Overstocked" count={buckets.overstocked.length} tone="primary" desc="Slow movers" />
      </div>

      {/* Stockout + Hot are the actionable lists */}
      {buckets.stockout_risk.length > 0 && (
        <Section title="🔴 Need more inventory urgently" rows={buckets.stockout_risk} accent="border-destructive/40 bg-destructive/5" />
      )}
      {buckets.hot.length > 0 && (
        <Section title="🔥 Hot cemeteries — prioritize sourcing" rows={buckets.hot} accent="border-amber-300/50 bg-amber-50" />
      )}

      {/* Full table */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-display text-base text-foreground">All cemeteries by velocity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-[11px] uppercase">
              <tr>
                <th className="text-left px-4 py-2">Cemetery</th>
                <th className="text-right px-4 py-2">Active stock</th>
                <th className="text-right px-4 py-2">Sold 90d</th>
                <th className="text-right px-4 py-2">Sold 365d</th>
                <th className="text-right px-4 py-2">Velocity</th>
                <th className="text-right px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(s => (
                <tr key={s.cemetery} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-4 py-2 text-foreground">{s.cemetery}</td>
                  <td className="px-4 py-2 text-right">{s.active_inventory}</td>
                  <td className="px-4 py-2 text-right">{s.recent_sales_90d}</td>
                  <td className="px-4 py-2 text-right">{s.recent_sales_365d}</td>
                  <td className="px-4 py-2 text-right font-medium">{s.velocity_score.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Card = ({ icon: Icon, title, count, tone, desc }: any) => {
  const toneCls: any = {
    destructive: "text-destructive",
    amber: "text-amber-600",
    primary: "text-primary",
    muted: "text-foreground",
  };
  return (
    <div className="bg-card rounded-xl p-4 border border-border/50">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${toneCls[tone]}`} />
        <p className="text-xs text-muted-foreground">{title}</p>
      </div>
      <p className={`text-2xl font-display ${toneCls[tone]}`}>{count}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{desc}</p>
    </div>
  );
};

const Section = ({ title, rows, accent }: { title: string; rows: CemeteryStats[]; accent: string }) => (
  <div className={`rounded-2xl border p-5 ${accent}`}>
    <h3 className="font-display text-base mb-3 text-foreground">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
      {rows.map(r => (
        <div key={r.cemetery} className="bg-card rounded-lg p-3 border border-border/50">
          <p className="text-sm font-medium text-foreground truncate">{r.cemetery}</p>
          <p className="text-[11px] text-muted-foreground">
            Stock: {r.active_inventory} · 90d sales: {r.recent_sales_90d} · 365d: {r.recent_sales_365d}
          </p>
        </div>
      ))}
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: CemeteryStats["status"] }) => {
  const map: any = {
    stockout_risk: { cls: "bg-destructive/10 text-destructive", label: "Need stock" },
    hot: { cls: "bg-amber-100 text-amber-700", label: "Hot" },
    balanced: { cls: "bg-muted text-muted-foreground", label: "Balanced" },
    overstocked: { cls: "bg-primary/10 text-primary", label: "Overstocked" },
  };
  const v = map[status];
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${v.cls}`}>{v.label}</span>;
};

export default InventoryVelocityPanel;
