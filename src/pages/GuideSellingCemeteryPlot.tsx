import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Phone, Mail, Plus, CheckCircle2, MapPin, Building2, Layers, Sparkles, TrendingUp, Clock3, Eye, HeartHandshake, FileCheck2, Award, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { PHONE_DISPLAY, EMAIL, jsonLd, trustItems, checks, valueFactors } from "./guide-selling-data";

const GuideSellingCemeteryPlot = () => (
  <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
    <Seo
      title="How to Sell a Cemetery Plot in Texas | Texas Cemetery Brokers"
      description="Selling a cemetery plot in Texas? Learn what affects your plot's value, the legal steps, and how a broker sells it fast across Houston, Dallas & Austin."
      path="/guides/selling-a-cemetery-plot-in-texas"
      type="article"
      jsonLd={jsonLd}
    />
    <Navbar forceScrolled />

    {/* HERO — sage gradient, centered editorial */}
    <section className="relative pt-32 pb-24 overflow-hidden bg-gradient-to-b from-[hsl(var(--primary)/0.12)] via-[hsl(var(--accent)/0.05)] to-background">
      <div className="absolute top-0 right-0 w-[44rem] h-[44rem] rounded-full bg-primary/12 blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
      <div className="absolute top-20 left-0 w-[32rem] h-[32rem] rounded-full bg-accent/10 blur-3xl -translate-x-1/3 pointer-events-none" />
      <svg className="absolute bottom-0 left-0 right-0 w-full pointer-events-none" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden>
        <path d="M0 40 Q360 80 720 40 T1440 40 L1440 80 L0 80 Z" className="fill-background" />
      </svg>

      <div className="relative container mx-auto px-6 max-w-4xl text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Link to="/guides" className="inline-flex items-center gap-1.5 text-xs tracking-[0.18em] uppercase text-foreground/60 hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> All Guides
          </Link>
          <div className="inline-flex items-center gap-3 mb-7">
            <span className="w-8 h-px bg-accent" />
            <p className="text-accent text-[11px] tracking-[0.28em] uppercase font-semibold">Texas Cemetery Plot Resale Specialists</p>
          </div>
          <h1 className="font-display text-5xl md:text-7xl text-foreground leading-[1.04] mb-8 tracking-tight">
            How to Sell a Cemetery Plot in <span className="italic text-primary">Texas</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground/75 max-w-2xl mx-auto leading-relaxed font-light mb-10">
            If you own a cemetery plot you'll never use, it has real value. We help Texas families turn unwanted plots, crypts and niches into cash — handling the valuation, the buyers, and every step of the transfer for you.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#contact" className="inline-flex items-center gap-2 px-7 py-3.5 bg-accent text-accent-foreground rounded-2xl font-medium text-[15px] shadow-[0_8px_24px_-6px_hsl(var(--accent)/0.5)] hover:shadow-[0_12px_32px_-6px_hsl(var(--accent)/0.6)] hover:-translate-y-0.5 transition-all">
              <Plus className="w-4 h-4" /> Get a Free Plot Valuation
            </a>
            <a href="#why" className="inline-flex items-center gap-2 px-7 py-3.5 bg-background border border-border rounded-2xl font-medium text-[15px] text-foreground hover:bg-muted/50 transition-all">
              Why Use a Broker
            </a>
          </div>
        </motion.div>
      </div>
    </section>

    {/* TRUST STRIP */}
    <section className="border-y border-border/60 bg-card/50">
      <div className="container mx-auto px-6 max-w-6xl py-8">
        <div className="grid sm:grid-cols-3 gap-6 sm:gap-4">
          {trustItems.map(({ Icon, t, d }) => (
            <div key={t} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <p className="font-display text-base text-foreground leading-tight">{t}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* INTRO + SHORT ANSWER */}
    <section className="py-20">
      <div className="container mx-auto px-6 max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <p className="text-lg md:text-xl text-foreground/80 leading-relaxed mb-8">
            Plans change. Families relocate, choose cremation, or inherit plots they'll never use. The good news: a cemetery plot you own can be sold — and it is often worth more than people expect. The challenge is that selling privately in Texas can be slow and uncertain. This guide explains what affects your plot's value, the legal steps, and the most reliable way to sell it.
          </p>
          <div className="relative rounded-3xl p-8 md:p-10 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 border border-primary/15 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/15 blur-2xl" />
            <p className="relative text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-4">The short answer</p>
            <p className="relative text-lg md:text-xl text-foreground/90 leading-relaxed">
              Yes, you can sell a cemetery plot in Texas. Check your purchase contract for a right-of-first-refusal clause, confirm any co-owners agree, then list privately or work with a cemetery broker who finds the buyer, prices it correctly, and completes the legal transfer with the cemetery for you.
            </p>
          </div>
        </motion.div>
      </div>
    </section>

    {/* CAN YOU SELL — checklist */}
    <section className="py-20 bg-card/40 border-y border-border/40">
      <div className="container mx-auto px-6 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-12">
          <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-4">Chapter 01</p>
          <h2 className="font-display text-4xl md:text-5xl text-foreground mb-4">Can you sell a cemetery plot in <span className="italic text-primary">Texas?</span></h2>
          <p className="text-foreground/70 max-w-2xl mx-auto leading-relaxed">
            When you buy a plot you typically receive the <strong className="text-foreground">exclusive right of sepulture</strong> — the right to use that space for burial. That right is transferable. Three things to check first:
          </p>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-5">
          {checks.map((c, i) => (
            <motion.div key={c.t} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }} className="bg-card border border-border/60 rounded-2xl p-7 hover:border-primary/30 hover:-translate-y-1 hover:shadow-soft transition-all">
              <div className="flex items-center justify-between mb-5">
                <span className="font-display text-primary text-lg">0{i + 1}</span>
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <p className="font-display text-lg text-foreground mb-2">{c.t}</p>
              <p className="text-sm text-foreground/70 leading-relaxed">{c.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* VALUE FACTORS */}
    <section id="value" className="py-24">
      <div className="container mx-auto px-6 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="max-w-2xl mb-14">
          <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-4">Chapter 02 · Valuation</p>
          <h2 className="font-display text-4xl md:text-5xl text-foreground mb-5 leading-[1.05]">What affects your plot's <span className="italic text-primary">value</span></h2>
          <p className="text-foreground/70 leading-relaxed text-lg">
            Pricing a cemetery plot is not like checking a home's value — there is no public listing database, and two plots in the same cemetery can be worth very different amounts.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {valueFactors.map(({ Icon, t, d }, i) => (
            <motion.div key={t} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }} className="group bg-card border border-border/60 rounded-2xl p-7 hover:border-primary/40 hover:-translate-y-1 hover:shadow-soft transition-all">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                <Icon className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <p className="font-display text-lg text-foreground mb-2">{t}</p>
              <p className="text-sm text-foreground/70 leading-relaxed">{d}</p>
            </motion.div>
          ))}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.3 }} className="rounded-2xl p-7 bg-gradient-to-br from-primary to-primary/85 text-primary-foreground relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-accent/40 blur-2xl" />
            <div className="relative">
              <p className="text-[11px] tracking-[0.22em] uppercase font-semibold text-primary-foreground/70 mb-2">Don't guess</p>
              <p className="font-display text-2xl leading-tight mb-2">Get a real valuation.</p>
              <p className="text-sm text-primary-foreground/85 leading-relaxed">Plot-specific, no obligation, no email-marketing trap.</p>
            </div>
            <a href="#contact" className="relative inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-primary-foreground text-primary rounded-full font-medium text-sm hover:opacity-90 transition-all w-fit">
              Request yours — free <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>

    {/* WHY A BROKER */}
    <section id="why" className="py-24 bg-gradient-to-b from-background via-card/40 to-background border-y border-border/40">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="text-center mb-14">
          <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-4">Chapter 03 · The case for a broker</p>
          <h2 className="font-display text-4xl md:text-5xl text-foreground mb-5 leading-[1.05]">Why sell through <span className="italic text-primary">a broker</span></h2>
          <p className="text-foreground/70 max-w-2xl mx-auto leading-relaxed">
            Selling back to the cemetery is simple, but many decline or pay only what you originally paid. Listing yourself puts pricing, inquiries, screening, negotiating and the cemetery's transfer paperwork on your shoulders. A broker is built to protect both your value and your peace of mind.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {[
            { n: "01", t: "Reach", h: "We put your property in front of the right buyers.", d: "We cross-reference your plot against live inquiries from funeral homes, estate attorneys and families. Bulletins go to mortuaries; promotion runs across Google Ads, radio, print and in-person outreach. Your plot is marketed, not just listed." },
            { n: "02", t: "Speed", h: "Experts in the transfer — when speed matters most.", d: "Many families need a resting place quickly. We know each cemetery's transfer process in detail and work hand in hand with cemetery offices to complete a transfer as smoothly as possible." },
            { n: "03", t: "Presence", h: "We show the plot in person and explain every difference.", d: "Most families want to see the space before they commit. We meet buyers at the cemetery and walk the grounds, explaining sections, position and options. A plot is often shown five-plus times before the right family decides." },
            { n: "04", t: "Care", h: "Trained to care for families, not just close a sale.", d: "Our team is trained to support grieving families with patience, alongside specialists who explain the paperwork and the small distinctions that matter." },
          ].map((c) => (
            <div key={c.n} className="bg-card border border-border/60 rounded-2xl p-7 hover:border-primary/30 hover:shadow-soft transition-all">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="font-display text-3xl text-primary">{c.n}</span>
                <span className="text-[10px] uppercase tracking-[0.24em] text-accent font-semibold">{c.t}</span>
              </div>
              <p className="font-display text-xl text-foreground mb-2">{c.h}</p>
              <p className="text-sm text-foreground/70 leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* PROCESS TIMELINE */}
    <section className="py-24">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-14">
          <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-4">Chapter 04 · The process</p>
          <h2 className="font-display text-4xl md:text-5xl text-foreground leading-[1.05]">How it works with <span className="italic text-primary">us</span></h2>
        </div>
        <ol className="relative space-y-10 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-accent before:via-primary before:to-primary/30">
          {[
            { t: "Free valuation.", d: "Tell us the cemetery, section and spaces. We assess your plot and explain what it can realistically sell for — no obligation." },
            { t: "We market and match.", d: "Your plot reaches our active buyer network and is cross-referenced against current inquiries — backed by the nationwide reach of our partner Bayer Cemetery Brokers (A+ BBB, 27+ years)." },
            { t: "Paperwork and showings.", d: "We meet interested buyers at the cemetery, answer their questions, and prepare and record the conveyance with the cemetery correctly." },
            { t: "You get paid.", d: "Funds are released once the transfer is confirmed and complete." },
          ].map((s, i) => (
            <li key={i} className="relative pl-14">
              <span className="absolute left-0 top-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display shadow-[0_6px_20px_-6px_hsl(var(--primary)/0.6)]">{i + 1}</span>
              <p className="font-display text-xl text-foreground mb-1">{s.t}</p>
              <p className="text-foreground/70 leading-relaxed">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>

    {/* LEGAL */}
    <section className="py-20 bg-card/40 border-y border-border/40">
      <div className="container mx-auto px-6 max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-4 text-center">Chapter 05 · Legal</p>
        <h2 className="font-display text-4xl md:text-5xl text-foreground mb-6 text-center leading-[1.05]">Selling a plot in Texas, <span className="italic text-primary">legally</span></h2>
        <p className="text-foreground/80 leading-relaxed text-lg mb-4">
          Selling your own plot needs <strong className="text-foreground">no license</strong>. Texas <strong className="text-foreground">repealed the third-party cemetery-broker registration requirement effective September 1, 2019</strong> (S.B. 614) — there is no state cemetery-broker license today.
        </p>
        <p className="text-foreground/80 mb-4">What still applies under the Texas Health &amp; Safety Code:</p>
        <ul className="space-y-3 mb-8">
          {[
            "The conveyance (often a quitclaim) must be on a cemetery-accepted form and recorded with the cemetery — generally within three business days.",
            "Cemetery transfer fees must be collected and remitted.",
            "The seller must keep records of the sale.",
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-3 text-foreground/80">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <span className="leading-relaxed">{t}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-2xl p-6 bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/15">
          <p className="text-foreground/85 leading-relaxed italic">
            A sale is not truly final until the cemetery records the transfer correctly. We make sure that happens — so the buyer is protected and you are fully and cleanly released from the property.
          </p>
        </div>
      </div>
    </section>

    {/* FAQ */}
    <section className="py-24">
      <div className="container mx-auto px-6 max-w-3xl">
        <div className="text-center mb-12">
          <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-4">Chapter 06 · Questions</p>
          <h2 className="font-display text-4xl md:text-5xl text-foreground leading-[1.05]">Frequently <span className="italic text-primary">asked</span></h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <details key={i} className="group rounded-2xl bg-card border border-border/60 open:border-primary/40 open:shadow-soft transition-all">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 px-6 py-5 font-medium text-foreground">
                <span>{f.q}</span>
                <Plus className="w-5 h-5 text-primary shrink-0 group-open:rotate-45 transition-transform" />
              </summary>
              <div className="px-6 pb-6 text-foreground/75 leading-relaxed">{f.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>

    {/* FINAL CTA */}
    <section id="contact" className="pb-28">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-primary-foreground p-10 md:p-16">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-accent/40 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-primary-foreground/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.28em] font-semibold text-primary-foreground/70 mb-4">Find out what it's worth</p>
            <h2 className="font-display text-4xl md:text-5xl mb-5 leading-[1.05]">A free valuation — handled by humans.</h2>
            <p className="text-primary-foreground/85 leading-relaxed mb-8 text-lg">
              Send us the cemetery and section details and we'll give you a no-obligation valuation, then handle the sale from listing to transfer.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href={`tel:${PHONE_DISPLAY.replace(/\D/g, "")}`} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-accent text-accent-foreground rounded-2xl font-medium text-[15px] hover:opacity-95 transition-all">
                <Phone className="w-4 h-4" /> Call {PHONE_DISPLAY}
              </a>
              <a href={`mailto:${EMAIL}`} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary-foreground text-primary rounded-2xl font-medium text-[15px] hover:opacity-95 transition-all">
                <Mail className="w-4 h-4" /> Email Us
              </a>
            </div>
            <p className="text-xs text-primary-foreground/60 italic mt-8 leading-relaxed max-w-xl">
              This guide is general information about selling cemetery property in Texas and is not legal advice. Cemetery policies and applicable rules vary by location; confirm specifics with the cemetery and, where needed, a licensed Texas attorney.
            </p>
          </div>
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

export default GuideSellingCemeteryPlot;
