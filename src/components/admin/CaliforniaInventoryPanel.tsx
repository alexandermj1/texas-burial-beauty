// California-only admin inventory viewer (not exposed publicly).
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin } from "lucide-react";

const CaliforniaInventoryPanel = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ca_inventory" as any)
        .select("id,area,county,cemetery,property_type,location_details,retail_price,resale_price,owner_name,poa_date,status")
        .order("cemetery").limit(2000);
      if (data) setRows(data as any);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const s = q.toLowerCase();
    return rows.filter(r => [r.cemetery, r.area, r.property_type, r.location_details, r.owner_name]
      .filter(Boolean).some(v => String(v).toLowerCase().includes(s)));
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 inline mr-1" /> California inventory · {rows.length} active listings (admin-only, not shown publicly)
        </p>
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by cemetery, type, owner…"
            className="w-full pl-10 pr-4 py-2 rounded-full bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>
      {loading ? <div className="text-center py-12 text-sm text-muted-foreground">Loading…</div> : (
        <div className="bg-card rounded-2xl border border-border/50 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-[11px] uppercase">
              <tr>
                <th className="text-left px-3 py-2">Cemetery</th>
                <th className="text-left px-3 py-2">Area</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Location</th>
                <th className="text-right px-3 py-2">Retail</th>
                <th className="text-right px-3 py-2">Resale</th>
                <th className="text-left px-3 py-2">Owner</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map(r => (
                <tr key={r.id} className="border-t border-border/40 hover:bg-muted/30">
                  <td className="px-3 py-2 text-foreground">{r.cemetery}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.area}</td>
                  <td className="px-3 py-2">{r.property_type}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs truncate">{r.location_details}</td>
                  <td className="px-3 py-2 text-right">{r.retail_price ? `$${Number(r.retail_price).toLocaleString()}` : "—"}</td>
                  <td className="px-3 py-2 text-right font-medium text-emerald-700">{r.resale_price ? `$${Number(r.resale_price).toLocaleString()}` : "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{r.owner_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 500 && <p className="text-xs text-muted-foreground p-3">Showing first 500 of {filtered.length}. Refine your search.</p>}
        </div>
      )}
    </div>
  );
};

export default CaliforniaInventoryPanel;
