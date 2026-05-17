import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Phone, CheckCircle, CreditCard, Sparkles, List, HelpCircle } from "lucide-react";
import singlePlotImg from "@/assets/property-types/single-plot.png";
import nicheImg from "@/assets/property-types/cremation-niche.png";
import cryptImg from "@/assets/property-types/mausoleum.png";
import familyEstateImg from "@/assets/property-types/family-estate.png";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import { bayCemeteries, regions } from "@/data/cemeteries";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Step = 1 | 2 | 3 | 4 | 5;

const propertyTypes = [
  { id: "plot", label: "Burial Plot", desc: "Traditional in-ground burial", image: singlePlotImg },
  { id: "niche", label: "Niche", desc: "For cremated remains in a columbarium", image: nicheImg },
  { id: "crypt", label: "Crypt / Mausoleum", desc: "Above-ground entombment space", image: cryptImg },
  { id: "unsure", label: "Not Sure Yet", desc: "We'll help you decide", image: familyEstateImg },
];

const timelines = [
  { id: "immediate", label: "At-Need (Now)", desc: "I need a property right away" },
  { id: "soon", label: "Within 6 Months", desc: "Planning for the near future" },
  { id: "preneed", label: "Pre-Need (Future)", desc: "No rush — best deal possible" },
];

const budgets = [
  { id: "under5k", label: "Under $5,000", range: "$1,000 – $5,000" },
  { id: "5to10k", label: "$5,000 – $10,000", range: "Most popular range" },
  { id: "10to20k", label: "$10,000 – $20,000", range: "Premium locations" },
  { id: "over20k", label: "$20,000+", range: "Estate & family plots" },
  { id: "flexible", label: "Flexible / Not Sure", range: "Options for any budget" },
];

const BuyProperty = () => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [selections, setSelections] = useState({
    propertyType: "",
    timeline: "",
    budget: "",
    region: "",
    cemetery: "",
    name: "",
    phone: "",
    email: "",
  });

  const update = (key: string, value: string) => {
    setSelections(prev => ({ ...prev, [key]: value }));
  };

  // Auto-advance helper for single-pick steps
  const pick = (key: string, value: string, nextStep?: Step) => {
    update(key, value);
    if (nextStep) {
      // small delay so user sees their selection animate
      setTimeout(() => setStep(nextStep), 180);
    }
  };

  const back = () => { if (step > 1) setStep((step - 1) as Step); };

  const filteredCemeteries = selections.region && selections.region !== "All"
    ? bayCemeteries.filter(c => c.region === selections.region)
    : bayCemeteries;

  const steps = [
    { num: 1, label: "Type" },
    { num: 2, label: "Timeline" },
    { num: 3, label: "Budget" },
    { num: 4, label: "Location" },
    { num: 5, label: "Contact" },
  ];

  const titles: Record<Step, string> = {
    1: "What type of property are you looking for?",
    2: "When do you need it?",
    3: "What's your budget?",
    4: "Where in Texas?",
    5: "How can we reach you?",
  };

  const subtitles: Record<Step, string> = {
    1: "Pick one — we'll tailor the options to suit.",
    2: "This helps us prioritize what to show you.",
    3: "Our prices are 30–50% below cemeteries.",
    4: "Choose a region, then a specific cemetery if you'd like.",
    5: "We'll get back to you within 24 hours.",
  };

  const canSubmit = selections.name.trim() && (selections.phone.trim() || selections.email.trim());

  const submit = async () => {
    setSubmitting(true);
    const { error } = await supabase.from("contact_submissions" as any).insert({
      source: "buy_property_wizard",
      name: selections.name.trim(),
      email: selections.email.trim() || null,
      phone: selections.phone.trim() || null,
      property_type: selections.propertyType,
      timeline: selections.timeline,
      budget: selections.budget,
      region: selections.region,
      cemetery: selections.cemetery || null,
      created_at: new Date().toISOString(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Something went wrong", description: "Please call or email us directly.", variant: "destructive" });
      return;
    }
    toast({ title: "Request submitted!", description: "We'll be in touch within 24 hours. You can also call (424) 234-1678." });
  };

  // Card variants
  const cardBase = "text-left rounded-xl border-2 transition-all duration-200 w-full";
  const cardIdle = "border-border bg-card hover:border-primary/40";
  const cardActive = "border-primary bg-primary/5 shadow-soft";

  return (
    <div className="min-h-svh bg-background flex flex-col">
      <Seo
        title="Find a Cemetery Plot in Texas | Guided Buyer Concierge"
        description="A clean 5-step concierge to help you buy the right cemetery plot in Texas — Dallas, Houston, Austin, San Antonio. Save 30–50% versus buying direct."
        path="/buy"
      />
      <Navbar forceScrolled />

      {/* Compact header — title, subtitle, progress. No big image. */}
      <header className="pt-20 sm:pt-24 pb-3 sm:pb-4 border-b border-border bg-gradient-warm">
        <div className="container mx-auto px-5 max-w-3xl">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-primary font-medium text-[11px] tracking-[0.18em] uppercase">Find Your Property · Step {step} of 5</p>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-[11px] text-muted-foreground">⏱ Takes ~60 seconds</span>
              <Link to="/properties" className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground">
                <List className="w-3 h-3" /> Browse all
              </Link>
            </div>
          </div>
          <h1 className="font-display text-xl sm:text-3xl text-foreground leading-tight tracking-tight">
            {titles[step]}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">{subtitles[step]}</p>

          {/* Step pips */}
          <div className="flex items-center gap-1.5 mt-3">
            {steps.map(s => (
              <button
                key={s.num}
                onClick={() => { if (s.num < step) setStep(s.num as Step); }}
                disabled={s.num > step}
                className="group flex-1 flex flex-col items-start gap-1"
                aria-label={`Step ${s.num}: ${s.label}`}
              >
                <span
                  className={`h-1 w-full rounded-full transition-all ${
                    s.num < step ? "bg-primary" : s.num === step ? "bg-primary" : "bg-muted"
                  }`}
                />
                <span className={`text-[10px] tracking-wide ${s.num === step ? "text-foreground font-medium" : "text-muted-foreground"} hidden sm:inline`}>
                  {s.num}. {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Quiz body — fills remaining viewport. */}
      <main className="flex-1 min-h-0">
        <div className="container mx-auto px-5 max-w-3xl py-4 sm:py-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                className="grid grid-cols-2 gap-2.5 sm:gap-4"
              >
                {propertyTypes.map(t => {
                  const isActive = selections.propertyType === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => pick("propertyType", t.id, 2)}
                      className={`${cardBase} group relative overflow-hidden ${isActive ? cardActive : cardIdle}`}
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                        <img
                          src={t.image}
                          alt={t.label}
                          loading="lazy"
                          className={`w-full h-full object-cover transition-transform duration-500 ${isActive ? "scale-105" : "group-hover:scale-105"}`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent" />
                        {isActive && (
                          <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-soft">
                            <CheckCircle className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                      <div className="p-3 sm:p-4">
                        <h3 className="font-display text-sm sm:text-base text-foreground">{t.label}</h3>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-snug">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                {timelines.map(t => (
                  <button
                    key={t.id}
                    onClick={() => pick("timeline", t.id, 3)}
                    className={`${cardBase} p-3 sm:p-4 ${selections.timeline === t.id ? cardActive : cardIdle}`}
                  >
                    <h3 className="font-display text-sm sm:text-base text-foreground">{t.label}</h3>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  </button>
                ))}
                {selections.timeline === "preneed" && (
                  <div className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-2">
                    <CreditCard className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[11px] sm:text-xs text-foreground">
                      <strong>Interest-free financing</strong> available — 20% down, 0% interest.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <div className="mb-3 p-2.5 rounded-lg bg-gradient-sage border border-primary/10 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-[11px] sm:text-xs text-foreground">
                    Our prices are <strong>30–50% below</strong> what cemeteries charge directly.
                  </p>
                </div>
                <div className="space-y-2">
                  {budgets.map(b => (
                    <button
                      key={b.id}
                      onClick={() => pick("budget", b.id, 4)}
                      className={`${cardBase} p-3 sm:p-3.5 flex items-center justify-between ${selections.budget === b.id ? cardActive : cardIdle}`}
                    >
                      <div>
                        <h3 className="font-display text-sm sm:text-base text-foreground">{b.label}</h3>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{b.range}</p>
                      </div>
                      {selections.budget === b.id && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {regions.filter(r => r !== "All").map(r => (
                    <button
                      key={r}
                      onClick={() => { update("region", r); update("cemetery", ""); }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selections.region === r
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground border border-border hover:text-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {selections.region && (
                  <div className="space-y-1.5 max-h-[42vh] overflow-y-auto pr-1">
                    <button
                      onClick={() => pick("cemetery", "", 5)}
                      className={`${cardBase} p-3 ${selections.cemetery === "" ? cardActive : cardIdle}`}
                    >
                      <h3 className="font-display text-sm text-foreground">Any cemetery in {selections.region}</h3>
                      <p className="text-[11px] text-muted-foreground">Show me all options →</p>
                    </button>
                    {filteredCemeteries.map(c => (
                      <button
                        key={c.name}
                        onClick={() => pick("cemetery", c.name, 5)}
                        className={`${cardBase} p-3 ${selections.cemetery === c.name ? cardActive : cardIdle}`}
                      >
                        <h3 className="font-display text-sm text-foreground">{c.name}</h3>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {c.address}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {!selections.region && (
                  <p className="text-xs text-muted-foreground">Pick a region to continue.</p>
                )}
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <form
                  onSubmit={(e) => { e.preventDefault(); if (canSubmit && !submitting) submit(); }}
                  className="space-y-2.5 mb-4"
                >
                  <input
                    autoFocus
                    type="text"
                    value={selections.name}
                    onChange={e => update("name", e.target.value)}
                    placeholder="Full name *"
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                  />
                  <input
                    type="tel"
                    value={selections.phone}
                    onChange={e => update("phone", e.target.value)}
                    placeholder="Phone number"
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                  />
                  <input
                    type="email"
                    value={selections.email}
                    onChange={e => update("email", e.target.value)}
                    placeholder="Email"
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                  />
                  <p className="text-[11px] text-muted-foreground">Phone or email — at least one required. We never share your info.</p>

                  <div className="p-3 rounded-xl bg-gradient-sage border border-primary/10 !mt-4">
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] sm:text-xs">
                      <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground font-medium">{propertyTypes.find(t => t.id === selections.propertyType)?.label || "—"}</span></div>
                      <div><span className="text-muted-foreground">Timeline:</span> <span className="text-foreground font-medium">{timelines.find(t => t.id === selections.timeline)?.label || "—"}</span></div>
                      <div><span className="text-muted-foreground">Budget:</span> <span className="text-foreground font-medium">{budgets.find(b => b.id === selections.budget)?.label || "—"}</span></div>
                      <div><span className="text-muted-foreground">Location:</span> <span className="text-foreground font-medium truncate">{selections.cemetery || selections.region || "—"}</span></div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmit || submitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed !mt-4 shadow-soft"
                  >
                    {submitting ? "Submitting..." : "Submit Request"}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom bar — Back + trust + call. Sticky. */}
      <footer className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur z-20">
        <div className="container mx-auto px-5 max-w-3xl py-3 flex items-center justify-between gap-3">
          <button
            onClick={back}
            disabled={step === 1}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-sm text-foreground font-medium hover:bg-muted hover:border-primary/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="hidden sm:inline text-[11px] text-muted-foreground">Private · No spam · Texas-licensed brokers</span>
          <a
            href="tel:+14242341678"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-primary font-medium hover:underline"
          >
            <Phone className="w-3.5 h-3.5" />
            (424) 234-1678
          </a>
        </div>
      </footer>
    </div>
  );
};

export default BuyProperty;
