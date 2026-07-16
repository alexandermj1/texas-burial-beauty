// CemeteryInfoCard — shown in the right pane of the Submissions panel whenever
// the admin has filtered the list to a single cemetery. Lets them read and edit
// the cemetery's profile (description, transfer fees, process info, contacts,
// section pricing history, notes) without leaving the submissions view.
import { useEffect, useMemo, useState } from "react";
import {
  Building2, Save, Pencil, X, ExternalLink, Phone, Mail, MapPin,
  Plus, Trash2, DollarSign, FileText, ClipboardList,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import CemeteryFiles from "./CemeteryFiles";


interface SectionEntry {
  id: string;
  name: string;
  price: number | null;
  property_type?: string | null;
  date: string; // ISO yyyy-mm-dd
  notes?: string | null;
}

interface Profile {
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
  process_info: string | null;
  sections: SectionEntry[] | null;
}

interface Props {
  canon: string;
  displayName: string;
  submissionCount: number;
  onClear: () => void;
}

const canonicalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch { return iso; }
};
const fmtMoney = (n: number | null | undefined) =>
  n == null || isNaN(Number(n)) ? "—" : `$${Number(n).toLocaleString()}`;

const CemeteryInfoCard = ({ canon, displayName, submissionCount, onClear }: Props) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setEditing(false);
      setEdits({});
      const { data } = await supabase
        .from("texas_cemeteries" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (cancelled) return;
      // Always canonicalise from the display name — the stored `canonical_name`
      // column was produced by a stricter DB helper (strips "memorial park",
      // "cemetery", etc.) and no longer matches the app-side key used by the
      // submissions list, which caused profiles to look empty.
      const match = ((data as any[]) || []).find(
        (r) => canonicalize(r.name) === canon
      );
      setProfile((match as any) || null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [canon]);

  const ensureProfile = async (): Promise<Profile | null> => {
    if (profile) return profile;
    const { data, error } = await supabase
      .from("texas_cemeteries" as any)
      .insert({ name: displayName, auto_created: true })
      .select("*")
      .single();
    if (error) {
      toast({ title: "Couldn't create profile", description: error.message, variant: "destructive" });
      return null;
    }
    setProfile(data as any);
    return data as any;
  };

  const startEdit = async () => {
    const p = await ensureProfile();
    if (!p) return;
    setEdits({ sections: Array.isArray(p.sections) ? [...p.sections] : [] });
    setEditing(true);
  };

  const save = async () => {
    if (!profile) return;
    if (Object.keys(edits).length === 0) { setEditing(false); return; }
    setSaving(true);
    const payload: any = { ...edits };
    if (payload.sections) {
      payload.sections = (payload.sections as SectionEntry[])
        .filter((s) => (s.name || "").trim() || s.price != null)
        .map((s) => ({
          ...s,
          price: s.price === null || s.price === undefined || (s.price as any) === "" ? null : Number(s.price),
          date: s.date || todayISO(),
        }));
    }
    const oldName = profile.name;
    const newName = typeof payload.name === "string" ? payload.name.trim() : oldName;
    const nameChanged = !!newName && newName !== oldName;
    if (payload.name !== undefined) payload.name = newName;

    const { error } = await supabase
      .from("texas_cemeteries" as any)
      .update(payload)
      .eq("id", profile.id);
    if (error) {
      setSaving(false);
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }

    // If the cemetery was renamed, cascade the new name onto every
    // submission that was previously matched to the old name so the
    // existing assignments stay intact (just with the updated name).
    if (nameChanged) {
      const { data: subs, error: subsErr } = await supabase
        .from("contact_submissions" as any)
        .select("id, cemetery, cemetery_original, cemetery_merge_history")
        .eq("cemetery", oldName);
      if (subsErr) {
        toast({ title: "Renamed, but couldn't update submissions", description: subsErr.message, variant: "destructive" });
      } else if (subs && subs.length) {
        const stamp = new Date().toISOString();
        await Promise.all(
          (subs as any[]).map((s) => {
            const history = Array.isArray(s.cemetery_merge_history) ? s.cemetery_merge_history : [];
            const patch: any = {
              cemetery: newName,
              cemetery_merge_history: [
                ...history,
                { at: stamp, from: oldName, to: newName, kind: "rename" },
              ],
            };
            if (!s.cemetery_original) patch.cemetery_original = oldName;
            return supabase.from("contact_submissions" as any).update(patch).eq("id", s.id);
          })
        );
        toast({ title: "Profile saved", description: `Renamed and updated ${subs.length} submission${subs.length === 1 ? "" : "s"}.` });
      } else {
        toast({ title: "Profile saved" });
      }
    } else {
      toast({ title: "Profile saved" });
    }

    setSaving(false);
    setProfile({ ...profile, ...(payload as any) });
    setEdits({});
    setEditing(false);
  };

  const v = <K extends keyof Profile>(k: K): any => (edits[k] !== undefined ? edits[k] : (profile?.[k] ?? ""));
  const set = <K extends keyof Profile>(k: K, val: any) => setEdits(e => ({ ...e, [k]: val }));

  const sections: SectionEntry[] = useMemo(() => {
    const src = (edits.sections !== undefined ? edits.sections : profile?.sections) as SectionEntry[] | null | undefined;
    return Array.isArray(src) ? src : [];
  }, [edits.sections, profile?.sections]);

  const setSections = (next: SectionEntry[]) => set("sections", next);
  const addSection = () => setSections([
    ...sections,
    { id: crypto.randomUUID(), name: "", price: null, property_type: "", date: todayISO(), notes: "" },
  ]);
  const updateSection = (id: string, patch: Partial<SectionEntry>) =>
    setSections(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSection = (id: string) => setSections(sections.filter((s) => s.id !== id));

  const hasAnyInfo = useMemo(() => !!profile && !!(
    profile.description || profile.typical_prices || profile.transfer_fee ||
    profile.notes || profile.contact_name || profile.contact_phone ||
    profile.contact_email || profile.address || profile.website ||
    profile.process_info || (Array.isArray(profile.sections) && profile.sections.length)
  ), [profile]);

  const savedSections = Array.isArray(profile?.sections) ? (profile!.sections as SectionEntry[]) : [];

  return (
    <div className="bg-card rounded-xl border border-primary/30 ring-1 ring-primary/20 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-primary font-semibold">Cemetery</p>
            <h3 className="font-display text-lg text-foreground truncate">{profile?.name || displayName}</h3>
            <p className="text-[11px] text-muted-foreground">
              {submissionCount} submission{submissionCount === 1 ? "" : "s"}
              {profile?.city ? ` · ${profile.city}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!editing && (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
              title={profile && hasAnyInfo ? "Edit profile" : "Add profile info"}
            >
              <Pencil className="w-3 h-3" /> {profile && hasAnyInfo ? "Edit info" : "Add info"}
            </button>
          )}
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-border bg-card hover:bg-muted/50"
            title="Clear cemetery filter"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>

      {loading && <p className="text-xs text-muted-foreground">Loading profile…</p>}

      {!loading && !editing && (
        <div className="space-y-4">
          {!hasAnyInfo && (
            <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">
                No profile info yet — record transfer fees, the transfer process, section pricing, and contacts so future submissions are easy to quote.
              </p>
              <button
                onClick={startEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90"
              >
                <Plus className="w-3.5 h-3.5" /> Add cemetery info
              </button>
            </div>
          )}

          {profile?.description && (
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{profile.description}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {profile?.transfer_fee != null && (
              <Fact label="Transfer fee" icon={<DollarSign className="w-3 h-3" />} value={fmtMoney(profile.transfer_fee)} />
            )}
            {profile?.address && (
              <Fact label="Address" icon={<MapPin className="w-3 h-3" />} value={profile.address} />
            )}
            {profile?.website && (
              <Fact
                label="Website"
                icon={<ExternalLink className="w-3 h-3" />}
                value={
                  <a
                    href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-primary hover:bg-primary/20 transition"
                  >
                    <ExternalLink className="w-3 h-3" /> Visit website
                  </a>
                }
              />
            )}

            {(profile?.contact_name || profile?.contact_phone || profile?.contact_email) && (
              <Fact
                label="Cemetery contact"
                value={
                  <div className="space-y-0.5">
                    {profile.contact_name && <div className="text-foreground font-medium">{profile.contact_name}</div>}
                    {profile.contact_phone && (
                      <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="w-3 h-3" /> {profile.contact_phone}</div>
                    )}
                    {profile.contact_email && (
                      <div className="flex items-center gap-1.5 text-muted-foreground"><Mail className="w-3 h-3" /> <a href={`mailto:${profile.contact_email}`} className="hover:underline">{profile.contact_email}</a></div>
                    )}
                  </div>
                }
                multiline
              />
            )}
          </div>

          {profile?.process_info && (
            <Block icon={<FileText className="w-3.5 h-3.5" />} label="Transfer process">
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{profile.process_info}</p>
            </Block>
          )}

          {savedSections.length > 0 && (
            <Block icon={<ClipboardList className="w-3.5 h-3.5" />} label="Section pricing">
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-2.5 py-1.5">Section</th>
                      <th className="text-left font-medium px-2.5 py-1.5">Type</th>
                      <th className="text-right font-medium px-2.5 py-1.5">Price</th>
                      <th className="text-right font-medium px-2.5 py-1.5">As of</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...savedSections]
                      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                      .map((s) => (
                        <tr key={s.id} className="border-t border-border/60">
                          <td className="px-2.5 py-1.5 text-foreground">
                            {s.name || <span className="text-muted-foreground italic">Unnamed</span>}
                            {s.notes ? <div className="text-[10px] text-muted-foreground">{s.notes}</div> : null}
                          </td>
                          <td className="px-2.5 py-1.5 text-muted-foreground">{s.property_type || "—"}</td>
                          <td className="px-2.5 py-1.5 text-right font-medium text-foreground">{fmtMoney(s.price)}</td>
                          <td className="px-2.5 py-1.5 text-right text-muted-foreground">{s.date ? fmtDate(s.date) : "—"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Block>
          )}

          {profile?.typical_prices && (
            <Block label="Typical prices (notes)">
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{profile.typical_prices}</p>
            </Block>
          )}

          {profile?.notes && (
            <Block label="Internal notes">
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{profile.notes}</p>
            </Block>
          )}

          {profile?.id && (
            <CemeteryFiles cemeteryId={profile.id} cemeteryName={profile.name || displayName} />
          )}
        </div>
      )}


      {!loading && editing && profile && (
        <div className="space-y-4">
          <Section title="Basics">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Inp label="Name" value={v("name")} onChange={(x) => set("name", x)} />
              <Inp label="City" value={v("city")} onChange={(x) => set("city", x)} />
              <Inp label="Address" value={v("address")} onChange={(x) => set("address", x)} className="sm:col-span-2" />
              <Inp label="Website" value={v("website")} onChange={(x) => set("website", x)} />
              <Inp label="Transfer fee ($)" type="number" value={v("transfer_fee") ?? ""} onChange={(x) => set("transfer_fee", x === "" ? null : Number(x))} />
            </div>
          </Section>

          <Section title="Cemetery contact">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Inp label="Contact name" value={v("contact_name")} onChange={(x) => set("contact_name", x)} />
              <Inp label="Contact phone" value={v("contact_phone")} onChange={(x) => set("contact_phone", x)} />
              <Inp label="Contact email" value={v("contact_email")} onChange={(x) => set("contact_email", x)} className="sm:col-span-2" />
            </div>
          </Section>

          <Section title="Description & transfer process">
            <div className="grid grid-cols-1 gap-2">
              <Ta label="Description" rows={3} value={v("description")} onChange={(x) => set("description", x)} />
              <Ta
                label="Transfer process / paperwork (transfer steps, deed handling, signatures required, timelines, quirks…)"
                rows={4}
                value={v("process_info")}
                onChange={(x) => set("process_info", x)}
              />
            </div>
          </Section>

          <Section
            title="Section pricing"
            right={
              <button
                onClick={addSection}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-border bg-card hover:bg-muted/50"
              >
                <Plus className="w-3 h-3" /> Add section
              </button>
            }
          >
            {sections.length === 0 && (
              <p className="text-[11px] text-muted-foreground italic">
                Add a row for each section (e.g. Garden of Peace, Last Supper Mausoleum) with the price the cemetery is charging and the date you recorded it.
              </p>
            )}
            {sections.length > 0 && (
              <div className="space-y-2">
                {sections.map((s) => (
                  <div key={s.id} className="grid grid-cols-12 gap-1.5 items-start p-2 rounded-md border border-border bg-background/60">
                    <div className="col-span-12 sm:col-span-4">
                      <MiniInp label="Section name" value={s.name} onChange={(x) => updateSection(s.id, { name: x })} />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <MiniInp label="Type" placeholder="Plot, Crypt…" value={s.property_type || ""} onChange={(x) => updateSection(s.id, { property_type: x })} />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <MiniInp
                        label="Price ($)"
                        type="number"
                        value={s.price ?? ""}
                        onChange={(x) => updateSection(s.id, { price: x === "" ? null : Number(x) })}
                      />
                    </div>
                    <div className="col-span-8 sm:col-span-3">
                      <MiniInp label="Date" type="date" value={s.date || ""} onChange={(x) => updateSection(s.id, { date: x })} />
                    </div>
                    <div className="col-span-4 sm:col-span-1 flex justify-end pt-4">
                      <button
                        onClick={() => removeSection(s.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Remove section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="col-span-12">
                      <MiniInp label="Notes" value={s.notes || ""} onChange={(x) => updateSection(s.id, { notes: x })} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Other notes">
            <div className="grid grid-cols-1 gap-2">
              <Ta label="Typical prices (free text summary)" rows={2} value={v("typical_prices")} onChange={(x) => set("typical_prices", x)} />
              <Ta label="Internal notes" rows={3} value={v("notes")} onChange={(x) => set("notes", x)} />
            </div>
          </Section>

          <div className="flex justify-end gap-2 pt-1 sticky bottom-0 bg-card pb-1">
            <button
              onClick={() => { setEditing(false); setEdits({}); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-card hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Section = ({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) => (
  <div className="rounded-lg border border-border bg-background/40 p-3">
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{title}</h4>
      {right}
    </div>
    {children}
  </div>
);

const Block = ({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">{icon}{label}</div>
    {children}
  </div>
);

const Fact = ({ label, value, icon, multiline = false }: { label: string; value: React.ReactNode; icon?: React.ReactNode; multiline?: boolean }) => (
  <div className={multiline ? "sm:col-span-2" : ""}>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5 flex items-center gap-1">{icon}{label}</div>
    <div className="text-foreground whitespace-pre-wrap break-words">{value}</div>
  </div>
);

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

const MiniInp = ({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: any; onChange: (v: any) => void; type?: string; placeholder?: string;
}) => (
  <div>
    <label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</label>
    <input
      type={type}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full mt-0.5 px-2 py-1 rounded-md border border-border bg-background text-xs"
    />
  </div>
);

const Ta = ({ label, value, onChange, rows = 3, className = "" }: {
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

export default CemeteryInfoCard;
