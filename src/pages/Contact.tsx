import { motion } from "framer-motion";
import { Phone, Mail, MapPin, ArrowRight, Check, Building2, DollarSign, Calendar, Search, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import SellerQuoteForm from "@/components/SellerQuoteForm";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/* Botanical leaf accents — same set used on the cemeteries page */
const LEAF_MODULES = import.meta.glob("@/assets/leaves/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;
const LEAVES = Object.values(LEAF_MODULES);

type Scatter = {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  size: number;
  rotate: number;
  opacity: number;
  idx: number;
};

/* Approved leaves only — exclude the sage bird-of-paradise (idx 17).
   The orange caladium (idx 4, 15) MUST be pinned to the bottom edge so the
   stalks run off the page rather than floating mid-section. */

const BUY_SCATTER: Scatter[] = [
  // top edges
  { top: "2%",   left: "-3%",  size: 200, rotate: -14, opacity: 0.5,  idx: 0 },   // monstera
  { top: "6%",   right: "-2%", size: 170, rotate: 18,  opacity: 0.5,  idx: 16 },  // hibiscus
  // mid filler
  { top: "32%",  left: "-2%",  size: 160, rotate: -8,  opacity: 0.45, idx: 9 },   // palm fan
  { top: "44%",  right: "-3%", size: 190, rotate: 14,  opacity: 0.5,  idx: 5 },   // palm frond
  { top: "62%",  left: "-1%",  size: 150, rotate: 22,  opacity: 0.4,  idx: 11 },  // small palm
  // bottom — caladium anchored so stalks run off page
  { bottom: "-12%", right: "-4%", size: 260, rotate: 0, opacity: 0.55, idx: 15 }, // BIG caladium
  { bottom: "-10%", left: "-3%",  size: 220, rotate: 0, opacity: 0.5,  idx: 4 },  // caladium
];

const SELL_SCATTER: Scatter[] = [
  { top: "4%",   right: "-2%", size: 180, rotate: 12,  opacity: 0.45, idx: 0 },   // monstera
  { top: "10%",  left: "-3%",  size: 160, rotate: -16, opacity: 0.45, idx: 16 },  // hibiscus
  { top: "48%",  right: "-3%", size: 170, rotate: 18,  opacity: 0.45, idx: 9 },   // palm fan
  { top: "60%",  left: "-2%",  size: 150, rotate: -12, opacity: 0.4,  idx: 5 },   // palm frond
  // bottom anchor — caladium runs off the page
  { bottom: "-14%", right: "-3%", size: 240, rotate: 0, opacity: 0.55, idx: 15 },
];

const LeafScatter = ({ items }: { items: Scatter[] }) => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    {LEAVES.length > 0 &&
      items.map((s, i) => (
        <img
          key={i}
          src={LEAVES[s.idx % LEAVES.length]}
          alt=""
          loading="lazy"
          className="absolute select-none"
          style={{
            top: s.top,
            bottom: s.bottom,
            left: s.left,
            right: s.right,
            width: `clamp(${Math.round(s.size * 0.75)}px, ${Math.round(s.size / 9)}vw, ${Math.round(s.size * 1.6)}px)`,
            height: "auto",
            opacity: s.opacity,
            transform: `rotate(${s.rotate}deg)`,
            filter: "saturate(0.85)",
          }}
        />
      ))}
  </div>

);

/* ─── Shared form primitives ─── */
const inputCls =
  "w-full h-12 px-4 rounded-xl bg-background border border-border/60 text-foreground text-[15px] " +
  "placeholder:text-muted-foreground transition-all " +
  "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40";

const labelCls = "block text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground mb-2";

/* ─── General Inquiry Section ─── */
const GeneralInquiryForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    const submissionId = crypto.randomUUID();
    const { error } = await supabase.from("contact_submissions" as any).insert({
      id: submissionId,
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
    const { error: emailError } = await supabase.functions.invoke("inquiry-notification-email", { body: { submission_id: submissionId } });
    if (emailError) console.warn("inquiry email failed", emailError);
    toast({ title: "Message sent", description: "We'll be in touch within 24 hours." });
    setForm({ name: "", email: "", phone: "", message: "" });
    setLoading(false);
    navigate("/thank-you");
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay: 0.1 }}
      className="relative bg-card rounded-3xl border border-border/60 shadow-hover p-8 md:p-10 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-accent before:to-primary/60"
    >
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className={labelCls}>Full name *</label>
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" maxLength={100} />
        </div>
        <div>
          <label className={labelCls}>Email *</label>
          <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" maxLength={255} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Phone <span className="text-muted-foreground normal-case tracking-normal text-[10px]">— optional</span></label>
          <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" maxLength={20} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Message *</label>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Tell us how we can help…"
            rows={4}
            maxLength={1000}
            className={inputCls + " py-3 resize-none"}
          />
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 mt-8">
        <button
          type="submit"
          disabled={loading}
          className="group inline-flex items-center justify-center gap-2 px-10 py-4 bg-primary text-primary-foreground font-medium rounded-full text-sm tracking-wide hover:opacity-90 transition-all disabled:opacity-50 shadow-soft"
        >
          {loading ? "Sending…" : "Send message"}
          <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
        <p className="text-[11px] text-muted-foreground/70">No spam. We respond within 24 hours.</p>
      </div>
    </motion.form>
  );
};

/* ─── Buy Inquiry Section ─── */
const propertyTypes = ["Burial Plot(s)", "Niche(s)", "Crypt / Mausoleum", "Not Sure Yet"];
const budgets = ["Under $5,000", "$5,000 – $10,000", "$10,000 – $20,000", "$20,000+", "Flexible / Not Sure"];
const timelines = ["At-Need (Now)", "Within 6 Months", "Pre-Need (Future)"];

const BuyInquiryForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    propertyType: "",
    budget: "",
    region: "",
    cemetery: "",
    timeline: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.propertyType) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    const details = [
      `Property type: ${form.propertyType}`,
      form.budget ? `Budget: ${form.budget}` : null,
      form.region ? `Region: ${form.region}` : null,
      form.cemetery ? `Cemetery: ${form.cemetery}` : null,
      form.timeline ? `Timeline: ${form.timeline}` : null,
      form.message ? `Notes: ${form.message}` : null,
    ].filter(Boolean).join("\n");

    const submissionId = crypto.randomUUID();
    const { error } = await supabase.from("contact_submissions" as any).insert({
      id: submissionId,
      source: "buy_inquiry",
      inquiry_channel: "texas_buy_contact",
      state: "TX",
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      property_type: form.propertyType,
      budget: form.budget || null,
      region: form.region || null,
      cemetery: form.cemetery || null,
      timeline: form.timeline || null,
      message: details,
      details,
      created_at: new Date().toISOString(),
    });
    if (error) {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" });
      setLoading(false);
      return;
    }
    const { error: emailError } = await supabase.functions.invoke("inquiry-notification-email", { body: { submission_id: submissionId } });
    if (emailError) console.warn("inquiry email failed", emailError);
    toast({ title: "Request submitted", description: "We'll be in touch within 24 hours with options that match your needs." });
    setForm({ name: "", email: "", phone: "", propertyType: "", budget: "", region: "", cemetery: "", timeline: "", message: "" });
    setLoading(false);
    navigate("/thank-you");
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay: 0.1 }}
      className="relative bg-card rounded-3xl border border-border/60 shadow-hover p-8 md:p-10 overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-accent before:via-primary before:to-accent/60"
    >
      {/* About you */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.25em] text-primary/80 font-semibold mb-5">About you</p>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Full name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" maxLength={100} />
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" maxLength={255} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Phone <span className="text-muted-foreground normal-case tracking-normal text-[10px]">— optional</span></label>
            <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" maxLength={20} />
          </div>
        </div>
      </div>

      <div className="h-px bg-border/40 my-8" />

      {/* What you're looking for */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.25em] text-primary/80 font-semibold mb-5">What you're looking for</p>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelCls}>Property type *</label>
            <select
              value={form.propertyType}
              onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
              className={inputCls + " cursor-pointer"}
            >
              <option value="">Select…</option>
              {propertyTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Budget</label>
            <select
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
              className={inputCls + " cursor-pointer"}
            >
              <option value="">Select…</option>
              {budgets.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Region / City</label>
            <input className={inputCls} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="e.g. Dallas, Houston, Austin" maxLength={100} />
          </div>
          <div>
            <label className={labelCls}>Cemetery <span className="text-muted-foreground normal-case tracking-normal text-[10px]">— if known</span></label>
            <input className={inputCls} value={form.cemetery} onChange={(e) => setForm({ ...form, cemetery: e.target.value })} placeholder="e.g. Restland Memorial Park" maxLength={200} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Timeline</label>
            <div className="flex flex-wrap gap-2">
              {timelines.map((t) => {
                const active = form.timeline === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, timeline: t })}
                    className={
                      "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm border transition-all " +
                      (active
                        ? "bg-primary text-primary-foreground border-primary shadow-soft"
                        : "bg-background text-foreground border-border/60 hover:border-primary/40")
                    }
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Additional notes</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Any specific requirements, family size, location preferences…"
              rows={3}
              maxLength={1000}
              className={inputCls + " py-3 resize-none"}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="group inline-flex items-center justify-center gap-2 px-10 py-4 bg-primary text-primary-foreground font-medium rounded-full text-sm tracking-wide hover:opacity-90 transition-all disabled:opacity-50 shadow-soft"
        >
          {loading ? "Submitting…" : "Request buyer concierge"}
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
        <p className="text-[11px] text-muted-foreground/70">Free service. No obligation. We respond within 24 hours.</p>
      </div>
    </motion.form>
  );
};

/* ─── Page ─── */
const Contact = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
      <Seo
        title="Contact Texas Cemetery Brokers"
        description="Get in touch with Texas Cemetery Brokers. Request a free valuation, ask a buying question, or send us a general inquiry. We respond within 24 hours."
        path="/contact"
      />
      <Navbar forceScrolled />

      {/* ── Hero ── */}
      <section className="pt-28 pb-20 bg-gradient-sage relative overflow-hidden">
        {/* layered gradient mesh */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,hsl(var(--accent)/0.22),transparent_55%),radial-gradient(circle_at_50%_120%,hsl(var(--primary)/0.12),transparent_60%)]" />
        {/* subtle grid texture */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />
        {/* floating blurred orbs */}
        <div className="hidden md:block pointer-events-none absolute -top-16 -right-16 w-80 h-80 rounded-full bg-primary/15 blur-3xl" />
        <div className="hidden md:block pointer-events-none absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-accent/20 blur-3xl" />
        <div className="hidden md:block pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/[0.04] blur-3xl" />

        {/* botanical accents on the sides */}
        <LeafScatter
          items={[
            { top: "12%", left: "-2%", size: 180, rotate: -18, opacity: 0.4, idx: 0 },
            { top: "20%", right: "-2%", size: 170, rotate: 22, opacity: 0.4, idx: 16 },
            { bottom: "-8%", left: "8%", size: 140, rotate: -10, opacity: 0.35, idx: 9 },
            { bottom: "-6%", right: "10%", size: 150, rotate: 14, opacity: 0.35, idx: 5 },
          ]}
        />

        <div className="container mx-auto px-6 max-w-4xl text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/70 backdrop-blur border border-primary/20 text-primary font-medium text-[11px] tracking-[0.25em] uppercase mb-6 shadow-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Contact
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-foreground mb-5 leading-tight">
              We're here to help
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto">
              Whether you're buying, selling, or just have a question about cemetery property in Texas — send us a note and we'll get back to you within one business day.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Three column quick links ── */}
      <section className="pb-16 -mt-12 relative z-10">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid sm:grid-cols-3 gap-5">
            {[
              {
                icon: MessageSquare,
                title: "General question",
                desc: "Send us a message about anything",
                panel: "bg-[hsl(145_25%_36%)]",
                ink: "text-[hsl(40_30%_97%)]",
                rule: "bg-[hsl(40_45%_82%)]",
                eyebrow: "Inquiry · N°01",
                cta: "Start a message",
              },
              {
                icon: Search,
                title: "Buy a plot",
                desc: "Tell us what you're looking for",
                panel: "bg-[hsl(16_50%_58%)]",
                ink: "text-[hsl(40_30%_97%)]",
                rule: "bg-[hsl(40_45%_82%)]",
                eyebrow: "Buyer · N°02",
                cta: "Request matches",
              },
              {
                icon: Building2,
                title: "Sell your property",
                desc: "Request a free valuation",
                panel: "bg-[hsl(28_22%_38%)]",
                ink: "text-[hsl(40_30%_97%)]",
                rule: "bg-[hsl(40_45%_82%)]",
                eyebrow: "Seller · N°03",
                cta: "Get a valuation",
              },
            ].map((item, i) => (
              <motion.a
                key={item.title}
                href={`#${["general-inquiry", "buy-inquiry", "sell-inquiry"][i]}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={`group relative overflow-hidden rounded-2xl p-7 shadow-soft transition-all duration-300 [@media(hover:hover)]:hover:shadow-hover [@media(hover:hover)]:hover:-translate-y-1 text-left ${item.panel} ${item.ink}`}
              >
                {/* subtle grid texture echo from the guides */}
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
                  style={{
                    backgroundImage:
                      "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
                    backgroundSize: "44px 44px",
                  }}
                />
                <div className="relative">
                  <p className="text-[10px] tracking-[0.32em] uppercase font-semibold opacity-80 mb-5">
                    {item.eyebrow}
                  </p>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-[hsl(40_30%_97%)]/15 [@media(hover:hover)]:group-hover:scale-110 transition-transform">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-xl mb-1.5">{item.title}</h3>
                  <p className="text-sm opacity-80 mb-4">{item.desc}</p>
                  <div className={`w-10 h-px ${item.rule} opacity-80 mb-4`} />
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                    {item.cta}
                    <ArrowRight className="w-3.5 h-3.5 transition-transform [@media(hover:hover)]:group-hover:translate-x-1" />
                  </span>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ── General Inquiry ── */}
      <section id="general-inquiry" className="py-16 scroll-mt-16">
        <div className="container mx-auto px-6 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <p className="text-primary font-medium text-xs tracking-[0.25em] uppercase mb-3">General Inquiry</p>
            <h2 className="font-display text-3xl md:text-4xl text-foreground mb-3">Send us a message</h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
              For any question — buying, selling, partnerships, or general information.
            </p>
          </motion.div>
          <GeneralInquiryForm />
        </div>
      </section>

      {/* ── Buy Inquiry ── */}
      <section id="buy-inquiry" className="py-16 bg-gradient-sage relative overflow-hidden scroll-mt-16">
        <div className="hidden md:block pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-3xl" />
        <div aria-hidden className="hidden md:block pointer-events-none absolute -top-20 -right-24 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        <div aria-hidden className="hidden md:block pointer-events-none absolute -bottom-20 -left-24 w-80 h-80 rounded-full bg-accent/15 blur-3xl" />
        <LeafScatter items={BUY_SCATTER} />
        <div className="container mx-auto px-6 max-w-3xl relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <p className="text-primary font-medium text-xs tracking-[0.25em] uppercase mb-3">Buying Property</p>
            <h2 className="font-display text-3xl md:text-4xl text-foreground mb-3">Request a buyer concierge</h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
              Tell us what you're looking for and we'll hand-pick matching plots, niches, or crypts from our private resale inventory — usually 30–50% below cemetery retail.
            </p>
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6">
              {[
                "100% free, no obligation",
                "Save 30–50% vs. cemetery retail",
                "Response within 24 hours",
              ].map((g) => (
                <li key={g} className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                  {g}
                </li>
              ))}
            </ul>
          </motion.div>
          <BuyInquiryForm />
        </div>
      </section>

      {/* ── Sell Inquiry ── */}
      <section id="sell-inquiry" className="py-16 relative overflow-hidden scroll-mt-16">
        <div aria-hidden className="hidden md:block pointer-events-none absolute top-10 -left-20 w-72 h-72 rounded-full bg-accent/10 blur-3xl" />
        <div aria-hidden className="hidden md:block pointer-events-none absolute bottom-10 -right-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
        <LeafScatter items={SELL_SCATTER} />
        <div className="container mx-auto px-6 max-w-3xl relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <p className="text-primary font-medium text-xs tracking-[0.25em] uppercase mb-3">Selling Property</p>
            <h2 className="font-display text-3xl md:text-4xl text-foreground mb-3">Request a free valuation</h2>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
              Share a few details about your plot, niche or crypt and we'll send back an honest market estimate — no obligation.
            </p>
          </motion.div>
          <SellerQuoteForm compact />
        </div>
      </section>

      {/* ── Subtle direct contact details ── */}
      <section className="py-16 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="text-center mb-10">
            <p className="text-primary font-medium text-xs tracking-[0.25em] uppercase mb-3">Prefer to reach us directly?</p>
            <h2 className="font-display text-xl md:text-2xl text-foreground">Other ways to get in touch</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <a
              href="mailto:info@texascemeterybrokers.com"
              className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-soft transition-all"
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Mail className="w-3.5 h-3.5" />
                <span className="text-xs uppercase tracking-wide">Email</span>
              </div>
              <p className="text-foreground font-medium break-all group-hover:text-primary transition-colors">
                info@texascemeterybrokers.com
              </p>
            </a>

            <a
              href="tel:+13108049586"
              className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-soft transition-all"
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Phone className="w-3.5 h-3.5" />
                <span className="text-xs uppercase tracking-wide">Phone</span>
              </div>
              <p className="text-foreground font-medium group-hover:text-primary transition-colors">
                (310) 804-9586
              </p>
            </a>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-xs uppercase tracking-wide">Service Area</span>
              </div>
              <p className="text-foreground font-medium">Statewide Texas</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-8">
            In partnership with Bayer Cemetery Brokers · CEB 1512
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
