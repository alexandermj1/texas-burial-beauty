import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Phone, Mail, ShieldCheck, Users, Network, Clock, Award, Handshake, MapPin, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import partnersHeroBg from "@/assets/hero/cemetery-mountains.jpg";

const pillars = [
  {
    icon: Clock,
    label: "29+ Years",
    title: "Established Expertise",
    desc: "Bay Cemetery Brokers has operated as a licensed, full-service brokerage since 1996 — three decades of refining a process that protects families on both sides of every transaction.",
  },
  {
    icon: Network,
    label: "Two-State Network",
    title: "Expanded Buyer Reach",
    desc: "Our partnership unifies buyer pools across Texas and California, dramatically shortening time-to-sale and increasing the probability of matching the right property to the right family.",
  },
  {
    icon: ShieldCheck,
    label: "License CEB 1421",
    title: "Bonded & Compliant",
    desc: "Every transaction is executed under licensed broker oversight (CEB 1421), with proper documentation routed through each cemetery's official transfer process.",
  },
  {
    icon: Users,
    label: "10,000+ Families",
    title: "Proven Outcomes",
    desc: "Our partner network has guided more than 10,000 families through cemetery resales — saving sellers from carrying costs and saving buyers 20–80% versus direct cemetery pricing.",
  },
];

const advantages = [
  {
    title: "Faster Time to Sale",
    desc: "Pooled buyer demand means most listings find a qualified buyer in 30–60 days — substantially faster than going it alone or relying on a single regional brokerage.",
  },
  {
    title: "Texas-First, Network-Backed",
    desc: "Texas Cemetery Brokers is licensed and operated locally in Dallas, with deep coverage of DFW, Houston, Austin and San Antonio — fully supported by our partner's 29-year resale playbook.",
  },
  {
    title: "Honest, Transparent Pricing",
    desc: "Free valuations grounded in verified comparable sales. No upfront fees, no surprises. Sellers only pay when their property closes.",
  },
  {
    title: "End-to-End Coordination",
    desc: "From cemetery paperwork and deed retrieval to buyer qualification and closing — our combined operations team handles every step on your behalf.",
  },
];

const milestones = [
  { year: "1996", text: "Bay Cemetery Brokers founded as a full-service cemetery resale brokerage." },
  { year: "2018", text: "Licensed and bonded under broker license CEB 1421." },
  { year: "2020s", text: "Helped more than 10,000 families across the Western U.S. resell cemetery property." },
  { year: "Today", text: "Texas Cemetery Brokers launches in Dallas, extending the same trusted process to families across Texas." },
];

const Partners = () => {
  useEffect(() => {
    document.title = "Our Partnership with Bay Cemetery Brokers | Texas Cemetery Brokers";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <motion.img
          src={partnersHeroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-foreground/90 via-foreground/75 to-foreground/55" />
        <div className="relative container mx-auto px-6 pt-36 pb-24 md:pt-40 md:pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground/85 text-xs tracking-[0.25em] uppercase font-medium mb-6 backdrop-blur-sm">
              <Handshake className="w-3.5 h-3.5" />
              Strategic Partnership
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-primary-foreground leading-[1.05] mb-6 drop-shadow-lg">
              Texas Cemetery Brokers, in partnership with{" "}
              <span className="italic font-light">Bay Cemetery Brokers</span>
            </h1>
            <p className="text-primary-foreground/85 text-lg md:text-xl font-light leading-relaxed max-w-2xl drop-shadow-md mb-8">
              Two licensed brokerages, one shared mission: help Texas families buy and sell cemetery property faster, fairer, and with the wisdom of nearly three decades of experience behind every transaction.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/sell"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all"
              >
                Sell Your Property <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/properties"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground font-medium rounded-full text-sm hover:bg-primary-foreground/20 transition-all backdrop-blur-sm"
              >
                Browse Properties
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Two-logo lockup */}
      <section className="py-14 border-b border-border/50 bg-card/40">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-8 md:gap-12 items-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center md:text-right"
            >
              <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground mb-2">Texas Operations</p>
              <p className="font-display text-2xl md:text-3xl text-foreground leading-tight">Texas Cemetery Brokers</p>
              <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center md:justify-end gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Dallas, TX
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden md:flex items-center justify-center"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Handshake className="w-5 h-5 text-primary" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center md:text-left"
            >
              <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground mb-2">Partner Brokerage · Est. 1996</p>
              <p className="font-display text-2xl md:text-3xl text-foreground leading-tight">Bay Cemetery Brokers</p>
              <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center md:justify-start gap-1.5">
                <Award className="w-3.5 h-3.5" /> CEB 1421 · 29+ Years
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The story */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <span className="inline-block text-xs tracking-[0.3em] uppercase text-primary font-medium mb-4">Why this partnership</span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-foreground leading-tight">
              The trust of a 29-year brokerage. The focus of a Texas team.
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="prose prose-lg max-w-none text-muted-foreground space-y-5 leading-relaxed"
          >
            <p>
              Texas families deserve the same caliber of cemetery resale expertise that families on the West Coast have relied on for nearly three decades. Rather than start from scratch, we partnered with one of the country's most established cemetery brokerages — <strong className="text-foreground font-medium">Bay Cemetery Brokers</strong> — to bring their proven process to Dallas, Houston, Austin and beyond.
            </p>
            <p>
              The result is <strong className="text-foreground font-medium">Texas Cemetery Brokers</strong>: a Dallas-headquartered operation with local representatives on the ground in Texas, fully backed by Bay Cemetery Brokers' licensed brokerage infrastructure (CEB 1421), buyer network of 10,000+ families, and a refined 30–60 day sale process that has saved sellers from years of carrying costs.
            </p>
            <p>
              For sellers, this means your property is marketed across two states the day it's listed. For buyers, it means access to off-market inventory and 20–80% savings versus buying direct from cemeteries. For every family we serve, it means working with people who have done this thousands of times — and who care about getting it right.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-20 bg-gradient-warm">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14 max-w-2xl mx-auto"
          >
            <span className="inline-block text-xs tracking-[0.3em] uppercase text-primary font-medium mb-3">What we bring together</span>
            <h2 className="font-display text-3xl md:text-4xl text-foreground">Four pillars of the partnership</h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5 max-w-5xl mx-auto">
            {pillars.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group relative bg-card rounded-2xl p-7 border border-border/60 shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-secondary/[0.06] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <p.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground font-medium">{p.label}</span>
                  </div>
                  <h3 className="font-display text-xl text-foreground mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Advantages */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-6 max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="inline-block text-xs tracking-[0.3em] uppercase text-primary font-medium mb-3">What it means for you</span>
            <h2 className="font-display text-3xl md:text-4xl text-foreground">A measurable advantage on every sale</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {advantages.map((a, i) => (
              <motion.div
                key={a.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="border-l-2 border-primary/40 pl-6 py-2"
              >
                <h3 className="font-display text-lg text-foreground mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {a.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-muted/30 border-y border-border/40">
        <div className="container mx-auto px-6 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="inline-block text-xs tracking-[0.3em] uppercase text-primary font-medium mb-3">A shared history</span>
            <h2 className="font-display text-3xl md:text-4xl text-foreground">Built on three decades of trust</h2>
          </motion.div>

          <div className="relative">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-border to-transparent" />
            {milestones.map((m, i) => (
              <motion.div
                key={m.year}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative pl-10 pb-8 last:pb-0"
              >
                <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-primary border-4 border-background shadow-sm" />
                <p className="font-display text-lg text-foreground mb-1">{m.year}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{m.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Award className="w-8 h-8 text-primary/40 mx-auto mb-6" />
            <blockquote className="font-display text-2xl md:text-3xl text-foreground/85 italic leading-relaxed">
              "Our partnership is simple — combine the experience of a 29-year brokerage with a Texas team that lives and works alongside the families it serves. The outcome is faster sales, fairer prices, and total peace of mind."
            </blockquote>
            <p className="text-sm text-muted-foreground mt-6 tracking-wide">— Texas Cemetery Brokers · Bay Cemetery Brokers</p>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-sage">
        <div className="container mx-auto px-6 text-center max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-display text-3xl md:text-4xl text-foreground mb-4">
              Put the partnership to work for your family
            </h2>
            <p className="text-muted-foreground text-lg font-light mb-8">
              Whether you're buying or selling cemetery property anywhere in Texas, you get the full strength of both brokerages — at no extra cost.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="tel:+12142560795"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all"
              >
                <Phone className="w-4 h-4" /> (214) 256-0795
              </a>
              <a
                href="mailto:Help@TexasCemeteryBrokers.com"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-foreground/15 text-foreground font-medium rounded-full text-sm hover:bg-foreground/5 transition-all"
              >
                <Mail className="w-4 h-4" /> Email Us
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Partners;
