import { motion } from "framer-motion";
import { ArrowRight, Tag, ShoppingBag, FileText, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";

interface Guide {
  slug: string;
  eyebrow: string;
  title: string;
  titleAccent?: string;
  description: string;
  Icon: typeof Tag;
  status: "live" | "coming-soon";
  readTime?: string;
  chapters?: number;
}

const guides: Guide[] = [
  {
    slug: "selling-a-cemetery-plot-in-texas",
    eyebrow: "For Sellers",
    title: "How to Sell a Cemetery Plot in",
    titleAccent: "Texas",
    description:
      "Everything Texas families need to know — what affects a plot's value, the legal steps, and the most reliable way to turn unwanted plots, crypts and niches into cash.",
    Icon: Tag,
    status: "live",
    readTime: "9 min read",
    chapters: 8,
  },
  {
    slug: "buying-a-cemetery-plot-in-texas",
    eyebrow: "For Buyers",
    title: "How to Buy a Cemetery Plot in",
    titleAccent: "Texas",
    description:
      "A complete walkthrough of choosing the right cemetery, comparing property types, understanding pricing, and securing the right plot for your family — without overpaying.",
    Icon: ShoppingBag,
    status: "coming-soon",
  },
  {
    slug: "cemetery-transfer-process-texas",
    eyebrow: "For Everyone",
    title: "The Cemetery",
    titleAccent: "Transfer Process",
    description:
      "How ownership of cemetery property actually changes hands in Texas — conveyance forms, transfer fees, recording timelines, and the small details that decide whether a sale closes cleanly.",
    Icon: FileText,
    status: "coming-soon",
  },
];

const Guides = () => (
  <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
    <Seo
      title="Guides | Texas Cemetery Brokers — Buying, Selling & Transfer"
      description="Plain-English guides for Texas families on selling, buying, and transferring cemetery property — written by specialists who handle these transactions every day."
      path="/guides"
    />
    <Navbar forceScrolled />

    {/* Hero — soft sage gradient, centered editorial */}
    <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-b from-[hsl(var(--primary)/0.10)] via-background to-background">
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] rounded-full bg-primary/10 blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
      <div className="absolute top-10 left-0 w-[28rem] h-[28rem] rounded-full bg-accent/10 blur-3xl -translate-x-1/3 pointer-events-none" />
      <div className="relative container mx-auto px-6 max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-3 mb-6">
            <span className="w-8 h-px bg-accent" />
            <p className="text-accent text-xs tracking-[0.28em] uppercase font-semibold">
              The Guides Library
            </p>
            <span className="w-8 h-px bg-accent" />
          </div>
          <h1 className="font-display text-5xl md:text-7xl text-foreground leading-[1.05] mb-8">
            Plain-English answers to the
            <br />
            <span className="italic text-primary">hardest questions</span> families ask.
          </h1>
          <p className="text-lg md:text-xl text-foreground/75 max-w-2xl mx-auto leading-relaxed font-light">
            Written by specialists who handle Texas cemetery property every day — three complete
            guides that walk you through valuation, paperwork, and the realities of selling,
            buying, and transferring a plot.
          </p>
        </motion.div>
      </div>
    </section>

    {/* Guide cards */}
    <section className="pb-24 -mt-4">
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {guides.map((g, i) => {
            const isLive = g.status === "live";
            const Card = (
              <article
                className={`group relative h-full flex flex-col rounded-3xl overflow-hidden border transition-all duration-500 ${
                  isLive
                    ? "bg-card border-border/60 hover:border-primary/40 hover:-translate-y-1 hover:shadow-hover shadow-soft"
                    : "bg-card/60 border-border/40 cursor-default"
                }`}
              >
                {/* Top band — sage gradient with icon */}
                <div
                  className={`relative h-44 px-7 pt-7 pb-6 ${
                    isLive
                      ? "bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10"
                      : "bg-gradient-to-br from-muted/60 to-muted/30"
                  }`}
                >
                  <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-accent/15 blur-2xl group-hover:bg-accent/25 transition-colors duration-500" />
                  <div className="relative flex items-start justify-between">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-500 ${
                        isLive
                          ? "bg-primary text-primary-foreground group-hover:scale-110 group-hover:rotate-3"
                          : "bg-muted-foreground/20 text-muted-foreground"
                      }`}
                    >
                      <g.Icon className="w-6 h-6" strokeWidth={1.75} />
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-[0.2em] font-semibold px-3 py-1.5 rounded-full ${
                        isLive
                          ? "bg-accent/15 text-accent"
                          : "bg-foreground/5 text-muted-foreground"
                      }`}
                    >
                      {isLive ? "Available now" : "Coming soon"}
                    </span>
                  </div>
                  <p className="absolute bottom-5 left-7 text-[11px] tracking-[0.22em] uppercase font-semibold text-foreground/60">
                    {g.eyebrow} · Guide 0{i + 1}
                  </p>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col px-7 py-7">
                  <h2 className="font-display text-2xl md:text-[1.7