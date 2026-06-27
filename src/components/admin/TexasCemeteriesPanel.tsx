// TexasCemeteriesPanel — directory of Texas cemeteries built from submissions.
// Every cemetery name that appears in a Texas submission is auto-listed here, and
// admins can attach a profile (transfer fee, typical prices, contact info, notes,
// description) to each one. Cemeteries can also be added manually. Drag one onto
// another to merge — the destination cemetery keeps its profile; only the source
// submissions get relabelled.
import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, ChevronDown, ChevronRight, Save, Search, X } from "lucide-react";
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
  typical_prices: string | null;
  description: string | null;
  website: string | null;
  notes: string | null;
  auto_created: boolean;
}

interface Props {
  texasSubmissions: Submission[];
  /** Canonical key of the cemetery currently filtering the parent list, or null. */
  activeCemeteryCanon?: string | null;
  /** Click a cemetery to filter the submissions list (pass null to clear). */
  onSelectCemetery?: (canon: string | null, label: string | null) => void;
  /** Called after a merge so the parent can reload submissions. */
  onRefresh?: () => Promise<void> | void;
  /** When true, render without the collapsible wrapper (full-page mode). */
  standalone?: boolean;
  /** When true, hide the inline "Add profile info"/"Edit profile" footer + editor.
   *  Profile editing then happens in the right-pane CemeteryInfoCard instead. */
  hideProfileEditor?: boolean;
}

// Light volume-based tint so high-traffic cemeteries are immediately recognisable
// once we have 100+ submissions on a single cemetery. Kept subtle — never overrides
// the active/drop-target states which use stronger borders.
const countTint = (count: number): string => {
  if (count >= 100) return "bg-rose-100/70 dark:bg-rose-950/40 border-rose-300/60 dark:border-rose-900/60";
  if (count >= 50)  return "bg-amber-100/60 dark:bg-amber-950/30 border-amber-300/60 dark:border-amber-900/60";
  if (count >= 25)  return "bg-orange-50/80 dark:bg-orange-950/25 border-orange-200/70 dark:border-orange-900/50";
  if (count >= 10)  return "bg-emerald-50/80 dark:bg-emerald-950/25 border-emerald-200/70 dark:border-emerald-900/50";
  if (count >= 3)   return "bg-sky-50/70 dark:bg-sky-950/25 border-sky-200/70 dark:border-sky-900/40";
  if (count >= 1)   return "bg-card border-border/60";
  return "bg-muted/40 border-border/50";
};

const countBadgeTint = (count: number): string => {
  if (count >= 100) return "bg-rose-600 text-white";
  if (count >= 50)  return "bg-amber-600 text-white";
  if (count >= 25)  return "bg-orange-500 text-white";
  if (count >= 10)  return "bg-emerald-600 text-white";
  if (count >= 3)   return "bg-sky-600 text-white";
  if (count >= 1)   return "bg-primary text-primary-foreground";
  return "bg-muted text-muted-foreground";
};

const canonical = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const TexasCemeteriesPanel = ({ texasSubmissions, activeCemeteryCanon, onSelectCemetery, onRefresh, standalone = false, hideProfileEditor = false }: Props) => {
  const [rows, setRows] = useState<TexasCemetery[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<TexasCemetery>>>({});
  const [collapsed, setCollapsed] = useState(!standalone);
  const [query, setQuery] = useState("");
  const [dragCanon, setDragCanon] = useState<string | null>(null);
  const [overCanon, setOverCanon] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);


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

  // Build the unified list: every cemetery from submissions (canonical-deduped),
  // plus any manually added directory rows. The directory row holds the profile.
  const cemeteryStats = useMemo(() => {
    type Stat = {
      canon: string;
      displayName: string;
      count: number;
      latestAt: number;
      cities: Set<string>;
      directoryId: string | null;
      sample?: Submission;
    };
    const map = new Map<string, Stat>();
    for (const r of rows) {
      const c = r.canonical_name || canonical(r.name);
      if (!c) continue;
      map.set(c, {
        canon: c,
        displayName: r.name,
        count: 0,
        latestAt: 0,
        cities: new Set(r.city ? [r.city] : []),
        directoryId: r.id,
      });
    }
    for (const s of texasSubmissions) {
      const name = (s.cemetery || "").trim();
      if (!name) continue;
      const c = canonical(name);
      if (!c) continue;
      const ts = new Date(s.created_at).getTime();
      const existing = map.get(c);
      if (existing) {
        existing.count += 1;
        if (ts > existing.latestAt) existing.latestAt = ts;
        const city = (s as any).cemetery_city || s.region;
        if (city) existing.cities.add(String(city));
      } else {
        map.set(c, {
          canon: c,
          displayName: name,
          count: 1,
          latestAt: ts,
          cities: new Set((s as any).cemetery_city ? [(s as any).cemetery_city] : []),
          directoryId: null,
          sample: s,
        });
      }
    }
    return Array.from(map.values());
  }, [rows, texasSubmissions]);

  const filteredStats = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = cemeteryStats.filter(s => {
      if (q && !s.displayName.toLowerCase().includes(q) && !Array.from(s.cities).some(c => c.toLowerCase().includes(q))) return false;
      return true;
    });
    list.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (b.latestAt !== a.latestAt) return b.latestAt - a.latestAt;
      return a.displayName.localeCompare(b.displayName);
    });
    return list;
  }, [cemeteryStats, query]);

  // Auto-create a directory row for a cemetery that's only known from submissions,
  // so the admin can immediately start filling in its profile.
  const ensureProfile = async (stat: { canon: string; displayName: string; sample?: Submission }) => {
    const { data, error } = await supabase
      .from("texas_cemeteries" as any)
      .insert({
        name: stat.displayName,
        city: (stat.sample as any)?.cemetery_city || stat.sample?.region || null,
        auto_created: true,
      })
      .select("id")
      .single();
    if (error) {
      toast({ title: "Couldn't open profile", description: error.message, variant: "destructive" });
      return null;
    }
    await load();
    return (data as any)?.id as string;
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
    const { data, error } = await supabase
      .from("texas_cemeteries" as any)
      .insert({ name: name.trim() })
      .select("id")
      .single();
    if (error) {
      toast({ title: "Couldn't add", description: error.message, variant: "destructive" });
      return;
    }
    await load();
    if ((data as any)?.id) setOpenId((data as any).id);
  };

  // Drag-and-drop merge. The destination cemetery's profile (description, prices,
  // transfer fee, contact info, notes) is preserved — only the source's submissions
  // are relabelled and the source's directory row removed.
  const mergeInto = async (sourceCanon: string, target: { canon: string; displayName: string; directoryId: string | null }) => {
    if (sourceCanon === target.canon) return;
    const source = cemeteryStats.find(s => s.canon === sourceCanon);
    if (!source) return;
    const sourceSubs = texasSubmissions.filter(s => canonical(s.cemetery || "") === sourceCanon);
    const sourceIds = sourceSubs.map(s => s.id);
    const ok = window.confirm(
      `Merge "${source.displayName}" into "${target.displayName}"?\n\n` +
      `${sourceIds.length} submission${sourceIds.length === 1 ? "" : "s"} will be moved to "${target.displayName}".\n` +
      `The profile and facts of "${target.displayName}" will be kept. ` +
      `Each submission's original wording is preserved so you can undo if needed.` +
      (source.directoryId ? `\n\nThe "${source.displayName}" entry will be removed.` : "")
    );
    if (!ok) return;
    setMerging(true);
    try {
      for (const sub of sourceSubs) {
        const prevCemetery = sub.cemetery || "";
        const prevHistory = Array.isArray((sub as any).cemetery_merge_history)
          ? (sub as any).cemetery_merge_history
          : [];
        const patch: any = {
          cemetery: target.displayName,
          cemetery_merge_history: [
            ...prevHistory,
            { at: new Date().toISOString(), from: prevCemetery, to: target.displayName },
          ],
        };
        if (!(sub as any).cemetery_original) {
          patch.cemetery_original = prevCemetery;
        }
        const { error } = await supabase
          .from("contact_submissions" as any)
          .update(patch)
          .eq("id", sub.id);
        if (error) throw error;
      }
      if (source.directoryId) {
        const { error } = await supabase
          .from("texas_cemeteries" as any)
          .delete()
          .eq("id", source.directoryId);
        if (error) throw error;
      }
      toast({
        title: "Cemeteries merged",
        description: `${sourceIds.length} submission${sourceIds.length === 1 ? "" : "s"} moved to "${target.displayName}".`,
      });
      await load();
      await onRefresh?.();
    } catch (e: any) {
      toast({ title: "Merge failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setMerging(false);
      setDragCanon(null);
      setOverCanon(null);
    }
  };

  const body = (
    <div className={standalone ? "space-y-4" : "p-4 space-y-3"}>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search cemeteries or cities…"
            className="w-full pl-8 pr-3 py-1.5 rounded-full text-xs border border-border bg-background"
          />
        </div>
        {activeCemeteryCanon && onSelectCemetery && (
          <button
            onClick={() => onSelectCemetery(null, null)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-border bg-card hover:bg-muted/50 transition-colors"
          >
            <X className="w-3 h-3" /> Clear filter
          </button>
        )}
        <button
          onClick={addBlank}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add cemetery
        </button>
      </div>

      {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {!loading && filteredStats.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {query.trim()
            ? "No matches."
            : "No cemeteries yet — they'll appear here automatically as Texas submissions come in, or you can add one manually."}
        </p>
      )}

      <p className="text-[11px] text-muted-foreground">
        Tip: drag one cemetery onto another to merge them. The destination keeps its profile and the source's submissions move over.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filteredStats.map(stat => {
          const isActive = activeCemeteryCanon === stat.canon;
          const profile = stat.directoryId ? rows.find(r => r.id === stat.directoryId) : null;
          const isDragging = dragCanon === stat.canon;
          const isDropTarget = overCanon === stat.canon && dragCanon && dragCanon !== stat.canon;
          const hasProfile = !!profile && !!(profile.description || profile.typical_prices || profile.transfer_fee || profile.notes);
          return (
            <div
              key={stat.canon}
              draggable={!merging}
              onDragStart={(e) => {
                setDragCanon(stat.canon);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", stat.canon);
              }}
              onDragEnd={() => { setDragCanon(null); setOverCanon(null); }}
              onDragOver={(e) => {
                if (!dragCanon || dragCanon === stat.canon) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (overCanon !== stat.canon) setOverCanon(stat.canon);
              }}
              onDragLeave={() => { if (overCanon === stat.canon) setOverCanon(null); }}
              onDrop={(e) => {
                e.preventDefault();
                const src = e.dataTransfer.getData("text/plain") || dragCanon;
                if (!src || src === stat.canon) return;
                mergeInto(src, { canon: stat.canon, displayName: stat.displayName, directoryId: stat.directoryId });
              }}
              className={`rounded-lg border transition-all overflow-hidden cursor-grab active:cursor-grabbing ${
                isDropTarget
                  ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500"
                  : isDragging
                    ? "opacity-50 border-primary"
                    : isActive
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border/60 bg-card hover:border-primary/40 hover:bg-muted/30"
              }`}
              title={isDropTarget ? `Drop to merge into "${stat.displayName}"` : "Drag onto another cemetery to merge"}
            >
              <button
                onClick={() => onSelectCemetery?.(isActive ? null : stat.canon, isActive ? null : stat.displayName)}
                className="w-full text-left p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{stat.displayName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {Array.from(stat.cities).filter(Boolean).slice(0, 2).join(", ") || "—"}
                      {hasProfile && <span className="ml-1.5 text-emerald-700 font-medium">· profiled</span>}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-full text-[11px] font-bold ${
                      stat.count > 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                    title={`${stat.count} submission${stat.count === 1 ? "" : "s"}`}
                  >
                    {stat.count}
                  </span>
                </div>
              </button>
              <div className="flex items-center gap-1 px-2.5 pb-2">
                <button
                  onClick={async () => {
                    if (profile) {
                      setOpenId(o => (o === profile.id ? null : profile.id));
                    } else {
                      const id = await ensureProfile(stat);
                      if (id) setOpenId(id);
                    }
                  }}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                >
                  {profile && openId === profile.id ? "Hide profile" : (profile ? "Edit profile" : "Add profile info")}
                </button>
              </div>
              {profile && openId === profile.id && (
                <div className="border-t border-border/50 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-background/50">
                  <Inp label="Name" value={(edits[profile.id]?.name as any) ?? profile.name ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], name: v } }))} />
                  <Inp label="City" value={(edits[profile.id]?.city as any) ?? profile.city ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], city: v } }))} />
                  <Inp label="Address" value={(edits[profile.id]?.address as any) ?? profile.address ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], address: v } }))} className="sm:col-span-2" />
                  <Inp label="Website" value={(edits[profile.id]?.website as any) ?? profile.website ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], website: v } }))} />
                  <Inp label="Transfer fee ($)" type="number" value={(edits[profile.id]?.transfer_fee as any) ?? profile.transfer_fee ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], transfer_fee: v === "" ? null : Number(v) } }))} />
                  <Inp label="Contact name" value={(edits[profile.id]?.contact_name as any) ?? profile.contact_name ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], contact_name: v } }))} />
                  <Inp label="Contact phone" value={(edits[profile.id]?.contact_phone as any) ?? profile.contact_phone ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], contact_phone: v } }))} />
                  <Inp label="Contact email" value={(edits[profile.id]?.contact_email as any) ?? profile.contact_email ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], contact_email: v } }))} className="sm:col-span-2" />
                  <Ta label="Description" rows={3} value={(edits[profile.id]?.description as any) ?? profile.description ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], description: v } }))} />
                  <Ta label="Typical prices" rows={3} value={(edits[profile.id]?.typical_prices as any) ?? profile.typical_prices ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], typical_prices: v } }))} />
                  <Ta label="Internal notes" rows={3} value={(edits[profile.id]?.notes as any) ?? profile.notes ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], notes: v } }))} className="sm:col-span-2" />
                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      onClick={() => save(profile.id)}
                      disabled={!edits[profile.id]}
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
    </div>
  );

  if (standalone) {
    return (
      <div className="bg-card rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Building2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Cemeteries</h3>
          <span className="text-[11px] text-muted-foreground">({cemeteryStats.length} total)</span>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border/50">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between p-4 border-b border-border/50"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Building2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Cemeteries</h3>
          <span className="text-[11px] text-muted-foreground">({cemeteryStats.length} total)</span>
          {activeCemeteryCanon && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
              filter active
            </span>
          )}
        </div>
        {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {!collapsed && body}
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

const Ta = ({ label, value, onChange, rows = 3, className = "sm:col-span-2" }: {
  label: string; value: any; onChange: (v: any) => void; rows?: number; className?: string;
}) => (
  <div className={className}>
    <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</label>
    <textarea
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full mt-1 px-2 py-1.5 rounded-md border border-border bg-background text-xs"
    />
  </div>
);

export default TexasCemeteriesPanel;
