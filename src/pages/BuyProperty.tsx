import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Phone, CheckCircle, CreditCard, Sparkles, List, Navigation, Mail, MessageSquare, Loader2 } from "lucide-react";
import singlePlotImg from "@/assets/property-types/single-plot.png";
import nicheImg from "@/assets/property-types/cremation-niche.png";
import cryptImg from "@/assets/property-types/mausoleum.png";
import familyEstateImg from "@/assets/property-types/family-estate.png";
import hillsideImg from "@/assets/cemeteries/hillside-cemetery.png";
import naturalImg from "@/assets/cemeteries/natural-cemetery.png";
import mausoleumCemImg from "@/assets/cemeteries/mausoleum-cemetery.png";
import chapelImg from "@/assets/cemeteries/chapel-cemetery.png";
import italianImg from "@/assets/cemeteries/italian-cemetery.png";
import greekImg from "@/assets/cemeteries/greek-cemetery.png";
import veteransCemImg from "@/assets/cemeteries/veterans-cemetery.png";
import defaultCemImg from "@/assets/cemeteries/default-cemetery.png";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import { bayCemeteries, regions, CemeteryInfo } from "@/data/cemeteries";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Step = 1 | 2 | 3 | 4 | 5;

const propertyTypes = [
  { id: "plot", label: "Burial Plot", desc: "Traditional in-ground burial", image: singlePlotImg },
  { id: "niche", label: "Niche", desc: "Cremated remains in a columbarium", image: nicheImg },
  { id: "crypt", label: "Crypt / Mausoleum", desc: "Above-ground entombment", image: cryptImg },
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

// Region anchor coordinates for "Nearest to me" matching
const regionCenters: Record<string, { lat: number; lng: number; image: string; blurb: string }> = {
  "Dallas–Fort Worth": { lat: 32.7767, lng: -96.7970, image: hillsideImg, blurb: "Dallas, Fort Worth, Plano, Arlington" },
  "Greater Houston":   { lat: 29.7604, lng: -95.3698, image: chapelImg, blurb: "Houston, Sugar Land, The Woodlands" },
  "Austin":            { lat: 30.2672, lng: -97.7431, image: naturalImg, blurb: "Austin, Round Rock, Cedar Park" },
  "San Antonio":       { lat: 29.4241, lng: -98.4936, image: mausoleumCemImg, blurb: "San Antonio & surrounding hill country" },
  "El Paso & West Texas": { lat: 31.7619, lng: -106.4850, image: veteransCemImg, blurb: "El Paso, Midland, Odessa, Lubbock" },
  "Central Texas":     { lat: 31.5493, lng: -97.1467, image: italianImg, blurb: "Waco, Killeen, Temple, College Station" },
  "East Texas":        { lat: 32.3513, lng: -95.3011, image: greekImg, blurb: "Tyler, Longview, Marshall" },
  "South Texas":       { lat: 27.8006, lng: -97.3964, image: defaultCemImg, blurb: "Corpus Christi, Brownsville, McAllen" },
  "West & North Texas":{ lat: 33.5779, lng: -101.8552, image: hillsideImg, blurb: "Lubbock, Amarillo, Abilene" },
};

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const BuyProperty = () => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [locating, setLocating] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selections, setSelections] = useState({
    propertyType: "",
    timeline: "",
    budget: "",
    region: "",
    cemetery: "",
    name: "",
    phone: "",
    email: "",
    contactPref: "either" as "phone" | "email" | "either",
  });

  const update = (key: string, value: string) => setSelections(prev => ({ ...prev, [key]: value }));

  const pick = (key: string, value: string, nextStep?: Step) => {
    update(key, value);
    if (nextStep) setTimeout(() => setStep(nextStep), 180);
  };

  const back = () => { if (step > 1) setStep((step - 1) as Step); };

  // Region counts
  const regionCounts = useMemo(() => {
    const m: Record<string, number> = {};
    bayCemeteries.forEach(c => { m[c.region] = (m[c.region] || 0) + 1; });
    return m;
  }, []);

  // Ordered regions: by distance if we have coords, else by count
  const orderedRegions = useMemo(() => {
    const list = regions.filter(r => r !== "All");
    if (userCoords) {
      return [...list].sort((a, b) => {
        const ca = regionCenters[a], cb = regionCenters[b];
        if (!ca || !cb) return 0;
        return haversine(userCoords.lat, userCoords.lng, ca.lat, ca.lng) -
               haversine(userCoords.lat, userCoords.lng, cb.lat, cb.lng);
      });
    }
    return [...list].sort((a, b) => (regionCounts[b] || 0) - (regionCounts[a] || 0));
  }, [userCoords, regionCounts]);

  const filteredCemeteries: CemeteryInfo[] = useMemo(() => {
    if (!selections.region) return [];
    const inRegion = bayCemeteries.filter(c => c.region === selections.region);
    if (userCoords) {
      return [...inRegion].sort((a, b) =>
        haversine(userCoords.lat, userCoords.lng, a.lat, a.lng) -
        haversine(userCoords.lat, userCoords.lng, b.lat, b.lng)
      );
    }
    return inRegion;
  }, [selections.region, userCoords]);

  const findNearest = () => {
    if (!navigator.geolocation) {
      toast({ title: "Location unavailable", description: "Your browser doesn't support geolocation." });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        // Auto-select nearest region
        const nearest = [...Object.entries(regionCenters)].sort(([, a], [, b]) =>
          haversine(coords.lat, coords.lng, a.lat, a.lng) - haversine(coords.lat, coords.lng, b.lat, b.lng)
        )[0]?.[0];
        if (nearest) update("region", nearest);
        setLocating(false);
        toast({ title: "Found you", description: nearest ? `Showing options nearest ${nearest}.` : "Showing nearest options." });
      },
      () => {
        setLocating(false);
        toast({ title: "Location blocked", description: "Allow location access or pick a region below.", variant: "destructive" });
      },
      { timeout: 8000 }
    );
  };

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
    4: "Find your area or use your location.",
    5: "Choose how you'd prefer we contact you.",
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
      contact_preference: selections.contactPref,
      created_at: new Date().toISOString(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Something went wrong", description: "Please call or email us directly.", variant: "destructive" });
      return;
    }
    toast({ title: "Request submitted!", description: "We'll be in touch within 24 hours. You can also call (424) 234-1678." });
  };

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

      {/* Integrated header — no hard border, blends into page */}
      <header className="pt-24 sm:pt-28 pb-4 sm:pb-6 bg-background">
        <div className="container mx-auto px-6 lg:px-10 max-w-6xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-primary font-medium text-[11px] tracking-[0.2em] uppercase">Find Your Property · Step {step} of 5</p>
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline text-[11px] text-muted-foreground">⏱ ~60 seconds</span>
              <Link to="/properties" className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground">
                <List className="w-3 h-3" /> Browse all
              </Link>
            </div>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl text-foreground leading-tight tracking-tight">
            {titles[step]}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1.5 max-w-2xl">{subtitles[step]}</p>

          <div className="flex items-center gap-2 mt-5">
            {steps.map(s => (
              <button
                key={s.num}
                onClick={() => { if (s.num < step) setStep(s.num as Step); }}
                disabled={s.num > step}
                className="group flex-1 flex flex-col items-start gap-1.5"
                aria-label={`Step ${s.num}: ${s.label}`}
              >
                <span className={`h-[3px] w-full rounded-full transition-all ${s.num <= step ? "bg-primary" : "bg-muted"}`} />
                <span className={`text-[10px] tracking-wide ${s.num === step ? "text-foreground font-medium" : "text-muted-foreground"} hidden sm:inline`}>
                  {s.num}. {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <div className="container mx-auto px-6 lg:px-10 max-w-6xl py-4 sm:py-6">
          <AnimatePresence mode="wait">
            {/* STEP 1 — Type */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
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
                        {isActive && (
                          <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-soft">
                            <CheckCircle className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                      <div className="p-3 sm:p-4">
                        <h3 className="font-display text-base sm:text-lg text-foreground leading-tight">{t.label}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-snug">{t.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}

            {/* STEP 2 — Timeline (financing tip BEFORE choices) */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-2.5 mb-3">
                  <CreditCard className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] sm:text-xs text-foreground leading-snug">
                    <strong>Planning ahead?</strong> Pre-need buyers get our best prices plus <strong>interest-free financing</strong> — 20% down, 0% interest.
                  </p>
                </div>
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
              </motion.div>
            )}

            {/* STEP 3 — Budget */}
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

            {/* STEP 4 — Location (organized cards + nearest-to-me) */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                {/* Nearest to me */}
                <button
                  onClick={findNearest}
                  disabled={locating}
                  className="w-full mb-3 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all shadow-soft disabled:opacity-60"
                >
                  {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  {locating ? "Finding your location…" : userCoords ? "Re-sort by my location" : "Find nearest to me"}
                </button>

                {!selections.region && (
                  <>
                    <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider">
                      {userCoords ? "Closest regions" : "Choose a region"}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                      {orderedRegions.map(r => {
                        const meta = regionCenters[r];
                        const count = regionCounts[r] || 0;
                        return (
                          <button
                            key={r}
                            onClick={() => update("region", r)}
                            className={`${cardBase} group relative overflow-hidden ${cardIdle}`}
                          >
                            <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                              {meta?.image && (
                                <img src={meta.image} alt={r} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-foreground/10 to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-2">
                                <h3 className="font-display text-xs sm:text-sm text-background leading-tight">{r}</h3>
                                <p className="text-[10px] text-background/80">{count} cemeteries</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {selections.region && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                        {selections.region} · {filteredCemeteries.length} options
                      </p>
                      <button
                        onClick={() => { update("region", ""); update("cemetery", ""); }}
                        className="text-[11px] text-primary hover:underline"
                      >
                        Change region
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-[46vh] overflow-y-auto pr-1">
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
                  </>
                )}
              </motion.div>
            )}

            {/* STEP 5 — Contact */}
            {step === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                {/* Prominent call-now option */}
                <a
                  href="tel:+14242341678"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 mb-3 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-all shadow-soft"
                >
                  <Phone className="w-4 h-4" />
                  Or call us now — (424) 234-1678
                </a>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Or send a request</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <form
                  onSubmit={(e) => { e.preventDefault(); if (canSubmit && !submitting) submit(); }}
                  className="space-y-2.5"
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

                  {/* Contact preference */}
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1.5">How would you prefer we reach out?</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: "phone", label: "Call", icon: Phone },
                        { id: "email", label: "Email", icon: Mail },
                        { id: "either", label: "Either", icon: MessageSquare },
                      ].map(o => {
                        const Icon = o.icon;
                        const active = selections.contactPref === o.id;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setSelections(p => ({ ...p, contactPref: o.id as any }))}
                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                              active
                                ? "border-primary bg-primary/5 text-foreground"
                                : "border-border bg-card text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" /> {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground">Phone or email — at least one required. We never share your info.</p>

                  <div className="p-3 rounded-xl bg-gradient-sage border border-primary/10 !mt-3">
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
                    className="w-full inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed !mt-3 shadow-soft"
                  >
                    {submitting ? "Submitting..." : "Submit Request"}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Sticky footer */}
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
