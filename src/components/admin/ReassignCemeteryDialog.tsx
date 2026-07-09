// Lets an admin re-match a single submission to a different cemetery profile
// from the Texas directory. Preserves the customer's original wording and
// appends to the merge history so the change is auditable / undoable.
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Building2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  submissionId: string;
  currentCemetery: string | null;
  customerOriginal?: string | null;
  onSaved?: () => void;
}

// Match the canonicalizer used in TexasMapPanel so counts stay in sync.
const _canon = (s: string | null | undefined) => {
  if (!s) return "";
  return s.toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(cemetery|memorial park|memorial|mortuary|mausoleum|association|assoc|funeral home|park|gardens?)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const ReassignCemeteryDialog = ({ open, onClose, submissionId, currentCemetery, customerOriginal, onSaved }: Props) => {
  const [rows, setRows] = useState<Array<{ id: string; name: string; city: string | null }>>([]);
  const [countsByCemId, setCountsByCemId] = useState<Map<string, number>>(new Map());
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setLoading(true);
    (async () => {
      const [cemsRes, subsRes] = await Promise.all([
        supabase.from("texas_cemeteries" as any).select("id,name,city").order("name", { ascending: true }),
        supabase.from("contact_submissions").select("cemetery").not("cemetery", "is", null),
      ]);
      const cems = ((cemsRes.data as any[]) || []).map(r => ({ id: r.id, name: r.name, city: r.city }));
      setRows(cems);

      // Aggregate submissions by canonical key
      const subMap = new Map<string, number>();
      for (const s of (subsRes.data as any[]) || []) {
        const k = _canon(s.cemetery);
        if (!k) continue;
        subMap.set(k, (subMap.get(k) || 0) + 1);
      }

      // Same attribution logic as TexasMapPanel: longest token-based match wins
      const cemKeys = cems.map((c) => {
        const key = _canon(c.name);
        const withCity = _canon(`${c.name} ${c.city || ""}`);
        const tokens = new Set([key, withCity].filter((t) => t && t.length >= 4));
        return { id: c.id, tokens };
      });

      const counts = new Map<string, number>();
      subMap.forEach((v, subKey) => {
        let bestId: string | null = null;
        let bestLen = 0;
        cemKeys.forEach(({ id, tokens }) => {
          tokens.forEach((tok) => {
            const matches = subKey === tok || subKey.includes(tok) || tok.includes(subKey);
            if (matches && tok.length > bestLen) {
              bestLen = tok.length;
              bestId = id;
            }
          });
        });
        if (bestId) counts.set(bestId, (counts.get(bestId) || 0) + v);
      });

      setCountsByCemId(counts);
      setLoading(false);
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const query = _canon(q);
    if (!query) return rows;
    return rows.filter(r => _canon(`${r.name} ${r.city || ""}`).includes(query));
  }, [rows, q]);

  const countFor = (id: string) => countsByCemId.get(id) || 0;


  const pick = async (row: { id: string; name: string }) => {
    if (!submissionId) return;
    if (row.name === currentCemetery) { onClose(); return; }
    setSaving(row.id);
    try {
      const { data: sub, error: fetchErr } = await supabase
        .from("contact_submissions" as any)
        .select("cemetery, cemetery_original, cemetery_merge_history")
        .eq("id", submissionId)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      const prevCemetery = (sub as any)?.cemetery || currentCemetery || "";
      const prevHistory = Array.isArray((sub as any)?.cemetery_merge_history)
        ? (sub as any).cemetery_merge_history
        : [];
      const patch: any = {
        cemetery: row.name,
        cemetery_merge_history: [
          ...prevHistory,
          { at: new Date().toISOString(), from: prevCemetery, to: row.name, kind: "reassign" },
        ],
      };
      if (!(sub as any)?.cemetery_original && (customerOriginal || prevCemetery)) {
        patch.cemetery_original = customerOriginal || prevCemetery;
      }
      const { error } = await supabase
        .from("contact_submissions" as any)
        .update(patch)
        .eq("id", submissionId);
      if (error) throw error;
      toast({ title: "Cemetery re-matched", description: `Submission moved to "${row.name}".` });
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast({ title: "Could not re-match", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-xl w-full max-w-lg shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="min-w-0">
                <h3 className="font-display text-base text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Match to a different cemetery
                </h3>
                {currentCemetery && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    Currently matched to <span className="font-medium text-foreground">{currentCemetery}</span>
                  </p>
                )}
              </div>
              <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-4 py-3 border-b border-border">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search cemeteries…"
                  className="w-full pl-8 pr-3 py-2 rounded-md bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {loading ? (
                <p className="p-4 text-sm text-muted-foreground">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No matches.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.map(row => {
                    const isCurrent = row.name === currentCemetery;
                    const n = countFor(row.id);
                    return (
                      <li key={row.id}>
                        <button
                          onClick={() => pick(row)}
                          disabled={!!saving || isCurrent}
                          className="w-full text-left px-4 py-2.5 hover:bg-muted/60 disabled:opacity-60 disabled:hover:bg-transparent flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{row.name}</p>
                            {row.city && <p className="text-xs text-muted-foreground truncate">{row.city}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[11px] px-1.5 py-0.5 rounded-md border ${
                                n > 0
                                  ? "bg-primary/10 text-primary border-primary/20"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                              title={`${n} submission${n === 1 ? "" : "s"}`}
                            >
                              {n} submission{n === 1 ? "" : "s"}
                            </span>
                            {isCurrent ? (
                              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                                <Check className="w-3 h-3" /> Current
                              </span>
                            ) : saving === row.id ? (
                              <span className="text-[11px] text-muted-foreground">Saving…</span>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="px-4 py-2.5 border-t border-border bg-muted/30 text-[11px] text-muted-foreground">
              Only this submission is moved. The customer's original wording is preserved in the merge history.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReassignCemeteryDialog;
