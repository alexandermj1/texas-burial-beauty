// AI-assisted quote estimator. Uses canonicalized cemetery + lawn (area) +
// property type so that "Forest Lawn", "Forest Lawn M.P.", and "Forest Lawn
// Mausoleum" all collapse, while still letting the admin pin the actual lawn
// (Hollywood Hills vs Glendale vs Cypress, etc.). Comps are pulled ONLY from
// the same cemetery — pricing is location-driven.

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Calculator, Sparkles, History, CheckCircle, XCircle, MapPin, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Estimate {
  id: string;
  cemetery: string;
  property_type: string | null;
  spaces: number;
  request_details: string | null;
  estimated_low: number | null;
  estimated_mid: number | null;
  estimated_high: number | null;
  confidence_score: number | null;
  confidence_label: string | null;
  comp_count: number;
  closest_comp: any;
  ai_explanation: string | null;
  ai_cost_estimate_usd: number | null;
  outcome: string;
  outcome_amount: number | null;
  outcome_at: string | null;
  generated_by_name: string | null;
  created_at: string;
}

interface CemRow { cemetery: string; cemetery_key: string; area: string | null; lawn_key: string; property_type: string | null; property_type_norm: string | null; }

interface EstimateResponse {
  estimate: Estimate;
  pool_description: string;
  inventory: any[];
  accepted_quotes: any[];
  declined_quotes: any[];
  debug: any;
}

const QuoteEstimatorPanel = () => {
  const { user } = useAuth();
  const [allRows, setAllRows] = useState<CemRow[]>([]);
  const [history, setHistory] = useState<Estimate[]>([]);
  const [form, setForm] = useState({ cemetery_key: "", lawn: "", property_type: "", spaces: 1, request_details: "" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<EstimateResponse | null>(null);
  const [outcomeAmount, setOutcomeAmount] = useState<string>("");

  useEffect(() => {
    (async () => {
      const [invRes, soldRes, qRes] = await Promise.all([
        supabase.from("ca_inventory" as any).select("cemetery,cemetery_key,area,lawn_key,property_type,property_type_norm").limit(2000),
        supabase.from("ca_sold_history" as any).select("cemetery,cemetery_key,area,lawn_key,property_type,property_type_norm").limit(3000),
        supabase.from("quote_estimates" as any).select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      const rows = [...(invRes.data ?? []), ...(soldRes.data ?? [])] as any[];
      setAllRows(rows.filter(r => r.cemetery_key));
      if (qRes.data) setHistory(qRes.data as any);
    })();
  }, []);

  // Canonical cemetery list (one entry per cemetery_key, prefer the longest display name)
  const cemeteries = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of allRows) {
      const existing = map.get(r.cemetery_key);
      if (!existing || (r.cemetery && r.cemetery.length > existing.length)) {
        map.set(r.cemetery_key, r.cemetery);
      }
    }
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allRows]);

  // Lawns available for the selected cemetery
  const lawns = useMemo(() => {
    if (!form.cemetery_key) return [];
    const set = new Set<string>();
    for (const r of allRows) {
      if (r.cemetery_key === form.cemetery_key && r.area) set.add(r.area);
    }
    return Array.from(set).sort();
  }, [allRows, form.cemetery_key]);

  // Property types observed at this cemetery (preferred) — falls back to all
  const propertyTypes = useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) {
      if (form.cemetery_key && r.cemetery_key !== form.cemetery_key) continue;
      if (r.property_type) set.add(r.property_type);
    }
    return Array.from(set).sort();
  }, [allRows, form.cemetery_key]);

  const selectedCemeteryLabel = useMemo(
    () => cemeteries.find(c => c.key === form.cemetery_key)?.label ?? "",
    [cemeteries, form.cemetery_key]
  );

  const handleEstimate = async () => {
    if (!form.cemetery_key) {
      toast({ title: "Pick a cemetery", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("estimate-quote", {
        body: {
          cemetery: selectedCemeteryLabel || form.cemetery_key,
          cemetery_key: form.cemetery_key,
          lawn: form.lawn || null,
          property_type: form.property_type || null,
          spaces: form.spaces,
          request_details: form.request_details || null,
          generated_by_user_id: user?.id ?? null,
          generated_by_name: user?.email ?? null,
        },
      });
      if (error) throw error;
      setResult(data as EstimateResponse);
      const { data: refreshed } = await supabase.from("quote_estimates" as any).select("*").order("created_at", { ascending: false }).limit(50);
      if (refreshed) setHistory(refreshed as any);
      toast({ title: "Estimate generated" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message ?? String(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const recordOutcome = async (id: string, outcome: "accepted" | "declined", amount?: number) => {
    const patch: any = { outcome, outcome_at: new Date().toISOString() };
    if (amount && !isNaN(amount)) patch.outcome_amount = amount;
    const { error } = await supabase.from("quote_estimates" as any).update(patch).eq("id", id);
    if (error) {
      toast({ title: "Could not save outcome", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Marked ${outcome}` });
    setHistory(prev => prev.map(h => h.id === id ? { ...h, ...patch } : h));
    if (result?.estimate.id === id) setResult({ ...result, estimate: { ...result.estimate, ...patch } });
  };

  const avgCost = history.length > 0
    ? history.reduce((s, h) => s + (h.ai_cost_estimate_usd ?? 0), 0) / history.length
    : 0;

  const fmt = (n: number | null | undefined) => n != null ? `$${Math.round(n).toLocaleString()}` : "—";
  const est = result?.estimate;

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-primary" />
          <h2 className="font-display text-xl text-foreground">New quote estimate</h2>
          <span className="ml-auto text-[11px] text-muted-foreground">
            Avg cost: <span className="font-medium">${avgCost.toFixed(4)}</span>/quote
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
          <div className="md:col-span-4">
            <label className="text-xs text-muted-foreground">Cemetery (canonical)</label>
            <select
              value={form.cemetery_key}
              onChange={e => setForm(p => ({ ...p, cemetery_key: e.target.value, lawn: "" }))}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Pick a cemetery…</option>
              {cemeteries.map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Lawn / area
            </label>
            <select
              value={form.lawn}
              onChange={e => setForm(p => ({ ...p, lawn: e.target.value }))}
              disabled={!form.cemetery_key}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
            >
              <option value="">{form.cemetery_key ? "Any lawn" : "Pick cemetery first"}</option>
              {lawns.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Package className="w-3 h-3" /> Property type
            </label>
            <input
              list="ce-pts"
              value={form.property_type}
              onChange={e => setForm(p => ({ ...p, property_type: e.target.value }))}
              placeholder="e.g. GR/SP, Single Crypt"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <datalist id="ce-pts">
              {propertyTypes.map(p => <option key={p} value={p} />)}
            </datalist>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Spaces</label>
            <input
              type="number" min={1} value={form.spaces}
              onChange={e => setForm(p => ({ ...p, spaces: Math.max(1, parseInt(e.target.value) || 1) }))}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-9">
            <label className="text-xs text-muted-foreground">Customer request details (optional)</label>
            <textarea
              rows={2} value={form.request_details}
              onChange={e => setForm(p => ({ ...p, request_details: e.target.value }))}
              placeholder="Any context from the customer's submission or call…"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <div className="md:col-span-3 flex items-end">
            <button
              onClick={handleEstimate}
              disabled={submitting || !form.cemetery_key}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {submitting ? "Estimating…" : "Generate estimate"}
            </button>
          </div>
        </div>
      </div>

      {/* Latest result */}
      {result && est && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-card rounded-2xl p-6 border border-primary/30 shadow-soft">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Recommended quote</p>
                <p className="font-display text-3xl text-foreground">{fmt(est.estimated_mid)}</p>
                <p className="text-sm text-muted-foreground">
                  Range: {fmt(est.estimated_low)} – {fmt(est.estimated_high)} · {est.spaces} sp
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Comp pool: <span className="font-medium">{result.pool_description}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Confidence</p>
                <p className={`font-display text-2xl ${
                  (est.confidence_score ?? 0) >= 60 ? "text-emerald-600" :
                  (est.confidence_score ?? 0) >= 40 ? "text-amber-600" : "text-destructive"
                }`}>
                  {est.confidence_label}
                </p>
                <p className="text-xs text-muted-foreground">{est.confidence_score}/100 · {est.comp_count} comps</p>
              </div>
            </div>

            {est.ai_explanation && (
              <div className="bg-muted/40 rounded-lg p-4 border border-border/50 mb-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> AI explanation
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{est.ai_explanation}</p>
              </div>
            )}

            {est.closest_comp && (
              <div className="bg-muted/40 rounded-lg p-4 border border-border/50 mb-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Closest comparable</p>
                <p className="text-sm text-foreground">
                  <span className="font-medium">{est.closest_comp.area || est.closest_comp.cemetery}</span>
                  {est.closest_comp.location ? ` · ${est.closest_comp.location}` : ""}
                  {est.closest_comp.property_type ? ` · ${est.closest_comp.property_type}` : ""}
                  <span className="font-semibold"> · {fmt(est.closest_comp.price)}</span>
                  <span className="text-xs text-muted-foreground"> · {est.closest_comp.source?.replace(/_/g, " ")}</span>
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="number" placeholder="Final amount sent ($)"
                value={outcomeAmount} onChange={e => setOutcomeAmount(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={() => recordOutcome(est.id, "accepted", parseFloat(outcomeAmount))}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-medium hover:opacity-90"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Mark accepted
              </button>
              <button
                onClick={() => recordOutcome(est.id, "declined")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-xs font-medium"
              >
                <XCircle className="w-3.5 h-3.5" /> Declined
              </button>
            </div>
          </div>

          {/* Inventory + comp snapshot */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-card rounded-2xl p-5 border border-border/50">
              <h3 className="font-display text-base text-foreground mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" /> Current inventory
                <span className="text-[10px] text-muted-foreground ml-auto">{result.inventory.length}</span>
              </h3>
              {result.inventory.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active inventory at this cemetery.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {result.inventory.map((r: any) => (
                    <div key={r.id} className={`text-xs p-2 rounded-lg border ${
                      r.lawn_match && r.pt_match ? "border-primary/40 bg-primary/5" :
                      r.lawn_match ? "border-emerald-300/40 bg-emerald-50/30" :
                      "border-border/50"
                    }`}>
                      <p className="font-medium text-foreground truncate">{r.area || "—"} · {r.property_type || "—"}</p>
                      <p className="text-muted-foreground truncate text-[11px]">{r.location_details}</p>
                      <p className="text-foreground mt-0.5">
                        Sell: <span className="font-semibold">{fmt(r.resale_price)}</span>
                        <span className="text-muted-foreground"> · retail {fmt(r.retail_price)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card rounded-2xl p-5 border border-border/50">
              <h3 className="font-display text-base text-foreground mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" /> Recent accepted quotes
                <span className="text-[10px] text-muted-foreground ml-auto">{result.accepted_quotes.length}</span>
              </h3>
              {result.accepted_quotes.length === 0 ? (
                <p className="text-xs text-muted-foreground">No accepted quotes yet at this cemetery.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {result.accepted_quotes.map((q: any, i: number) => (
                    <div key={i} className="text-xs p-2 rounded-lg border border-emerald-200/50 bg-emerald-50/30">
                      <p className="font-medium text-foreground truncate">{q.lawn || "—"} · {q.property_type || "—"}</p>
                      <p className="text-foreground">Accepted at <span className="font-semibold">{fmt(q.outcome_amount)}</span></p>
                      <p className="text-[10px] text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card rounded-2xl p-5 border border-border/50">
              <h3 className="font-display text-base text-foreground mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-destructive" /> Recently declined
                <span className="text-[10px] text-muted-foreground ml-auto">{result.declined_quotes.length}</span>
              </h3>
              {result.declined_quotes.length === 0 ? (
                <p className="text-xs text-muted-foreground">No declined quotes at this cemetery.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {result.declined_quotes.map((q: any, i: number) => (
                    <div key={i} className="text-xs p-2 rounded-lg border border-destructive/20 bg-destructive/5">
                      <p className="font-medium text-foreground truncate">{q.lawn || "—"} · {q.property_type || "—"}</p>
                      <p className="text-foreground">Quoted <span className="font-semibold">{fmt(q.estimated_mid)}</span></p>
                      <p className="text-[10px] text-muted-foreground">{new Date(q.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* History */}
      <div className="bg-card rounded-2xl p-6 border border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-display text-lg text-foreground">Recent quote estimates</h3>
          <span className="ml-auto text-xs text-muted-foreground">
            Acceptance rate: {(() => {
              const decided = history.filter(h => h.outcome !== "pending");
              if (decided.length === 0) return "0";
              return Math.round((history.filter(h => h.outcome === "accepted").length / decided.length) * 100);
            })()}%
          </span>
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No quotes generated yet.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {history.map(h => (
              <div key={h.id} className="bg-muted/30 rounded-lg p-3 border border-border/50 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{h.cemetery} · {h.property_type || "—"} · {h.spaces} sp</p>
                  <p className="text-[11px] text-muted-foreground">
                    By {h.generated_by_name || "—"} · {new Date(h.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{fmt(h.estimated_mid)}</p>
                  <p className="text-[10px] text-muted-foreground">{h.confidence_label}</p>
                </div>
                <div>
                  {h.outcome === "accepted" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px]"><CheckCircle className="w-3 h-3" /> Accepted{h.outcome_amount ? ` ${fmt(h.outcome_amount)}` : ""}</span>}
                  {h.outcome === "declined" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px]"><XCircle className="w-3 h-3" /> Declined</span>}
                  {h.outcome === "pending" && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => recordOutcome(h.id, "accepted")} className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Accept</button>
                      <button onClick={() => recordOutcome(h.id, "declined")} className="text-[10px] px-2 py-1 rounded-full bg-destructive/10 text-destructive">Decline</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteEstimatorPanel;
