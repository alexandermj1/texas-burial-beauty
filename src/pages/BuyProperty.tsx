import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, MapPin, Phone, CheckCircle, CreditCard, Calendar, Users, Sparkles, List } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { bayCemeteries, regions } from "@/data/cemeteries";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Step = 1 | 2 | 3 | 4 | 5;

const propertyTypes = [
  { id: "plot", label: "Burial Plot", desc: "Traditional in-ground burial space", icon: "🪦" },
  { id: "niche", label: "Niche", desc: "For cremated remains in a columbarium", icon: "🏛️" },
  { id: "crypt", label: "Crypt / Mausoleum", desc: "Above-ground entombment space", icon: "⛪" },
  { id: "unsure", label: "Not Sure Yet", desc: "We'll help you decide what's best", icon: "💡" },
];

const timelines = [
  { id: "immediate", label: "At-Need (Now)", desc: "I need a property right away for an immediate need" },
  { id: "soon", label: "Within 6 Months", desc: "Planning ahead for the near future" },
  { id: "preneed", label: "Pre-Need (Future)", desc: "Planning ahead — no rush, want the best deal" },
];

const budgets = [
  { id: "under5k", label: "Under $5,000", range: "$1,000 – $5,000" },
  { id: "5to10k", label: "$5,000 – $10,000", range: "Most popular range" },
  { id: "10to20k", label: "$10,000 – $20,000", range: "Premium locations" },
  { id: "over20k", label: "$20,000+", range: "Estate & family plots" },
  { id: "flexible", label: "Flexible / Not Sure", range: "We'll find options for any budget" },
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

  const updateSelection = (key: string, value: string) => {
    setSelections(prev => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!selections.propertyType;
      case 2: return !!selections.timeline;
      case 3: return !!selections.budget;
      case 4: return !!selections.region;
      case 5: return selections.name.trim() && (selections.phone.trim() || selections.email.trim());
      default: return false;
    }
  };

  const next = () => { if (canProceed() && step < 5) setStep((step + 1) as Step); };
  const back = () => { if (step > 1) setStep((step - 1) as Step); };

  const filteredCemeteries = selections.region && selections.region !== "All"
    ? bayCemeteries.filter(c => c.region === selections.region)
    : bayCemeteries;

  const stepVariants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  const steps = [
    { num: 1, label: "Property Type" },
    { num: 2, label: "Timeline" },
    { num: 3, label: "Budget" },
    { num: 4, label: "Location" },
    { num: 5, label: "Contact" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Buy a Cemetery Plot in Texas | Guided Buyer Concierge"
        description="A guided 5-step concierge to help you buy the right cemetery plot in Texas — Dallas, Houston, Austin, San Antonio. Save 30–50% versus buying direct from a cemetery."
        path="/buy"
      />
      <Navbar />

      {/* Hero - matching sell page style */}
      <section className="relative pt-32 pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <img src="/images/cemetery-greenhills.jpg" alt="" className="w-full h-full object-cover object-[center_30%]" loading="lazy" width={1920} height={1080} />
          <div className="absolute inset-0 bg-gradient-hero" />
        </div>
        <div className="relative container mx-auto px-6 pt-4 pb-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <p className="text-primary font-medium text-sm tracking-wide mb-3">Find Your Property</p>
            <h1 className="font-display text-3xl md:text-4xl text-foreground mb-2">
              What type of <span className="italic text-gradient-earth">discounted property</span> are you looking for?
            </h1>
            <p className="text-muted-foreground text-base font-light max-w-lg mb-4">
              We'll guide you to the right property at 30–50% below market prices. It only takes a few minutes.
            </p>
            <Link
              to="/properties"
              className="inline-flex items-center gap-2 text-primary font-medium text-sm hover:underline"
            >
              <List className="w-3.5 h-3.5" />
              Browse all properties & cemeteries instead
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Progress bar */}
      <div className="sticky top-[72px] z-30 bg-background border-b border-border">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-1 py-3 overflow-x-auto">
            {steps.map((s) => (
              <button
                key={s.num}
                onClick={() => { if (s.num < step) setStep(s.num as Step); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                  s.num === step
                    ? "bg-primary text-primary-foreground"
                    : s.num < step
                    ? "bg-primary/15 text-primary cursor-pointer hover:bg-primary/25"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s.num < step ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">{s.num}</span>
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            ))}
          </div>
          <div className="h-0.5 bg-muted -mt-0.5">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${((step - 1) / 4) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      </div>

      {/* Wizard content */}
      <section className="py-10">
        <div className="container mx-auto px-6 max-w-3xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <h2 className="font-display text-2xl md:text-3xl text-foreground mb-2">What type of property are you looking for?</h2>
                <p className="text-muted-foreground mb-6 text-sm">Select the type that best fits your needs. Not sure? We'll help you figure it out.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {propertyTypes.map(t => (
                    <button
                      key={t.id}
                      onClick={() => updateSelection("propertyType", t.id)}
                      className={`text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                        selections.propertyType === t.id
                          ? "border-primary bg-primary/5 shadow-soft"
                          : "border-border bg-card hover:border-primary/30 hover:shadow-soft"
                      }`}
                    >
                      <span className="text-2xl mb-2 block">{t.icon}</span>
                      <h3 className="font-display text-base text-foreground">{t.label}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <h2 className="font-display text-2xl md:text-3xl text-foreground mb-2">When do you need the property?</h2>
                <p className="text-muted-foreground mb-6 text-sm">This helps us prioritize the right options for you.</p>
                <div className="space-y-3">
                  {timelines.map(t => (
                    <button
                      key={t.id}
                      onClick={() => updateSelection("timeline", t.id)}
                      className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                        selections.timeline === t.id
                          ? "border-primary bg-primary/5 shadow-soft"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <h3 className="font-display text-base text-foreground">{t.label}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                    </button>
                  ))}
                </div>

                {selections.timeline === "preneed" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 p-5 rounded-xl bg-primary/5 border border-primary/20"
                  >
                    <div className="flex items-start gap-3">
                      <CreditCard className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-display text-sm text-foreground mb-1">Interest-Free Financing Available</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          For pre-need purchases, we offer <strong className="text-foreground">interest-free financing with just 20% down</strong>. Lock in today's below-market price and pay over time with zero interest.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <h2 className="font-display text-2xl md:text-3xl text-foreground mb-2">What's your budget range?</h2>
                <p className="text-muted-foreground mb-2 text-sm">Remember — our prices are 30–50% below what cemeteries charge directly.</p>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-6 p-4 rounded-xl bg-gradient-sage border border-primary/10 flex items-center gap-3"
                >
                  <Sparkles className="w-5 h-5 text-primary shrink-0" />
                  <p className="text-xs text-foreground">
                    <strong>Example:</strong> A plot that costs $12,000 directly from the cemetery might be just $6,000–$8,000 through us.
                  </p>
                </motion.div>

                <div className="space-y-3">
                  {budgets.map(b => (
                    <button
                      key={b.id}
                      onClick={() => updateSelection("budget", b.id)}
                      className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${
                        selections.budget === b.id
                          ? "border-primary bg-primary/5 shadow-soft"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <div>
                        <h3 className="font-display text-base text-foreground">{b.label}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{b.range}</p>
                      </div>
                      {selections.budget === b.id && <CheckCircle className="w-5 h-5 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>

                {selections.timeline === "preneed" && (
                  <p className="mt-4 text-xs text-primary flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" />
                    Interest-free financing: 20% down, 0% interest
                  </p>
                )}
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <h2 className="font-display text-2xl md:text-3xl text-foreground mb-2">Where are you looking?</h2>
                <p className="text-muted-foreground mb-6 text-sm">Pick a region and optionally select a specific cemetery. We serve 80+ cemeteries across Texas — Dallas, Houston, Austin, San Antonio and beyond.</p>

                <div className="flex flex-wrap gap-2 mb-5">
                  {regions.filter(r => r !== "All").map(r => (
                    <button
                      key={r}
                      onClick={() => updateSelection("region", r)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
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
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2 max-h-[45vh] overflow-y-auto pr-1"
                  >
                    <button
                      onClick={() => updateSelection("cemetery", "")}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                        selections.cemetery === ""
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <h3 className="font-display text-sm text-foreground">Any cemetery in {selections.region}</h3>
                      <p className="text-xs text-muted-foreground">Show me all available options</p>
                    </button>
                    {filteredCemeteries.map(c => (
                      <button
                        key={c.name}
                        onClick={() => updateSelection("cemetery", c.name)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                          selections.cemetery === c.name
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/30"
                        }`}
                      >
                        <h3 className="font-display text-sm text-foreground">{c.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {c.address}
                        </p>
                      </button>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="step5" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                <h2 className="font-display text-2xl md:text-3xl text-foreground mb-2">Almost there! How can we reach you?</h2>
                <p className="text-muted-foreground mb-6 text-sm">
                  We'll get back to you within 24 hours with available properties matching your preferences. We can also schedule a cemetery visit to show you the property in person.
                </p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name *</label>
                    <input
                      type="text"
                      value={selections.name}
                      onChange={e => updateSelection("name", e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Phone Number</label>
                    <input
                      type="tel"
                      value={selections.phone}
                      onChange={e => updateSelection("phone", e.target.value)}
                      placeholder="(650) 555-0123"
                      className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                    <input
                      type="email"
                      value={selections.email}
                      onChange={e => updateSelection("email", e.target.value)}
                      placeholder="you@email.com"
                      className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-gradient-sage border border-primary/10 mb-6">
                  <h3 className="font-display text-sm text-foreground mb-3">Your Preferences</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Type:</span> <span className="text-foreground font-medium">{propertyTypes.find(t => t.id === selections.propertyType)?.label || "—"}</span></div>
                    <div><span className="text-muted-foreground">Timeline:</span> <span className="text-foreground font-medium">{timelines.find(t => t.id === selections.timeline)?.label || "—"}</span></div>
                    <div><span className="text-muted-foreground">Budget:</span> <span className="text-foreground font-medium">{budgets.find(b => b.id === selections.budget)?.label || "—"}</span></div>
                    <div><span className="text-muted-foreground">Location:</span> <span className="text-foreground font-medium">{selections.cemetery || selections.region || "—"}</span></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-display text-sm text-foreground">What happens next?</h3>
                  <div className="flex items-start gap-3 text-xs text-muted-foreground">
                    <Calendar className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p>We'll contact you within 24 hours with available properties matching your preferences.</p>
                  </div>
                  <div className="flex items-start gap-3 text-xs text-muted-foreground">
                    <Users className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p>We'll schedule an in-person visit to show you the property at the cemetery — no obligation.</p>
                  </div>
                  <div className="flex items-start gap-3 text-xs text-muted-foreground">
                    <CreditCard className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p>Pre-need buyers can use our interest-free financing: 20% down, 0% interest, easy monthly payments.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            {step > 1 ? (
              <button
                onClick={back}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <button
                onClick={next}
                disabled={!canProceed()}
                className="inline-flex items-center gap-2 px-7 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                disabled={!canProceed() || submitting}
                onClick={async () => {
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
                  toast({ title: "Request submitted!", description: "We'll be in touch within 24 hours. You can also call us at (424) 234-1678." });
                }}
                className="inline-flex items-center gap-2 px-7 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Request"} <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick call CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
          >
            <p className="text-xs text-muted-foreground mb-2">Prefer to talk to someone?</p>
            <a
              href="tel:+14242341678"
              className="inline-flex items-center gap-2 text-primary font-medium text-sm hover:underline"
            >
              <Phone className="w-3.5 h-3.5" />
              Call (424) 234-1678
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BuyProperty;
