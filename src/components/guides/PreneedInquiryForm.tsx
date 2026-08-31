import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Loader2, Send, ShieldCheck, Clock3, BadgePercent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const propertyTypes = ["Burial plot(s)", "Companion / family estate", "Mausoleum crypt", "Cremation niche", "Not sure yet"];
const regions = ["Dallas–Fort Worth", "Houston", "Austin", "San Antonio", "Elsewhere in Texas"];

const PreneedInquiryForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: "",
    email: "",
    phone: "",
    cemetery: "",
    region: "",
    propertyType: "",
    quantity: "",
    note: "",
  });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const canSubmit = f.name.trim() && (f.email.trim() || f.phone.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);

    const details = [
      "Preneed enquiry (guide page)",
      `Property type: ${f.propertyType || "—"}`,
      `Spaces wanted: ${f.quantity || "—"}`,
      `Region: ${f.region || "—"}`,
      f.cemetery.trim() ? `Cemetery / section requested: ${f.cemetery.trim()}` : null,
      f.note.trim() ? `\nMessage from buyer:\n${f.note.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const submissionId = crypto.randomUUID();
    const { error } = await supabase.from("contact_submissions" as any).insert({
      id: submissionId,
      source: "preneed_guide_form",
      inquiry_channel: "texas_preneed_guide",
      state: "TX",
      name: f.name.trim(),
      email: f.email.trim() || null,
      phone: f.phone.trim() || null,
      property_type: f.propertyType || null,
      timeline: "Preneed / planning ahead",
      region: f.region || null,
      cemetery: f.cemetery.trim() || null,
      details,
      message: details,
      created_at: new Date().toISOString(),
    });

    setBusy(false);
    if (error) {
      toast({ title: "Something went wrong", description: "Please call (214) 230-4740 or email us directly.", variant: "destructive" });
      return;
    }
    const { error: emailError } = await supabase.functions.invoke("inquiry-notification-email", { body: { submission_id: submissionId } });
    if (emailError) console.warn("inquiry email failed", emailError);
    toast({ title: "Request sent", description: "We'll come back to you within 24 hours with verified options." });
    navigate("/thank-you");
  };

  const field = "w-full rounded-xl border border-border bg-background px-4 py-3 text-[15px] text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all";
  const label = "block text-xs uppercase tracking-[0.16em] text-foreground/55 font-semibold mb-2";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className="rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-accent/5 overflow-hidden"
    >
      <div className="p-7 md:p-10 border-b border-primary/10">
        <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-3">Free, no obligation</p>
        <h3 className="font-display text-3xl md:text-4xl text-foreground leading-tight mb-3">
          Tell us the cemetery — we'll find the space, at a discount
        </h3>
        <p className="text-foreground/75 leading-relaxed max-w-2xl">
          Including sections the cemetery has sold out. If nothing is available today, we'll source it for you and let you know the moment an owner in that section lists.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-sm text-foreground/70">
          <span className="inline-flex items-center gap-2"><BadgePercent className="w-4 h-4 text-accent" /> Up to 50% below retail</span>
          <span className="inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Paperwork handled by us</span>
          <span className="inline-flex items-center gap-2"><Clock3 className="w-4 h-4 text-primary" /> Reply within 24 hours</span>
        </div>
      </div>

      <form onSubmit={submit} className="p-7 md:p-10 grid sm:grid-cols-2 gap-5">
        <div>
          <label className={label} htmlFor="pn-name">Your name *</label>
          <input id="pn-name" required value={f.name} onChange={set("name")} className={field} placeholder="Jane Doe" autoComplete="name" />
        </div>
        <div>
          <label className={label} htmlFor="pn-phone">Phone</label>
          <input id="pn-phone" value={f.phone} onChange={set("phone")} className={field} placeholder="(214) 555-0134" autoComplete="tel" inputMode="tel" />
        </div>
        <div>
          <label className={label} htmlFor="pn-email">Email</label>
          <input id="pn-email" type="email" value={f.email} onChange={set("email")} className={field} placeholder="you@example.com" autoComplete="email" />
        </div>
        <div>
          <label className={label} htmlFor="pn-region">Area</label>
          <select id="pn-region" value={f.region} onChange={set("region")} className={field}>
            <option value="">Select an area</option>
            {regions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="pn-type">Property type</label>
          <select id="pn-type" value={f.propertyType} onChange={set("propertyType")} className={field}>
            <option value="">Select a type</option>
            {propertyTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="pn-qty">How many spaces?</label>
          <input id="pn-qty" value={f.quantity} onChange={set("quantity")} className={field} placeholder="e.g. 2" inputMode="numeric" />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="pn-cem">Cemetery or section you have in mind</label>
          <input id="pn-cem" value={f.cemetery} onChange={set("cemetery")} className={field} placeholder="e.g. Restland — Garden of Devotion, near my mother" />
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor="pn-note">Anything else we should know?</label>
          <textarea id="pn-note" value={f.note} onChange={set("note")} rows={3} className={`${field} resize-y`} placeholder="Next to a family member, waiting for a discount, financing questions…" />
        </div>

        <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
          <button
            type="submit"
            disabled={!canSubmit || busy}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-accent text-accent-foreground rounded-2xl font-medium text-[15px] shadow-[0_10px_28px_-8px_hsl(var(--accent)/0.55)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
          >
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send my request</>}
          </button>
          <p className="text-xs text-foreground/55 leading-relaxed">
            No cost, no obligation, and we never share your details. Prefer to talk? Call <a href="tel:+12142304740" className="text-primary font-medium underline-offset-4 hover:underline">(214) 230-4740</a>.
          </p>
        </div>
      </form>
    </motion.div>
  );
};

export default PreneedInquiryForm;
