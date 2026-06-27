// CemeteryInfoCard — shown in the right pane of the Submissions panel whenever
// the admin has filtered the list to a single cemetery. Lets them read and edit
// the cemetery's profile (description, prices, transfer fee, contacts, notes)
// without leaving the submissions view.
import { useEffect, useMemo, useState } from "react";
import { Building2, Save, Pencil, X, ExternalLink, Phone, Mail, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
}

interface Props {
  canon: string;
  displayName: string;
  submissionCount: number;
  /** Called when the filter should be cleared (closes the card). */
  onClear: () => void;
}

const canonicalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

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
      const match = ((data as any[]) || []).find(
        (r) => (r.canonical_name || canonicalize(r.name)) === canon
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
    setEdits({});
    setEditing(true);
  };

  const save = async () => {
    if (!profile) return;
    if (Object.keys(edits).length === 0) { setEditing(false); return; }
    setSaving(true);
    const { error } = await supabase
      .from("texas_cemeteries" as any)
      .update(edits)
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setProfile({ ...profile, ...(edits as any) });
    setEdits({});
    setEditing(false);
    toast({ title: "Profile saved" });
  };

  const v = <K extends keyof Profile>(k: K): any => (edits[k] !== undefined ? edits[k] : (profile?.[k] ?? ""));
  const set = <K extends keyof Profile>(k: K, val: any) => setEdits(e => ({ ...e, [k]: val }));

  const hasAnyInfo = useMemo(() => !!profile && !!(
    profile.description || profile.typical_prices || profile.transfer_fee ||
    profile.notes || profile.contact_name || profile.contact_phone ||
    profile.contact_email || profile.address || profile.website
  ), [profile]);

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
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-border bg-card hover:bg-muted/50"
              title={profile ? "Edit profile" : "Add profile info"}
            >
              <Pencil className="w-3 h-3" /> {profile && hasAnyInfo ? "Edit" : "Add info"}
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
        <div className="space-y-3">
          {!hasAnyInfo && (
            <p className="text-xs text-muted-foreground italic">
              No profile info yet. Click <span className="font-medium not-italic">Add info</span> to record transfer fees, typical prices, contacts, and notes.
            </p>
          )}
          {profile?.description && (
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{profile.description}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {profile?.transfer_fee != null && (
              <Fact label="Transfer fee" value={`$${Number(profile.transfer_fee).toLocaleString()}`} />
            )}
            {profile?.typical_prices && <Fact label="Typical prices" value={profile.typical_prices} multiline />}
            {profile?.address && (
              <Fact
                label="Address"
                icon={<MapPin className="w-3 h-3" />}
                value={profile.address}
              />
            )}
            {profile?.website && (
              <Fact
                label="Website"
                icon={<ExternalLink className="w-3 h-3" />}
                value={
                  <a href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">
                    {profile.website}
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
            {profile?.notes && <Fact label="Internal notes" value={profile.notes} multiline />}
          </div>
        </div>
      )}

      {!loading && editing && profile && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Inp label="Name" value={v("name")} onChange={(x) => set("name", x)} />
          <Inp label="City" value={v("city")} onChange={(x) => set("city", x)} />
          <Inp label="Address" value={v("address")} onChange={(x) => set("address", x)} className="sm:col-span-2" />
          <Inp label="Website" value={v("website")} onChange={(x) => set("website", x)} />
          <Inp label="Transfer fee ($)" type="number" value={v("transfer_fee") ?? ""} onChange={(x) => set("transfer_fee", x === "" ? null : Number(x))} />
          <Inp label="Contact name" value={v("contact_name")} onChange={(x) => set("contact_name", x)} />
          <Inp label="Contact phone" value={v("contact_phone")} onChange={(x) => set("contact_phone", x)} />
          <Inp label="Contact email" value={v("contact_email")} onChange={(x) => set("contact_email", x)} className="sm:col-span-2" />
          <Ta label="Description" rows={3} value={v("description")} onChange={(x) => set("description", x)} />
          <Ta label="Typical prices" rows={3} value={v("typical_prices")} onChange={(x) => set("typical_prices", x)} />
          <Ta label="Internal notes" rows={3} value={v("notes")} onChange={(x) => set("notes", x)} className="sm:col-span-2" />
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              onClick={() => { setEditing(false); setEdits({}); }}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-card hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || Object.keys(edits).length === 0}
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

export default CemeteryInfoCard;
