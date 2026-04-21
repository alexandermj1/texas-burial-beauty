import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const propertyTypes = ["Burial Plot(s)", "Niche(s)", "Crypt / Mausoleum", "Family Estate", "Other"];

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
    await new Promise((r) => setTimeout(r, 1000));
    toast({
      title: "Quote request submitted!",
      description: "We'll review your property details and get back to you within 24 hours with a free valuation.",
    });
    setForm({ name: "", email: "", phone: "", cemetery: "", propertyType: "", spaces: "", section: "", details: "" });
    setLoading(false);
  };

  return (
    <section className="py-16" id="quote-form">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-5 gap-12 items-start">
          {/* Left info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="md:col-span-2"
          >
            <p className="text-primary font-medium text-sm tracking-wide mb-3">Free Valuation</p>
            <h2 className="font-display text-3xl md:text-4xl text-foreground mb-4">
              Get a quote for your property
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Fill out the form with your property details and we'll provide a free, no-obligation market valuation within 24 hours.
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                100% free — no obligation
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                Response within 24 hours
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                Based on real comparable sales
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                No pressure — you decide
              </li>
            </ul>
          </motion.div>

          {/* Right form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="md:col-span-3"
          >
            <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-8 shadow-soft space-y-4">
              <h3 className="font-display text-xl text-foreground mb-2">Property Details</h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Your Name *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Full name"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Email *</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    maxLength={255}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Phone</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(optional)"
                  maxLength={20}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Cemetery Name *</label>
                  <Input
                    value={form.cemetery}
                    onChange={(e) => setForm({ ...form, cemetery: e.target.value })}
                    placeholder="e.g. Cypress Lawn"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Property Type *</label>
                  <select
                    value={form.propertyType}
                    onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select type...</option>
                    {propertyTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Number of Spaces</label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={form.spaces}
                    onChange={(e) => setForm({ ...form, spaces: e.target.value })}
                    placeholder="e.g. 2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Section / Lot #</label>
                  <Input
                    value={form.section}
                    onChange={(e) => setForm({ ...form, section: e.target.value })}
                    placeholder="If known"
                    maxLength={100}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Additional Details</label>
                <Textarea
                  value={form.details}
                  onChange={(e) => setForm({ ...form, details: e.target.value })}
                  placeholder="Any other information — deed status, reason for selling, preferred timeline, etc."
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Request Free Valuation"}
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SellerQuoteForm;
