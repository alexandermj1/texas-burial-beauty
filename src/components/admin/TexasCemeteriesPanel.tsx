// TexasCemeteriesPanel — directory of Texas cemeteries with profiles built up
// over time. Also surfaces a click-to-filter list of cemeteries with submission
// counts so admins can drill into "every submission for Forest Lawn" etc.
import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, ChevronDown, ChevronRight, Save, Search, X, Filter } from "lucide-react";
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
  /** Canonical key of the cemetery currently filtering the parent list, or null. */
  activeCemeteryCanon?: string | null;
  /** Click a cemetery to filter the submissions list (pass null to clear). */
  onSelectCemetery?: (canon: string | null, label: string | null) => void;
  /** Called after a merge so the parent can reload submissions. */
  onRefresh?: () => Promise<void> | void;
}

const canonical = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const TexasCemeteriesPanel = ({ texasSubmissions, activeCemeteryCanon, onSelectCemetery, onRefresh }: Props) => {
  const [rows, setRows] = useState<TexasCemetery[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<TexasCemetery>>>({});
  const [collapsed, setCollapsed] = useState(true);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
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

  // Build a merged list: every cemetery name that has been submitted (canonical
  // dedupe + count), plus any directory entry that hasn't received submissions yet.
  // Each entry is clickable to filter the parent submission list.
  const cemeteryStats = useMemo(() => {
    type Stat = {
      canon: string;
      displayName: string;
      count: number;
      latestAt: number;
      cities: Set<string>;
      directoryId: string | null;
      autoCreatedPending: boolean; // appears in submissions but not in directory
      sample?: Submission;
    };
    const map = new Map<string, Stat>();
    // Seed from directory so even zero-count entries show up (when "show all" is on)
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
        autoCreatedPending: false,
      });
    }
    // Tally submissions
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
          autoCreatedPending: true,
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
    // Sort: count desc, then latest submission desc, then name
    list.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (b.latestAt !== a.latestAt) return b.latestAt - a.latestAt;
      return a.displayName.localeCompare(b.displayName);
    });
    return list;
  }, [cemeteryStats, query]);

  const visibleStats = useMemo(() => {
    if (showAll || query.trim()) return filteredStats;
    // By default hide zero-count directory entries to keep this focused on what's coming in
    const withSubs = filteredStats.filter(s => s.count > 0);
    return withSubs.length > 0 ? withSubs : filteredStats.slice(0, 0);
  }, [filteredStats, showAll, query]);

  const totalWithSubs = cemeteryStats.filter(s => s.count > 0).length;
  const pendingCount = cemeteryStats.filter(s => s.autoCreatedPending).length;

  const autoCreate = async (name: string, sample?: Submission) => {
    const { error } = await supabase
      .from("texas_cemeteries" as any)
      .insert({
        name,
        city: (sample as any)?.cemetery_city || sample?.region || null,
        auto_created: true,
      });
    if (error) {
      toast({ title: "Couldn't add cemetery", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Added to directory", description: name });
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

  // Drag-and-drop merge: drop cemetery A onto cemetery B → renames every Texas
  // submission whose cemetery canonicalizes to A's key, setting it to B's display
  // name. Also deletes A's directory row if it exists. Submissions are matched by
  // canonical cemetery name (case/punctuation-insensitive), so this catches the
  // "same place spelled differently" case.
  const mergeInto = async (sourceCanon: string, target: { canon: string; displayName: string; directoryId: string | null }) => {
    if (sourceCanon === target.canon) return;
    const source = cemeteryStats.find(s => s.canon === sourceCanon);
    if (!source) return;
    const sourceIds = texasSubmissions
      .filter(s => canonical(s.cemetery || "") === sourceCanon)
      .map(s => s.id);
    const ok = window.confirm(
      `Merge "${source.displayName}" into "${target.displayName}"?\n\n` +
      `${sourceIds.length} submission${sourceIds.length === 1 ? "" : "s"} will be renamed to "${target.displayName}".` +
      (source.directoryId ? `\nThe "${source.displayName}" directory entry will be removed.` : "")
    );
    if (!ok) return;
    setMerging(true);
    try {
      if (sourceIds.length > 0) {
        const { error } = await supabase
          .from("contact_submissions" as any)
          .update({ cemetery: target.displayName })
          .in("id", sourceIds);
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
        description: `${sourceIds.length} submission${sourceIds.length === 1 ? "" : "s"} moved to "${target.displayName}"`,
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


  return (
    <div className="bg-card rounded-xl border border-border/50">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between p-4 border-b border-border/50"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Building2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Submissions by cemetery</h3>
          <span className="text-[11px] text-muted-foreground">({totalWithSubs} active · {rows.length} in directory)</span>
          {pendingCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/25">
              {pendingCount} not yet profiled
            </span>
          )}
          {activeCemeteryCanon && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
              filter active
            </span>
          )}
        </div>
        {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {/* Search + clear filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
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
              onClick={() => setShowAll(v => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-border bg-card hover:bg-muted/50 transition-colors"
              title={showAll ? "Hide cemeteries with no submissions" : "Show all directory entries"}
            >
              <Filter className="w-3 h-3" /> {showAll ? "Active only" : "Show all"}
            </button>
            <button
              onClick={addBlank}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add manually
            </button>
          </div>

          {/* Cemetery cards: click to filter the parent list */}
          {loading && <p className="text-xs text-muted-foreground">Loading…</p>}

          {!loading && visibleStats.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {query.trim()
                ? "No matches."
                : "No cemeteries from submissions yet — once Texas inquiries come in they'll be tallied here so you can filter by location."}
            </p>
          )}

          <p className="text-[11px] text-muted-foreground -mt-1">
            Tip: drag a cemetery onto another to merge them (e.g. when the same place was typed two different ways).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {visibleStats.map(stat => {
              const isActive = activeCemeteryCanon === stat.canon;
              const profile = stat.directoryId ? rows.find(r => r.id === stat.directoryId) : null;
              const isDragging = dragCanon === stat.canon;
              const isDropTarget = overCanon === stat.canon && dragCanon && dragCanon !== stat.canon;
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
                          {stat.autoCreatedPending && (
                            <span className="ml-1.5 text-amber-700 font-medium">· not in directory</span>
                          )}
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
                    {profile ? (
                      <button
                        onClick={() => setOpenId(o => (o === profile.id ? null : profile.id))}
                        className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                      >
                        {openId === profile.id ? "Hide profile" : "Edit profile"}
                      </button>
                    ) : (
                      <button
                        onClick={() => autoCreate(stat.displayName, stat.sample)}
                        className="text-[10px] text-amber-700 hover:text-amber-900 underline-offset-2 hover:underline inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add to directory
                      </button>
                    )}
                  </div>
                  {profile && openId === profile.id && (
                    <div className="border-t border-border/50 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-background/50">
                      <Inp label="Name" value={(edits[profile.id]?.name as any) ?? profile.name ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], name: v } }))} />
                      <Inp label="City" value={(edits[profile.id]?.city as any) ?? profile.city ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], city: v } }))} />
                      <Inp label="Address" value={(edits[profile.id]?.address as any) ?? profile.address ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], address: v } }))} className="sm:col-span-2" />
                      <Inp label="Contact name" value={(edits[profile.id]?.contact_name as any) ?? profile.contact_name ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], contact_name: v } }))} />
                      <Inp label="Contact phone" value={(edits[profile.id]?.contact_phone as any) ?? profile.contact_phone ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], contact_phone: v } }))} />
                      <Inp label="Contact email" value={(edits[profile.id]?.contact_email as any) ?? profile.contact_email ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], contact_email: v } }))} />
                      <Inp label="Transfer fee ($)" type="number" value={(edits[profile.id]?.transfer_fee as any) ?? profile.transfer_fee ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], transfer_fee: v === "" ? null : Number(v) } }))} />
                      <div className="sm:col-span-2">
                        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Notes</label>
                        <textarea
                          value={(edits[profile.id]?.notes as any) ?? profile.notes ?? ""}
                          onChange={(e) => setEdits(es => ({ ...es, [profile.id]: { ...es[profile.id], notes: e.target.value } }))}
                          rows={3}
                          className="w-full mt-1 px-2 py-1.5 rounded-md border border-border bg-background text-xs"
                        />
                      </div>
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
