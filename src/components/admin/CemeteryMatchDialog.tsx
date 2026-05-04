// Shows what we have at (or near) the cemetery a seller/buyer mentioned:
//  - matched live inventory rows (ca_inventory)
//  - recent sales comps (public/sales_for_app.csv)
// Uses fuzzy matching to handle "Forest Lawn — Cypress" vs "Forest Lawn Cypress" etc.
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Layers, History, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadSales, type SaleRow } from "@/lib/quoteEngine";
import { rankByCemetery, type Scored } from "@/lib/cemeteryMatch";
import { getPlotImage } from "@/lib/listingImages";

interface InventoryRow {
  id: string;
  cemetery: string;
  area: string | null;
  property_type: string | null;
  property_type_norm: string | null;
  location_details: string | null;
  retail_price: number | null;
  resale_price: number | null;
  owner_name: string | null;
  status: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  cemetery: string;
  city?: string | null;
  propertyType?: string | null;
  spaces?: string | null;
}

const fmt = (n: number | null | undefined) =>
  n != null ? `$${Math.round(Number(n)).toLocaleString()}` : "—";

const CemeteryMatchDialog = ({ open, onClose, cemetery, city, propertyType, spaces }: Props) => {
  const [inv, setInv] = useState<Scored<InventoryRow>[]>([]);
  const [sales, setSales] = useState<Scored<SaleRow>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const [{ data }, salesAll] = await Promise.all([
        supabase
          .from("ca_inventory" as any)
          .select("id,cemetery,area,property_type,property_type_norm,location_details,retail_price,resale_price,owner_name,status")
          .eq("status", "active")
          .limit(2000),
        loadSales(),
      ]);
      if (!mounted) return;
      setInv(rankByCemetery(cemetery, (data as InventoryRow[]) || [], { city, threshold: 0.3 }).slice(0, 25));
      setSales(rankByCemetery(cemetery, salesAll, { city, threshold: 0.35 }).slice(0, 30));
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [open, cemetery, city]);

  const requestedImg = useMemo(
    () => getPlotImage(propertyType || "", Number(spaces || 1) || 1),
    [propertyType, spaces],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            onClick={e => e.stopPropagation()}
            className="bg-card rounded-2xl shadow-hover border border-border/50 w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-start justify-between p-5 border-b border-border/40">
              <div className="flex items-center gap-3">
                {propertyType && (
                  <img src={requestedImg} alt="" className="w-12 h-12 rounded-lg object-cover bg-muted/40" />
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">Inventory & comps</p>
                  <h3 className="font-display text-lg text-foreground">{cemetery}</h3>
                  {(city || propertyType) && (
                    <p className="text-xs text-muted-foreground">
                      {[city, propertyType, spaces ? `${spaces} space${Number(spaces) > 1 ? "s" : ""}` : null]
                        .filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Live inventory */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">
                    Matched inventory <span className="text-muted-foreground font-normal">({inv.length})</span>
                  </h4>
                </div>
                {loading ? (
                  <p className="text-xs text-muted-foreground">Loading…</p>
                ) : inv.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nothing currently in stock that fuzzy-matches "{cemetery}". Worth sourcing.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border/50">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                        <tr>
                          <th className="text-left px-3 py-2">Cemetery</th>
                          <th className="text-left px-3 py-2">Area</th>
                          <th className="text-left px-3 py-2">Type</th>
                          <th className="text-right px-3 py-2">Retail</th>
                          <th className="text-right px-3 py-2">Resale</th>
                          <th className="text-right px-3 py-2">Match</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.map(({ item: r, score }) => (
                          <tr key={r.id} className="border-t border-border/40">
                            <td className="px-3 py-2 text-foreground">{r.cemetery}</td>
                            <td className="px-3 py-2 text-muted-foreground">{r.area || "—"}</td>
                            <td className="px-3 py-2">{r.property_type || r.property_type_norm || "—"}</td>
                            <td className="px-3 py-2 text-right">{fmt(r.retail_price)}</td>
                            <td className="px-3 py-2 text-right font-medium text-emerald-700">{fmt(r.resale_price)}</td>
                            <td className="px-3 py-2 text-right text-[10px] text-muted-foreground">{Math.round(score * 100)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Recent sales comps */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <History className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-medium text-foreground">
                    Recent sales at this cemetery <span className="text-muted-foreground font-normal">({sales.length})</span>
                  </h4>
                </div>
                {loading ? (
                  <p className="text-xs text-muted-foreground">Loading…</p>
                ) : sales.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No comparable sales on file for this cemetery yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border/50">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                        <tr>
                          <th className="text-left px-3 py-2">Cemetery</th>
                          <th className="text-left px-3 py-2">Lawn / Garden</th>
                          <th className="text-left px-3 py-2">Type</th>
                          <th className="text-right px-3 py-2">Retail</th>
                          <th className="text-right px-3 py-2">Sold</th>
                          <th className="text-right px-3 py-2">% of Retail</th>
                          <th className="text-right px-3 py-2">Year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map(({ item: r }, i) => (
                          <tr key={i} className="border-t border-border/40">
                            <td className="px-3 py-2 text-foreground">{r.cem_key}</td>
                            <td className="px-3 py-2 text-muted-foreground">{r.lawn_key || "—"}</td>
                            <td className="px-3 py-2">{r.ptype_norm}</td>
                            <td className="px-3 py-2 text-right">{fmt(r.retail_price)}</td>
                            <td className="px-3 py-2 text-right font-medium text-emerald-700">{fmt(r.resale_price)}</td>
                            <td className="px-3 py-2 text-right">{(r.resale_pct * 100).toFixed(0)}%</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">{r.year ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Fuzzy match — names are normalised so variants of "{cemetery}" still surface.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CemeteryMatchDialog;
