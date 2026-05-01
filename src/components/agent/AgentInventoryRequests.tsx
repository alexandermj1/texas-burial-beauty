// Agent-facing form + list for requesting inventory not currently stocked.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Loader2, Package, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Req {
  id: string;
  cemetery: string;
  property_type: string | null;
  spaces: number | null;
  section: string | null;
  target_price: number | null;
  buyer_context: string | null;
  notes: string | null;
  priority: string;
  status: string;
  admin_response: string | null;
  created_at: string;
}

const PROPERTY_TYPES = [
  "Single Plot", "Double Plot", "Companion Plot", "Niche", "Crypt",
  "Mausoleum", "Lawn Crypt", "Family Estate", "Cremation Niche",
];

const AgentInventoryRequests = () => {
  const { user } = useAuth();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    cemetery: "",
    property_type: "",
    spaces: 1,
    section: "",
    target_price: "",
    buyer_context: "",
    notes: "",
    priority: "normal",
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("inventory_requests" as any)
      .select("*")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false });
    setReqs((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const submit = async () => {
    if (!user) return;
    if (!form.cemetery.trim()) return toast({ title: "Cemetery required", variant: "destructive" });
    setSubmitting(true);
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    const { error } = await supabase.from("inventory_requests" as any).insert({
      agent_id: user.id,
      agent_name: profile?.full_name || user.email,
      cemetery: form.cemetery.trim(),
      property_type: form.property_type || null,
      spaces: form.spaces || 1,
      section: form.section || null,
      target_price: form.target_price ? Number(form.target_price) : null,
      buyer_context: form.buyer_context || null,
      notes: form.notes || null,
      priority: form.priority,
    });
    setSubmitting(false);
    if (error) return toast({ title: "Submit failed", description: error.message, variant: "destructive" });
    toast({ title: "Request submitted", description: "Admin will review and source if possible." });
    setForm({ cemetery: "", property_type: "", spaces: 1, section: "", target_price: "", buyer_context: "", notes: "", priority: "normal" });
    setShowForm(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-foreground">Request inventory</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Need something we don't have? Tell admin and we'll try to source it.</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:opacity-90">
          {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> New request</>}
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Cemetery *" value={form.cemetery} onChange={v => setForm(f => ({ ...f, cemetery: v }))} placeholder="e.g. Forest Lawn Hollywood Hills" />
            <SelectField label="Property type" value={form.property_type} onChange={v => setForm(f => ({ ...f, property_type: v }))} options={["", ...PROPERTY_TYPES]} />
            <Field label="Spaces" type="number" value={String(form.spaces)} onChange={v => setForm(f => ({ ...f, spaces: parseInt(v) || 1 }))} />
            <Field label="Section / lawn (optional)" value={form.section} onChange={v => setForm(f => ({ ...f, section: v }))} />
            <Field label="Target price ($)" type="number" value={form.target_price} onChange={v => setForm(f => ({ ...f, target_price: v }))} />
            <SelectField label="Priority" value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))} options={["normal", "high"]} />
          </div>
          <Textarea label="Buyer context" value={form.buyer_context} onChange={v => setForm(f => ({ ...f, buyer_context: v }))} placeholder="Who's the buyer? What's their timeline / budget?" />
          <Textarea label="Notes" value={form.notes} onChange={v => setForm(f => ({ ...f, notes: v }))} placeholder="Anything else admin should know" />
          <button onClick={submit} disabled={submitting} className="px-5 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium disabled:opacity-50">
            {submitting ? <><Loader2 className="w-4 h-4 inline animate-spin mr-2" />Submitting…</> : "Submit request"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 inline animate-spin mr-2" />Loading…</div>
      ) : reqs.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border/50 p-12 text-center">
          <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">You haven't submitted any requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reqs.map(r => (
            <div key={r.id} className="bg-card rounded-2xl border border-border/50 p-5">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-display text-base text-foreground">{r.cemetery}</h3>
                <StatusBadge status={r.status} />
                {r.priority === "high" && <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-medium">HIGH</span>}
              </div>
              <p className="text-xs text-muted-foreground">
                {r.property_type || "Any type"} · {r.spaces ?? 1} space{(r.spaces ?? 1) > 1 ? "s" : ""}
                {r.section && ` · ${r.section}`}
                {r.target_price && ` · target $${Number(r.target_price).toLocaleString()}`}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">Submitted {new Date(r.created_at).toLocaleDateString()}</p>
              {r.buyer_context && <p className="text-sm text-foreground mt-2 bg-muted/40 rounded-lg p-3">{r.buyer_context}</p>}
              {r.admin_response && (
                <div className="mt-3 text-sm text-foreground border-l-2 border-primary pl-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">Admin response</p>
                  {r.admin_response}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
const Field = ({ label, value, onChange, type = "text", placeholder }: any) => (
  <label className="block text-xs">
    <span className="text-muted-foreground mb-1 block">{label}</span>
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
  </label>
);
const SelectField = ({ label, value, onChange, options }: any) => (
  <label className="block text-xs">
    <span className="text-muted-foreground mb-1 block">{label}</span>
    <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
      {options.map((o: string) => <option key={o} value={o}>{o || "Any"}</option>)}
    </select>
  </label>
);
const Textarea = ({ label, value, onChange, placeholder }: any) => (
  <label className="block text-xs">
    <span className="text-muted-foreground mb-1 block">{label}</span>
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls + " min-h-[70px]"} />
  </label>
);
const StatusBadge = ({ status }: { status: string }) => {
  const map: any = {
    open: "bg-amber-100 text-amber-700",
    sourcing: "bg-blue-100 text-blue-700",
    fulfilled: "bg-emerald-100 text-emerald-700",
    declined: "bg-muted text-muted-foreground",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${map[status] || "bg-muted"}`}>{status}</span>;
};

export default AgentInventoryRequests;
