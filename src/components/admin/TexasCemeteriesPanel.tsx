// TexasCemeteriesPanel — directory of Texas cemeteries built from submissions.
// Every cemetery name that appears in a Texas submission is auto-listed here, and
// admins can attach a profile (transfer fee, typical prices, contact info, notes,
// description) to each one. Cemeteries can also be added manually. Drag one onto
// another to merge — the destination cemetery keeps its profile; only the source
// submissions get relabelled.
import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, ChevronDown, ChevronRight, Save, X, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Submission } from "./SubmissionsPanel";

interface TexasCemetery {
  id: string;
  name: string;
  canonical_name: string | null;
  city: string | null;
  county: string | null;

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
  /** Top-level search query used to filter the cemetery list. */
  searchQuery?: string;
}

// Volume tiers → left-bar accent (structural indicator) + badge tint (numeric).
// The card body stays neutral (white/off-white) so the accent bar carries the
// signal without turning the panel into a rainbow.
type Tier = "t100" | "t50" | "t25" | "t10" | "t3" | "t1" | "t0";
const tierOf = (n: number): Tier =>
  n >= 100 ? "t100" : n >= 50 ? "t50" : n >= 25 ? "t25" : n >= 10 ? "t10" : n >= 3 ? "t3" : n >= 1 ? "t1" : "t0";

const leftBar: Record<Tier, string> = {
  t100: "bg-rose-400",
  t50:  "bg-amber-400",
  t25:  "bg-orange-400",
  t10:  "bg-teal-400",
  t3:   "bg-sky-400",
  t1:   "bg-stone-300",
  t0:   "bg-stone-200",
};

const countBadge: Record<Tier, string> = {
  t100: "bg-rose-50 text-rose-700 border-rose-200",
  t50:  "bg-amber-50 text-amber-800 border-amber-200",
  t25:  "bg-orange-50 text-orange-800 border-orange-200",
  t10:  "bg-teal-50 text-teal-800 border-teal-200",
  t3:   "bg-sky-50 text-sky-800 border-sky-200",
  t1:   "bg-stone-50 text-stone-700 border-stone-200",
  t0:   "bg-muted text-muted-foreground border-border/60",
};

const canonical = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const TexasCemeteriesPanel = ({ texasSubmissions, activeCemeteryCanon, onSelectCemetery, onRefresh, standalone = false, hideProfileEditor = false, searchQuery = "" }: Props) => {
  const [rows, setRows] = useState<TexasCemetery[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<TexasCemetery>>>({});
  const [collapsed, setCollapsed] = useState(!standalone);
  const [dragCanon, setDragCanon] = useState<string | null>(null);
  const [overCanon, setOverCanon] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [sortMode, setSortMode] = useState<"volume" | "name">("volume");



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
      // Use the same canonical rule as submissions so directory rows and
      // submission-derived cemeteries line up (the stored canonical_name
      // column strips words like "memorial park" and no longer matches).
      const c = canonical(r.name);
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
    const q = (searchQuery || "").trim().toLowerCase();
    if (!q) return cemeteryStats;
    return cemeteryStats.filter(s =>
      s.displayName.toLowerCase().includes(q) ||
      Array.from(s.cities).some(c => c.toLowerCase().includes(q))
    );
  }, [cemeteryStats, searchQuery]);


  // Group cemeteries by county (falling back to city) so admins can browse regionally.
  const groupedStats = useMemo(() => {
    const primaryGroup = (s: (typeof filteredStats)[number]): string => {
      const profile = s.directoryId ? rows.find(r => r.id === s.directoryId) : null;
      const fromCounty = profile?.county?.trim();
      if (fromCounty) return `${fromCounty} County`;
      const fromCity = profile?.city?.trim();
      if (fromCity) return fromCity;
      const fromSubs = Array.from(s.cities).map(c => c.trim()).filter(Boolean);
      return fromSubs[0] || "Uncategorised";
    };
    const groups = new Map<string, { city: string; items: typeof filteredStats; total: number }>();
    for (const s of filteredStats) {
      const label = primaryGroup(s);
      const key = label.toLowerCase();
      const g = groups.get(key) || { city: label, items: [], total: 0 };
      g.items.push(s);
      g.total += s.count;
      groups.set(key, g);
    }
    const arr = Array.from(groups.values());
    const cmp = (a: (typeof filteredStats)[number], b: (typeof filteredStats)[number]) => {
      if (sortMode === "name") return a.displayName.localeCompare(b.displayName);
      return b.count - a.count || a.displayName.localeCompare(b.displayName);
    };

    for (const g of arr) g.items.sort(cmp);
    arr.sort((a, b) => {
      if (a.city === "Uncategorised") return 1;
      if (b.city === "Uncategorised") return -1;
      // Counties (labelled "X County") float above bare cities
      const aCounty = a.city.endsWith(" County");
      const bCounty = b.city.endsWith(" County");
      if (aCounty !== bCounty) return aCounty ? -1 : 1;
      if (sortMode === "name") return a.city.localeCompare(b.city);
      if (b.total !== a.total) return b.total - a.total;
      // More cemeteries per group first when counts tie
      if (b.items.length !== a.items.length) return b.items.length - a.items.length;
      return a.city.localeCompare(b.city);
    });
    return arr;
  }, [filteredStats, rows, sortMode]);


  const totalSubs = useMemo(() => cemeteryStats.reduce((sum, s) => sum + s.count, 0), [cemeteryStats]);



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
        // Preserve profile data: copy any non-empty source fields into the
        // destination row, but ONLY where the destination is empty. Never
        // overwrite info the destination already has.
        const sourceRow = rows.find(r => r.id === source.directoryId);
        const destRow = target.directoryId ? rows.find(r => r.id === target.directoryId) : null;
        if (sourceRow && target.directoryId && destRow) {
          const fields: (keyof TexasCemetery)[] = [
            "city", "county", "address", "contact_name", "contact_phone", "contact_email",
            "transfer_fee", "typical_prices", "description", "website", "notes",
          ];

          const patch: Record<string, any> = {};
          for (const f of fields) {
            const srcVal = (sourceRow as any)[f];
            const dstVal = (destRow as any)[f];
            const srcHas = srcVal !== null && srcVal !== undefined && String(srcVal).trim() !== "";
            const dstEmpty = dstVal === null || dstVal === undefined || String(dstVal).trim() === "";
            if (srcHas && dstEmpty) patch[f as string] = srcVal;
          }
          if (Object.keys(patch).length > 0) {
            const { error: mergeErr } = await supabase
              .from("texas_cemeteries" as any)
              .update(patch)
              .eq("id", target.directoryId);
            if (mergeErr) throw mergeErr;
          }
        }
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

    <div className={standalone ? "space-y-5" : "p-5 space-y-4"}>
      {/* Toolbar: sort + add + clear */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value as any)}
            className="h-9 pl-3 pr-8 rounded-xl text-xs font-medium border border-border/60 bg-background hover:bg-muted/40 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20"
            title="Sort order"
          >
            <option value="volume">Sort: Volume</option>
            <option value="name">Sort: Name</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
        {activeCemeteryCanon && onSelectCemetery && (
          <button
            onClick={() => onSelectCemetery(null, null)}
            className="inline-flex items-center gap-1 px-3 h-9 rounded-xl text-xs font-medium border border-border/60 bg-card hover:bg-muted/50 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Clear filter
          </button>
        )}
        <button
          onClick={addBlank}
          className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" /> Add cemetery
        </button>
        <span className="ml-auto text-[11px] text-muted-foreground italic">
          Drag one card onto another to merge.
        </span>
      </div>


      {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {!loading && filteredStats.length === 0 && (
        <div className="py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {(searchQuery || "").trim()
              ? "No matches."
              : "No cemeteries yet — they'll appear here automatically as Texas submissions come in, or you can add one manually."}
          </p>
        </div>
      )}


      {/* City groups */}
      <div className="space-y-7">
        {groupedStats.map(group => (
          <section key={group.city}>
            <div className="flex items-center gap-3 mb-3">
              <h4 className="font-display text-sm font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                {group.city}
              </h4>
              <div className="h-px flex-1 bg-border/60" />
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground tabular-nums">
                {group.items.length}
              </span>
              <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                {group.total} sub{group.total === 1 ? "" : "s"}
              </span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
              {group.items.map(stat => {
                const isActive = activeCemeteryCanon === stat.canon;
                const profile = stat.directoryId ? rows.find(r => r.id === stat.directoryId) : null;
                const isDragging = dragCanon === stat.canon;
                const isDropTarget = overCanon === stat.canon && dragCanon && dragCanon !== stat.canon;
                const tier = tierOf(stat.count);


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
                    className={`group relative flex overflow-hidden rounded-xl border transition-all ${
                      isDropTarget
                        ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400"
                        : isDragging
                          ? "opacity-40 border-border/60"
                          : isActive
                            ? "border-primary bg-background ring-2 ring-primary/30 shadow-md"
                            : "border-border/60 bg-background hover:border-primary/40 hover:shadow-lg"
                    }`}
                    title={isDropTarget ? `Drop to merge into "${stat.displayName}"` : undefined}
                  >
                    {/* Left tier bar */}
                    <div className={`w-1.5 shrink-0 ${leftBar[tier]}`} aria-hidden />

                    <div className="flex-1 min-w-0 flex flex-col">
                      <button
                        onClick={() => onSelectCemetery?.(isActive ? null : stat.canon, isActive ? null : stat.displayName)}
                        className="w-full text-left p-4 flex-1 cursor-pointer"
                      >
                        <div className="flex justify-between items-center gap-3">
                          <h5 className="font-display text-lg font-semibold leading-snug break-words text-foreground min-w-0 flex-1">
                            {stat.displayName}
                          </h5>
                          <span
                            className={`shrink-0 inline-flex items-center justify-center min-w-[32px] px-1.5 py-0.5 rounded-md text-[11px] font-bold tabular-nums border ${countBadge[tier]}`}
                            title={`${stat.count} submission${stat.count === 1 ? "" : "s"}`}
                          >
                            {stat.count}
                          </span>
                        </div>

                        {isActive && (

                          <div className="mt-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-primary/15 text-primary border border-primary/30 font-medium">
                              filtering submissions
                            </span>
                          </div>
                        )}
                      </button>

                      {!hideProfileEditor && (
                        <div className="flex items-center justify-between gap-2 px-4 pb-2.5">
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <button
                            onClick={async () => {
                              if (profile) {
                                setOpenId(o => (o === profile.id ? null : profile.id));
                              } else {
                                const id = await ensureProfile(stat);
                                if (id) setOpenId(id);
                              }
                            }}
                            className="text-[10px] uppercase tracking-[0.15em] font-semibold text-muted-foreground hover:text-primary transition-colors"
                          >
                            {profile && openId === profile.id ? "Hide" : (profile ? "Edit" : "Add profile")}
                          </button>
                        </div>
                      )}

                      {!hideProfileEditor && profile && openId === profile.id && (
                        <div className="border-t border-border/50 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-background/50">
                          <Inp label="Name" value={(edits[profile.id]?.name as any) ?? profile.name ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], name: v } }))} />
                          <Inp label="City" value={(edits[profile.id]?.city as any) ?? profile.city ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], city: v } }))} />
                          <Inp label="County" value={(edits[profile.id]?.county as any) ?? profile.county ?? ""} onChange={v => setEdits(e => ({ ...e, [profile.id]: { ...e[profile.id], county: v } }))} />

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
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Legend footer */}
      {!loading && filteredStats.length > 0 && (
        <div className="pt-4 mt-2 border-t border-border/50 flex items-center justify-between flex-wrap gap-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          <span>{filteredStats.length} of {cemeteryStats.length} · {totalSubs} submissions</span>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" />100+</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />50+</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" />25+</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-400" />10+</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400" />3+</span>
          </div>
        </div>
      )}
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
