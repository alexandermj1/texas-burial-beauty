// TexasCemeteriesPanel — directory of Texas cemeteries with profiles built up
// over time. Auto-creates entries when a new cemetery appears in a submission.
import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, ChevronDown, ChevronRight, Save, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Submission } from "./SubmissionsPanel";

interface TexasCemetery {
  id: string;
  name: string;
  canonical_name: string | null;
  city: string | null;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  transfer_fee: number | null;
  notes: string | null;
  auto_created: boolean;
}

interface Props {
  texasSubmissions: Submission[];
}

const canonical = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const TexasCemeteriesPanel = ({ texasSubmissions }: Props) => {
  const [rows, setRows] = useState<TexasCemetery[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<TexasCemetery>>>({});
  const [collapsed, setCollapsed] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("texas_cemeteries" as any)
      .select("*")
      .order("name");
    if (!error && data) setRows(data as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Find cemeteries mentioned in submissions but not yet in the directory.
  const missing = useMemo(() => {
    const known = new Set(rows.map(r => r.canonical_name || canonical(r.name)));
    const seen = new Map<string, { name: string; count: number; sample: Submission }>();
    for (const s of texasSubmissions) {
      const name = (s.cemetery || "").trim();
      if (!name) continue;
      const key = canonical(name);
      if (known.has(key)) continue;
      const prev = seen.get(key);
      if (prev) prev.count += 1;
      else seen.set(key, { name, count: 1, sample: s });
    }
    return Array.from(seen.values()).sort((a, b) => b.count - a.count);
  }, [rows, texasSubmissions]);

  const autoCreate = async (name: string, sample: Submission) => {
    const { error } = await supabase
      .from("texas_cemeteries" as any)
      .insert({
        name,
        city: (sample as any).cemetery_city || sample.region || null,
        auto_created: true,
      });
    if (error) {
      toast({ title: "Couldn't add cemetery", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Cemetery added", description: name });
    await load();
  };

  const save = async (id: string) => {
    const patch = edits[id] || {};
    if (Object.keys(patch).length === 0) return;
    const { error } = await supabase
      .from("texas_cemeteries" as any)
      .update(patch)
      .eq("id", id);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved" });
    setEdits(e => { const n = { ...e }; delete n[id]; return n; });
    await load();
  };

  const addBlank = async () => {
    const name = window.prompt("Cemetery name?");
    if (!name?.trim()) return;
    const { error } = await supabase
      .from("texas_cemeteries" as any)
      .insert({ name: name.trim() });
    if (error) {
      toast({ title: "Couldn't add", description: error.message, variant: "destructive" });
      return;
    }
    await load();
  };

  return (
    <div className="bg-card rounded-xl border border-border/50">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between p-4 border-b border-border/50"
      >
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Texas cemetery directory</h3>
          <span className="text-[11px] text-muted-foreground">({rows.length} profile{rows.length === 1 ? "" : "s"})</span>
          {missing.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/25">
              {missing.length} unknown
            </span>
          )}
        </div>
        {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {/* Unknown cemeteries — one-click add */}
          {missing.length > 0 && (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-amber-700 font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Unknown cemeteries from recent submissions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missing.slice(0, 8).map(m => (
                  <button
                    key={m.name}
                    onClick={() => autoCreate(m.name, m.sample)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border border-amber-500/30 bg-card hover:bg-amber-500/10 transition-colors"
                    title={`Add ${m.name} to the directory (${m.count} mention${m.count > 1 ? "s" : ""})`}
                  >
                    <Plus className="w-3 h-3" /> {m.name}
                    <span className="text-amber-700">×{m.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && <p className="text-xs text-muted-foreground">Loading…</p>}

          {!loading && rows.length === 0 && missing.length === 0 && (
            <p className="text-xs text-muted-foreground">No cemetery profiles yet. New ones will appear here automatically as Texas submissions come in.</p>
          )}

          <div className="space-y-1.5">
            {rows.map(r => {
              const isOpen = openId === r.id;
              const edit = (k: keyof TexasCemetery, v: any) =>
                setEdits(e => ({ ...e, [r.id]: { ...e[r.id], [k]: v } }));
              const val = (k: keyof TexasCemetery) =>
                (edits[r.id]?.[k] as any) ?? (r as any)[k] ?? "";
              return (
                <div key={r.id} className="rounded-lg border border-border/50 bg-card">
                  <button
                    onClick={() => setOpenId(o => (o === r.id ? null : r.id))}
                    className="w-full flex items-center justify-between p-2.5 text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                      {r.city && <span className="text-[11px] text-muted-foreground truncate">· {r.city}</span>}
                      {r.auto_created && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">auto</span>
                      )}
                    </div>
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  {isOpen && (
                    <div className="border-t border-border/50 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Inp label="Name" value={val("name")} onChange={v => edit("name", v)} />
                      <Inp label="City" value={val("city")} onChange={v => edit("city", v)} />
                      <Inp label="Address" value={val("address")} onChange={v => edit("address", v)} className="sm:col-span-2" />
                      <Inp label="Contact name" value={val("contact_name")} onChange={v => edit("contact_name", v)} />
                      <Inp label="Contact phone" value={val("contact_phone")} onChange={v => edit("contact_phone", v)} />
                      <Inp label="Contact email" value={val("contact_email")} onChange={v => edit("contact_email", v)} />
                      <Inp label="Transfer fee ($)" type="number" value={val("transfer_fee")} onChange={v => edit("transfer_fee", v === "" ? null : Number(v))} />
                      <div className="sm:col-span-2">
                        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Notes</label>
                        <textarea
                          value={val("notes") || ""}
                          onChange={(e) => edit("notes", e.target.value)}
                          rows={3}
                          className="w-full mt-1 px-2 py-1.5 rounded-md border border-border bg-background text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2 flex justify-end">
                        <button
                          onClick={() => save(r.id)}
                          disabled={!edits[r.id]}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
                        >
                          <Save className="w-3.5 h-3.5" /> Save profile
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-border/50">
            <button
              onClick={addBlank}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add cemetery manually
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Inp = ({ label, value, onChange, type = "text", className = "" }: {
  label: string; value: any; onChange: (v: any) => void; type?: string; className?: string;
}) => (
  <div className={className}>
    <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</label>
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full mt-1 px-2 py-1.5 rounded-md border border-border bg-background text-xs"
    />
  </div>
);

export default TexasCemeteriesPanel;
