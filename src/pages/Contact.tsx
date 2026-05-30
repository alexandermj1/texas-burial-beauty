import { motion } from "framer-motion";
import { Phone, Mail, MapPin } from "lucide-react";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import SellerQuoteForm from "@/components/SellerQuoteForm";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("contact_submissions" as any).insert({
      source: "contact",
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      message: form.message.trim(),
      state: "TX",
      inquiry_channel: "texas_contact",
      created_at: new Date().toISOString(),
    });
    if (error) {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" });
      setLoading(false);
      return;
    }
    toast({ title: "Message sent", description: "We'll be in touch within 24 hours." });
    setForm({ name: "", email: "", phone: "", message: "" });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
      <Seo
        title="Contact Texas Cemetery Brokers"
        description="Get in touch with Texas Cemetery Brokers. Request a free valuation, ask a buying question, or send us a general inquiry. We respond within 24 hours."
        path="/contact"
      />
      <Navbar forceScrolled />

      {/* Hero */}
      <section className="pt-32 pb-12 bg-gradient-sage">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-primary font-medium text-sm tracking-wide mb-3">Contact</p>
            <h1 className="font-display text-4xl md:text-5xl text-foreground mb-4">
              We're here to help
            </h1>
            <p className="text-muted-foreground text-lg font-light leading-relaxed max-w-2xl mx-auto">
              Whether you're buying, selling, or just have a question about cemetery property in Texas — send us a note and we'll get back to you within one business day.
            </p>
          </motion.div>
        </div>
      </section>

      {/* General contact form */}
      <section className="py-16">
        <div className="container mx-auto px-6 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-8">
              <p className="text-primary font-medium text-sm tracking-wide mb-2">General Inquiry</p>
              <h2 className="font-display text-2xl md:text-3xl text-foreground mb-2">Send us a message</h2>
              <p className="text-muted-foreground text-sm">
                For any question — buying, selling, partnerships, or general information.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-8 shadow-soft space-y-4 border border-border">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Name *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" maxLength={100} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Phone</label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(optional)" maxLength={20} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Email *</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" maxLength={255} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Message *</label>
                <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us how we can help…" rows={5} maxLength={1000} />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Seller quote form */}
      <section className="py-16 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-6 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-8">
              <p className="text-primary font-medium text-sm tracking-wide mb-2">Selling Property</p>
              <h2 className="font-display text-2xl md:text-3xl text-foreground mb-2">Request a free valuation</h2>
              <p className="text-muted-foreground text-sm">
                Share a few details about your plot, niche or crypt and we'll send back an honest market estimate — no obligation.
              </p>
            </div>
            <SellerQuoteForm />
          </motion.div>
        </div>
      </section>

      {/* Subtle direct contact details */}
      <section className="py-16">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="text-center mb-8">
            <p className="text-primary font-medium text-sm tracking-wide mb-2">Prefer to reach us directly?</p>
            <h2 className="font-display text-xl md:text-2xl text-foreground">Other ways to get in touch</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <a
              href="mailto:info@texascemeterybrokers.com"
              className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Mail className="w-3.5 h-3.5" />
                <span className="text-xs uppercase tracking-wide">Email</span>
              </div>
              <p className="text-foreground font-medium break-all group-hover:text-primary transition-colors">
                info@texascemeterybrokers.com
              </p>
            </a>

            <a
              href="tel:+13108049586"
              className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Phone className="w-3.5 h-3.5" />
                <span className="text-xs uppercase tracking-wide">Phone</span>
              </div>
              <p className="text-foreground font-medium group-hover:text-primary transition-colors">
                (310) 804-9586
              </p>
            </a>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-xs uppercase tracking-wide">Service Area</span>
              </div>
              <p className="text-foreground font-medium">Statewide Texas</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            In partnership with Bayer Cemetery Brokers · CEB 1512
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
