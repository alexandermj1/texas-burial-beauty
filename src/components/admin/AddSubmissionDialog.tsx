import { useState } from "react";
import { X, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { cleanDisplayName } from "@/lib/displayName";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
}

// Lets staff manually add a "submission" — for example after taking a customer's
// info over the phone. The created row is flagged source=manual_phone and
// records who added it so the team can tell it didn't come from a web form.
const AddSubmissionDialog = ({ open, onClose, onCreated }: Props) => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_kind: "seller",
    name: "",
    email: "",
    phone: "",
    cemetery: "",
    property_type: "",
    spaces: "",
    section: "",
    timeline: "",
    budget: "",
    message: "",
    inquiry_channel: "phone",
  });

  if (!open) return null;

  const update = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const myName = cleanDisplayName(user?.user_metadata?.full_name) || user?.email?.split("@")[0] || "Someone";

  const submit = async () => {
    if (!form.name.trim() && !form.email.trim() && !form.phone.trim()) {
      toast({ title: "Add at least a name, email, or phone", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      source: "manual_phone",
      customer_kind: form.customer_kind,
      name: form.name.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      cemetery: form.cemetery.trim() || null,
      property_type: form.property_type.trim() || null,
      spaces: form.spaces.trim() || null,
      section: form.section.trim() || null,
      timeline: form.timeline.trim() || null,
      budget: form.budget.trim() || null,
      message: form.message.trim() || null,
      inquiry_channel: form.inquiry_channel,
      handled_by_user_id: user?.id ?? null,
      handled_by_name: myName,
      handled_at: new Date().toISOString(),
      admin_notes: `[Manually added by ${myName} on ${new Date().toLocaleString("en-US")}]`,
    };
    const { data, error } = await supabase.from("contact_submissions" as any).insert(payload).select().single();
    setSaving(false);
    if (error) { toast({ title: "Couldn't add", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Submission added", description: `${form.name || "New entry"} created.` });
    onCreated?.((data as any).id);
    setForm({ customer_kind: "seller", name: "", email: "", phone: "", cemetery: "", property_type: "", spaces: "", section: "", timeline: "", budget: "", message: "", inquiry_channel: "phone" });
    onClose();
  };

  const inputCls = "w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center"><UserPlus className="w-4 h-4" /></span>
            <div>
              <h3 className="font-display text-lg text-foreground">Add submission manually</h3>
              <p className="text-[11px] text-muted-foreground">Use this when a customer gives you info over the phone or in person.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 text-xs">
            <span className="text-muted-foreground">Customer type</span>
            <select className={inputCls + " mt-1"} value={form.customer_kind} onChange={e => update("customer_kind", e.target.value)}>
              <option value="seller">Seller</option>
              <option value="buyer">Buyer</option>
              <option value="contact">General contact</option>
            </select>
          </label>
          <label className="text-xs col-span-2"><span className="text-muted-foreground">Name</span><input className={inputCls + " mt-1"} value={form.name} onChange={e => update("name", e.target.value)} placeholder="Full name" /></label>
          <label className="text-xs"><span className="text-muted-foreground">Email</span><input className={inputCls + " mt-1"} type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="name@example.com" /></label>
          <label className="text-xs"><span className="text-muted-foreground">Phone</span><input className={inputCls + " mt-1"} value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="(555) 555-5555" /></label>
          <label className="text-xs col-span-2"><span className="text-muted-foreground">Cemetery</span><input className={inputCls + " mt-1"} value={form.cemetery} onChange={e => update("cemetery", e.target.value)} /></label>
          <label className="text-xs"><span className="text-muted-foreground">Property type</span><input className={inputCls + " mt-1"} value={form.property_type} onChange={e => update("property_type", e.target.value)} placeholder="Single, Companion, Crypt..." /></label>
          <label className="text-xs"><span className="text-muted-foreground">Spaces</span><input className={inputCls + " mt-1"} value={form.spaces} onChange={e => update("spaces", e.target.value)} /></label>
          <label className="text-xs"><span className="text-muted-foreground">Section / Lot</span><input className={inputCls + " mt-1"} value={form.section} onChange={e => update("section", e.target.value)} /></label>
          <label className="text-xs"><span className="text-muted-foreground">Timeline</span><input className={inputCls + " mt-1"} value={form.timeline} onChange={e => update("timeline", e.target.value)} /></label>
          <label className="text-xs col-span-2"><span className="text-muted-foreground">Budget / asking</span><input className={inputCls + " mt-1"} value={form.budget} onChange={e => update("budget", e.target.value)} /></label>
          <label className="text-xs col-span-2"><span className="text-muted-foreground">Notes / what they said</span><textarea rows={3} className={inputCls + " mt-1 resize-none"} value={form.message} onChange={e => update("message", e.target.value)} /></label>
          <label className="text-xs col-span-2">
            <span className="text-muted-foreground">How they reached us</span>
            <select className={inputCls + " mt-1"} value={form.inquiry_channel} onChange={e => update("inquiry_channel", e.target.value)}>
              <option value="phone">Phone</option>
              <option value="walk_in">Walk in</option>
              <option value="referral">Referral</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-full text-xs font-medium bg-primary text-primary-foreground disabled:opacity-50">
            {saving ? "Saving..." : "Add submission"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AddSubmissionDialog;
