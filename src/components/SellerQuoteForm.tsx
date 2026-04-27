import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const propertyTypes = ["Burial Plot(s)", "Niche(s)", "Crypt / Mausoleum", "Family Estate", "Other"];

const guarantees = [
  "100% free, no obligation",
  "Response within 24 hours",
  "Guaranteed net proceeds offer",
];

const SellerQuoteForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cemetery: "",
    propertyType: "",
    spaces: "",
    section: "",
    details: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.cemetery.trim() || !form.propertyType) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("contact_submissions" as any).insert({
      source: "seller_quote",
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      cemetery: form.cemetery.trim(),
      property_type: form.propertyType,
      spaces: form.spaces || null,
      section: form.section.trim() || null,
      details: form.details.trim() || null,
      created_at: new Date().toISOString(),
    });
    if (error) {
      toast({ title: "Something went wrong", description: "Please call or email us directly.", variant: "destructive" });
      setLoading(false);
      return;
    }
    toast({
      title: "Quote request submitted",
      description: "We'll review your property details and respond within 24 hours with a guaranteed net offer.",
    });
    setForm({ name: "", email: "", phone: "", cemetery: "", propertyType: "", spaces: "", section: "", details: "" });
    setLoading(false);
  };

  const inputCls =
    "w-full h-12 px-4 rounded-xl bg-background border border-border/60 text-foreground text-[15px] " +
    "placeholder:text-muted-foreground/50 transition-all " +
    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40";

  const labelCls = "block text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground mb-2";

  return (
    <section className="py-24 bg-background" id="quote-form">
      <div className="container mx-auto px-6">
        {/* Centered intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center mb-12"
        >
          <p className="text-primary font-medium text-xs tracking-[0.25em] uppercase mb-4">
            Free Valuation
          </p>
          <h2 className="font-display text-4xl md:text-5xl text-foreground leading-tight mb-5">
            Get your guaranteed
            <br />
            <span className="italic text-foreground/70">net offer.</span>
          </h2>
          <p className="text-muted-foreground text-lg font-light leading-relaxed">
            Tell us about your property. We'll respond within 24 hours with a free,
            no-obligation guaranteed net proceeds quote.
          </p>

          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-8">
            {guarantees.map((g) => (
              <li key={g} className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                {g}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Form card */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="max-w-3xl mx-auto bg-card rounded-3xl border border-border/40 shadow-soft p-8 md:p-12"
        >
          {/* Section: You */}
          <div className="mb-10">
            <p className="text-[10px] uppercase tracking-[0.25em] text-primary/80 font-semibold mb-5">
              About you
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>Full name</label>
                <input
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jane Doe"
                  maxLength={100}
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  className={inputCls}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  maxLength={255}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Phone <span className="text-muted-foreground/50 normal-case tracking-normal text-[10px]">— optional</span></label>
                <input
                  className={inputCls}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  maxLength={20}
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-border/40 my-10" />

          {/* Section: Property */}
          <div className="mb-10">
            <p className="text-[10px] uppercase tracking-[0.25em] text-primary/80 font-semibold mb-5">
              Your property
            </p>
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className={labelCls}>Cemetery name</label>
                <input
                  className={inputCls}
                  value={form.cemetery}
                  onChange={(e) => setForm({ ...form, cemetery: e.target.value })}
                  placeholder="e.g. Restland Memorial Park, Dallas"
                  maxLength={200}
                />
              </div>
              <div>
                <label className={labelCls}>Property type</label>
                <select
                  value={form.propertyType}
                  onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
                  className={inputCls + " cursor-pointer"}
                >
                  <option value="">Select...</option>
                  {propertyTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Number of spaces</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className={inputCls}
                  value={form.spaces}
                  onChange={(e) => setForm({ ...form, spaces: e.target.value })}
                  placeholder="e.g. 2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Section / Lot # <span className="text-muted-foreground/50 normal-case tracking-normal text-[10px]">— if known</span></label>
                <input
                  className={inputCls}
                  value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  placeholder="e.g. Garden of Peace, Lot 14"
                  maxLength={100}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Additional details</label>
                <textarea
                  value={form.details}
                  onChange={(e) => setForm({ ...form, details: e.target.value })}
                  placeholder="Deed status, reason for selling, preferred timeline, anything else we should know…"
                  rows={4}
                  maxLength={1000}
                  className={
                    "w-full px-4 py-3 rounded-xl bg-background border border-border/60 text-foreground text-[15px] " +
                    "placeholder:text-muted-foreground/50 transition-all resize-none " +
                    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                  }
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="group inline-flex items-center justify-center gap-2 px-10 py-4 bg-primary text-primary-foreground font-medium rounded-full text-sm tracking-wide hover:opacity-90 transition-all disabled:opacity-50 shadow-soft"
            >
              {loading ? "Submitting…" : "Request my guaranteed quote"}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <p className="text-[11px] text-muted-foreground/70">
              No spam. No pressure. We respond within 24 hours.
            </p>
          </div>
        </motion.form>
      </div>
    </section>
  );
};

export default SellerQuoteForm;
