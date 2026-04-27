// AI-assisted quote estimator. Generates a price range + confidence score using
// California sold history, current inventory, and accepted past quotes — then
// has Lovable AI write a plain-language explanation. Admins can record outcome.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Calculator, Sparkles, History, CheckCircle, XCircle, DollarSign } from "lucide-react";
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

const QuoteEstimatorPanel = () => {
  const { user } = useAuth();
  const [cemeteries, setCemeteries] = useState<string[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [history, setHistory] = useState<Estimate[]>([]);
  const [form, setForm] = useState({ cemetery: "", property_type: "", spaces: 1, request_details: "" });
  const [submitting, setSubmitting] = useState(false);
  const [latest, setLatest] = useState<Estimate | null>(null);
  const [outcomeAmount, setOutcomeAmount] = useState<string>("");

  useEffect(() => {
    (async () => {
      const [invRes, soldRes, qRes] = await Promise.all([
        supabase.from("ca_inventory" as any).select("cemetery,property_type"),
        supabase.from("ca_sold_history" as any).select("cemetery,property_type"),
        supabase.from("quote_estimates" as any).select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      const cems = new Set<string>();
      const pts = new Set<string>();
      for (const r of [...(invRes.data ?? []), ...(soldRes.data ?? [])] as any[]) {
        if (r.cemetery) cems.add(r.cemetery);
        if (r.property_type) pts.add(r.property_type);
      }
      setCemeteries(Array.from(cems).sort());
      setPropertyTypes(Array.from(pts).sort());
      if (qRes.data) setHistory(qRes.data as any);
    })();
  }, []);

  const handleEstimate = async () => {
    if (!form.cemetery) {
      toast({ title: "Pick a cemetery", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    setLatest(null);
    try {
      const { data, error } = await supabase.functions.invoke("estimate-quote", {
        body: {
          cemetery: form.cemetery,
          property_type: form.property_type || null,
          spaces: form.spaces,
          request_details: form.request_details || null,
          generated_by_user_id: user?.id ?? null,
          generated_by_name: user?.email ?? null,
        },
      });
      if (error) throw error;
      setLatest(data.estimate);
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
    if (latest?.id === id) setLatest({ ...latest, ...patch });
  };

  // Compute average AI cost so user knows actual spend
  const avgCost = history.length > 0
    ? history.reduce((s, h) => s + (h.ai_cost_estimate_usd ?? 0), 0) / history.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-primary" />
          <h2 className="font-display text-xl text-foreground">New quote estimate</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-xs text-muted-foreground">Cemetery</label>
            <input
              list="ce-cems"
              value={form.cemetery}
              onChange={e => setForm(p => ({ ...p, cemetery: e.target.value }))}
              placeholder="Type or pick…"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <datalist id="ce-cems">
              {cemeteries.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Property type</label>
            <input
              list="ce-pts"
              value={form.property_type}
              onChange={e => setForm(p => ({ ...p, property_type: e.target.value }))}
              placeholder="e.g. GR/SP, Single Plot"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <datalist id="ce-pts">
              {propertyTypes.map(p => <option key={p} value={p} />)}
            </datalist>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Spaces</label>
            <input
              type="number" min={1} value={form.spaces}
              onChange={e => setForm(p => ({ ...p, spaces: Math.max(1, parseInt(e.target.value) || 1) }))}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleEstimate}
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {submitting ? "Estimating…" : "Generate estimate"}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Customer request details (optional)</label>
          <textarea
            rows={2} value={form.request_details}
            onChange={e => setForm(p => ({ ...p, request_details: e.target.value }))}
            placeholder="Any context from the customer's submission or call…"
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Average cost per estimate so far: <span className="font-medium">${avgCost.toFixed(4)}</span> (~$0.0002 per quote, AI used only for the explanation).
        </p>
      </div>

      {/* Latest result */}
      {latest && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-6 border border-primary/30 shadow-soft">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Recommended quote</p>
              <p className="font-display text-3xl text-foreground">
                ${(latest.estimated_mid ?? 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                Range: ${(latest.estimated_low ?? 0).toLocaleString()} – ${(latest.estimated_high ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Confidence</p>
              <p className={`font-display text-2xl ${
                (latest.confidence_score ?? 0) >= 60 ? "text-emerald-600" :
                (latest.confidence_score ?? 0) >= 40 ? "text-amber-600" : "text-destructive"
              }`}>
                {latest.confidence_label}
              </p>
              <p className="text-xs text-muted-foreground">{latest.confidence_score}/100 · {latest.comp_count} comps</p>
            </div>
          </div>
          {latest.ai_explanation && (
            <div className="bg-muted/40 rounded-lg p-4 border border-border/50 mb-4">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> AI explanation
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{latest.ai_explanation}</p>
            </div>
          )}
          {latest.closest_comp && (
            <div className="bg-muted/40 rounded-lg p-4 border border-border/50 mb-4">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Closest comparable</p>
              <p className="text-sm text-foreground">
                {latest.closest_comp.location ?? latest.closest_comp.cemetery} · ${(latest.closest_comp.price ?? 0).toLocaleString()}
                <span className="text-xs text-muted-foreground"> · {latest.closest_comp.source?.replace(/_/g, " ")}</span>
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
              onClick={() => recordOutcome(latest.id, "accepted", parseFloat(outcomeAmount))}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-medium hover:opacity-90"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Mark accepted
            </button>
            <button
              onClick={() => recordOutcome(latest.id, "declined")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-xs font-medium"
            >
              <XCircle className="w-3.5 h-3.5" /> Declined
            </button>
          </div>
        </motion.div>
      )}

      {/* History */}
      <div className="bg-card rounded-2xl p-6 border border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-display text-lg text-foreground">Recent quote estimates</h3>
          <span className="ml-auto text-xs text-muted-foreground">
            Acceptance rate: {history.length > 0
              ? Math.round((history.filter(h => h.outcome === "accepted").length / history.filter(h => h.outcome !== "pending").length || 0) * 100) || 0
              : 0}%
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
                  <p className="text-sm font-semibold text-foreground">${(h.estimated_mid ?? 0).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{h.confidence_label}</p>
                </div>
                <div>
                  {h.outcome === "accepted" && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px]"><CheckCircle className="w-3 h-3" /> Accepted{h.outcome_amount ? ` $${h.outcome_amount.toLocaleString()}` : ""}</span>}
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
