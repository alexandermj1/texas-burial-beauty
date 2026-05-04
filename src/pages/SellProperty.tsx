import { motion } from "framer-motion";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PHONE_DISPLAY = "(424) 234-1678";
const PHONE_HREF = "tel:+14242341678";

const steps = [
  {
    num: "01",
    title: "Tell us about your plot.",
    body: "Cemetery name, section, whatever paperwork you have. We take it from there.",
  },
  {
    num: "02",
    title: "We value it against current Texas market data.",
    body: "Most cemeteries restrict resale prices. We'll tell you exactly what yours can fetch.",
  },
  {
    num: "03",
    title: "We find the buyer and handle the cemetery transfer.",
    body: "Including the deed, the cemetery's transfer fee, and any required forms.",
  },
  {
    num: "04",
    title: "You sign once. We wire your funds.",
    body: "Most sales close in 60 to 120 days.",
  },
];

const faqs = [
  {
    q: "Can I sell a plot if the cemetery says it's non-transferable?",
    a: "Often, yes. Many cemeteries quote a strict policy at the counter but will process a third-party transfer when the paperwork is presented correctly. We've handled this many times across Texas. If a property is genuinely non-transferable, we'll tell you on the first call rather than waste your time.",
  },
  {
    q: "Do I need the original deed?",
    a: "It helps, but it isn't required. If the deed is lost or never made it through probate, we can request a replacement or a duplicate certificate of ownership directly from the cemetery on your behalf.",
  },
  {
    q: "What if the plot is in a different state than I am?",
    a: "Almost every sale we handle is long-distance. You can sign electronically, and the cemetery transfer happens locally regardless of where you live. You do not need to travel.",
  },
  {
    q: "How long does a sale usually take?",
    a: "Most sales close in 60 to 120 days. The variable is the cemetery's own transfer office, not us — some process paperwork in two weeks, others take three months.",
  },
  {
    q: "What fees are involved?",
    a: "There are no upfront fees. We are paid a commission only when your plot sells. The cemetery typically charges a transfer fee of $100 to $400, paid out of the sale proceeds at closing.",
  },
  {
    q: "Do I owe taxes on the sale?",
    a: "In most cases, the sale of an inherited or long-held cemetery plot is not a taxable event for the seller. We are not a tax advisor — for anything beyond a routine sale, please confirm with your CPA.",
  },
  {
    q: "What if there are multiple heirs on the deed?",
    a: "All listed owners or heirs typically need to sign the transfer documents. We can coordinate signatures across multiple family members, even in different states, and we'll guide you through what the cemetery requires.",
  },
  {
    q: "Can I sell just one plot from a family estate?",
    a: "Yes. Family estates of two, four, six or more spaces can be sold whole or split, depending on the cemetery's rules. We'll review your specific section and let you know which is likely to net you more.",
  },
];

const InlineValuationForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cemetery: "",
    city: "",
    notes: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.cemetery.trim()) {
      toast({ title: "Please fill in name, email, and cemetery.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("contact_submissions" as any).insert({
      source: "seller_quote",
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      cemetery: form.cemetery.trim(),
      details: [form.city.trim() && `City: ${form.city.trim()}`, form.notes.trim()]
        .filter(Boolean)
        .join("\n\n") || null,
      created_at: new Date().toISOString(),
    });
    setLoading(false);
    if (error) {
      toast({
        title: "Something went wrong",
        description: "Please call or email us directly.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Valuation request received.",
      description: "We'll respond within 48 hours, usually sooner.",
    });
    setForm({ name: "", email: "", phone: "", cemetery: "", city: "", notes: "" });
  };

  const labelCls =
    "block text-[11px] font-medium tracking-[0.18em] uppercase text-foreground/60 mb-2";
  const inputCls =
    "w-full h-[52px] px-4 bg-background border border-foreground/15 text-foreground text-[15px] rounded-md " +
    "placeholder:text-foreground/30 transition-colors duration-300 " +
    "focus:outline-none focus:border-primary focus:ring-0";

  return (
    <form
      id="quote-form"
      onSubmit={onSubmit}
      className="bg-[hsl(var(--card))] border border-foreground/10 rounded-[10px] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.18)] p-8 md:p-12"
    >
      <h2 className="font-display text-2xl md:text-[28px] text-foreground leading-tight">
        Request a Free Valuation
      </h2>
      <p className="text-[15px] text-muted-foreground mt-2 mb-8">
        We'll respond within 48 hours, usually sooner.
      </p>

      <div className="space-y-5">
        <div>
          <label className={labelCls} htmlFor="vf-name">Full name</label>
          <input
            id="vf-name"
            className={inputCls}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoComplete="name"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelCls} htmlFor="vf-email">Email</label>
            <input
              id="vf-email"
              type="email"
              className={inputCls}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="email"
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="vf-phone">Phone</label>
            <input
              id="vf-phone"
              className={inputCls}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              autoComplete="tel"
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelCls} htmlFor="vf-cem">Cemetery name</label>
            <input
              id="vf-cem"
              className={inputCls}
              value={form.cemetery}
              onChange={(e) => setForm({ ...form, cemetery: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="vf-city">City</label>
            <input
              id="vf-city"
              className={inputCls}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="vf-notes">
            Anything we should know <span className="normal-case tracking-normal text-foreground/40">— optional</span>
          </label>
          <textarea
            id="vf-notes"
            rows={3}
            className={
              "w-full px-4 py-3 bg-background border border-foreground/15 text-foreground text-[15px] rounded-md " +
              "placeholder:text-foreground/30 transition-colors duration-300 resize-none " +
              "focus:outline-none focus:border-primary"
            }
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-[56px] mt-2 bg-primary text-primary-foreground rounded-md font-medium text-[15px] tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Sending…" : "Request My Free Valuation"}
        </button>
        <p className="text-[12px] text-muted-foreground/80 text-center">
          No obligation. We never share your information.
        </p>
      </div>
    </form>
  );
};

const SellProperty = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Sell a Cemetery Plot in Texas | Texas Cemetery Brokers"
        description="A licensed Texas cemetery property resale firm. We handle the paperwork, the cemetery, and the buyer. No upfront fees. Free valuation within 48 hours."
        path="/sell"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: "Cemetery Plot Resale",
          provider: { "@id": "https://texascemeterybrokers.com/#organization" },
          areaServed: "Texas, United States",
          offers: { "@type": "Offer", description: "Commission-only — no upfront fees" },
        }}
      />
      <Navbar forceScrolled />

      {/* Page-wide atmospheric background */}
      <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 15% 0%, hsl(var(--primary) / 0.10), transparent 60%), radial-gradient(ellipse 70% 60% at 100% 30%, hsl(var(--accent, var(--primary)) / 0.08), transparent 60%), radial-gradient(ellipse 90% 70% at 50% 110%, hsl(var(--primary) / 0.07), transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.5] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />
      </div>

      {/* 1. Hero — form is the centerpiece */}
      <section className="relative pt-32 md:pt-40 pb-24 md:pb-32 overflow-hidden">
        {/* decorative blooms */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full blur-3xl -z-10"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.18), transparent 70%)" }}
        />
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, delay: 0.2, ease: "easeOut" }}
          className="absolute top-40 -right-40 w-[640px] h-[640px] rounded-full blur-3xl -z-10"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.12), transparent 70%)" }}
        />
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-12 gap-12 md:gap-20 items-start">
            {/* Left: editorial copy */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="md:col-span-5 md:pt-6"
            >
              <p className="text-foreground/60 text-[11px] tracking-[0.28em] uppercase mb-8">
                Texas Cemetery Brokers — Licensed Plot Resale
              </p>
              <h1 className="font-display text-[42px] sm:text-5xl md:text-[60px] lg:text-[68px] text-foreground leading-[1.05] tracking-tight">
                Selling a cemetery plot is{" "}
                <span className="italic font-light text-foreground/75">more delicate</span>{" "}
                than selling a house. We treat it that way.
              </h1>
              <div className="mt-10 max-w-md space-y-4 text-[16px] md:text-[17px] text-muted-foreground leading-[1.7]">
                <p>
                  We handle the cemetery, the buyer, and the paperwork. You sign once at the end and receive your funds.
                </p>
                <p>
                  Most families come to us sorting out an estate or a plot a parent purchased decades ago. They want it handled, plainly, by people who have done it before.
                </p>
              </div>

              <div className="mt-12 h-px w-16 bg-foreground/20" />
              <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-foreground/70">
                <li>Licensed in Texas</li>
                <li className="text-foreground/20">·</li>
                <li>10,000+ families helped</li>
                <li className="text-foreground/20">·</li>
                <li>No fee until sale</li>
                <li className="text-foreground/20">·</li>
                <li>BBB Accredited</li>
              </ul>
            </motion.div>

            {/* Right: the form */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              className="md:col-span-7"
            >
              <InlineValuationForm />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. Quiet testimonial */}
      <section className="py-32 md:py-40">
        <div className="container mx-auto px-6">
          <figure className="max-w-3xl mx-auto text-center">
            <blockquote className="font-display text-2xl md:text-[34px] text-foreground leading-[1.4] italic font-light">
              &ldquo;After my mother passed, I had no idea what to do with the plots my parents bought in 1987. They handled everything — I never once had to call the cemetery.&rdquo;
            </blockquote>
            <figcaption className="mt-10 text-[13px] text-muted-foreground tracking-[0.15em] uppercase">
              Linda M. — San Antonio
            </figcaption>
          </figure>
        </div>
      </section>

      {/* 2.5 Stats / trust band */}
      <section className="py-20 border-y border-foreground/10 bg-[hsl(var(--card))]/40 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-8 max-w-5xl mx-auto">
            {[
              { n: "10,000+", l: "Texas families helped" },
              { n: "60–120", l: "Days to close, on average" },
              { n: "$0", l: "Upfront — commission only" },
              { n: "48 hr", l: "Valuation turnaround" },
            ].map((s, i) => (
              <motion.div
                key={s.l}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: i * 0.08, ease: "easeOut" }}
                className="text-center"
              >
                <div className="font-display text-3xl md:text-[40px] text-foreground leading-none">
                  {s.n}
                </div>
                <div className="mt-3 text-[11px] tracking-[0.2em] uppercase text-muted-foreground">
                  {s.l}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. How it works — editorial numbered list */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl mb-20"
          >
            <p className="text-foreground/60 text-[11px] tracking-[0.28em] uppercase mb-5">
              The process
            </p>
            <h2 className="font-display text-3xl md:text-[44px] text-foreground leading-[1.15]">
              How selling a plot through us works.
            </h2>
          </motion.div>

          <div className="max-w-4xl mx-auto space-y-16 md:space-y-20">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                className="grid grid-cols-[auto_1fr] gap-8 md:gap-16 items-start"
              >
                <span
                  className="font-display font-light tabular-nums leading-none select-none bg-clip-text text-transparent"
                  style={{
                    fontSize: "clamp(56px, 9vw, 110px)",
                    backgroundImage:
                      "linear-gradient(180deg, hsl(var(--primary) / 0.55) 0%, hsl(var(--primary) / 0.10) 100%)",
                  }}
                >
                  {s.num}
                </span>
                <div className="pt-4 md:pt-6 max-w-xl">
                  <h3 className="font-display text-xl md:text-2xl text-foreground leading-snug mb-3">
                    {s.title}
                  </h3>
                  <p className="text-[16px] text-muted-foreground leading-[1.7]">
                    {s.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="max-w-4xl mx-auto mt-20">
            <a
              href="#quote-form"
              className="inline-flex items-center gap-2 text-foreground border-b border-foreground/30 pb-1 hover:border-primary hover:text-primary transition-colors text-[15px]"
            >
              Ready to start? Request your valuation
              <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </section>

      {/* 4. FAQ — editorial two-column */}
      <section className="py-24 md:py-32 border-t border-foreground/10">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-12 gap-12 md:gap-20">
            <div className="md:col-span-4">
              <p className="text-foreground/60 text-[11px] tracking-[0.28em] uppercase mb-5">
                Common questions
              </p>
              <h2 className="font-display text-3xl md:text-[40px] text-foreground leading-[1.15] mb-6">
                Questions families ask.
              </h2>
              <p className="text-muted-foreground leading-[1.7] text-[15px] max-w-sm">
                Most sellers have never done this before. These are the questions that come up first. If yours isn't here, call us — we'll answer plainly.
              </p>
            </div>
            <div className="md:col-span-8">
              <Accordion type="single" collapsible className="border-t border-foreground/15">
                {faqs.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`faq-${i}`}
                    className="border-b border-foreground/15"
                  >
                    <AccordionTrigger className="font-display text-base md:text-lg text-foreground hover:no-underline py-6 text-left">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-[1.75] pb-6 text-[15px] max-w-2xl">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Final quiet CTA */}
      <section className="py-32 md:py-40 border-t border-foreground/10">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl">
            <h2 className="font-display text-3xl md:text-[44px] text-foreground leading-[1.2] font-light mb-10">
              When you're ready, we're here. <span className="italic text-foreground/70">We'll handle the rest.</span>
            </h2>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <a
                href="#quote-form"
                className="inline-flex items-center px-8 py-4 bg-primary text-primary-foreground rounded-md text-[14px] font-medium tracking-wide hover:opacity-90 transition-opacity"
              >
                Request a Free Valuation
              </a>
              <a
                href={PHONE_HREF}
                className="text-foreground/70 hover:text-foreground text-[14px] underline underline-offset-4 decoration-foreground/30"
              >
                Or call {PHONE_DISPLAY}
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SellProperty;
