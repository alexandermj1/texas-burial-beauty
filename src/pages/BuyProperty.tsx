import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, Phone, CheckCircle, CreditCard, List, Navigation, Mail, MessageSquare, Loader2, Search } from "lucide-react";
import teamWalkthroughAsset from "@/assets/team/tcb-plot-walkthrough-v2.jpg.asset.json";
import singlePlotImg from "@/assets/property-types/single-plot.png";
import nicheImg from "@/assets/property-types/cremation-niche.png";
import cryptImg from "@/assets/property-types/mausoleum.png";
import familyEstateImg from "@/assets/property-types/family-estate.png";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { useCemeteryRegistry, REGISTRY_REGIONS, type RegistryCemetery } from "@/hooks/useCemeteryRegistry";
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
const regionCenters: Record<string, { lat: number; lng: number }> = {
  "Dallas–Fort Worth": { lat: 32.7767, lng: -96.7970 },
  "Greater Houston":   { lat: 29.7604, lng: -95.3698 },
  "Austin":            { lat: 30.2672, lng: -97.7431 },
  "San Antonio":       { lat: 29.4241, lng: -98.4936 },
  "El Paso & West Texas": { lat: 31.7619, lng: -106.4850 },
  "Central Texas":     { lat: 31.5493, lng: -97.1467 },
  "East Texas":        { lat: 32.3513, lng: -95.3011 },
  "South Texas":       { lat: 27.8006, lng: -97.3964 },
  "West & North Texas":{ lat: 33.5779, lng: -101.8552 },
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [locating, setLocating] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selections, setSelections] = useState({
    propertyType: "",
    timeline: "",
    budget: "",
    quantity: "1",
    region: "",
    cemetery: "",
    name: "",
    phone: "",
    email: "",
    contactPref: "either" as "phone" | "email" | "either",
    note: "",
  });

  // The registry — identical to what the seller form and the admin panel show.
  const { cemeteries, loading: loadingCemeteries } = useCemeteryRegistry();
  const [cemeteryQuery, setCemeteryQuery] = useState("");

  // Pre-fill from query params (e.g. ?cemetery=...&region=...) — set on first load.
  useEffect(() => {
    const cemParam = searchParams.get("cemetery") || "";
    const regionParam = searchParams.get("region") || "";
    if (cemParam || regionParam) {
      // If passed a cemetery, look up its region from the registry so both align.
      const match = cemParam ? cemeteries.find(c => c.name.toLowerCase() === cemParam.toLowerCase()) : null;
      setSelections(prev => ({
        ...prev,
        cemetery: cemParam || prev.cemetery,
        region: match?.region || regionParam || prev.region,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cemeteries.length]);

  const update = (key: string, value: string) => setSelections(prev => ({ ...prev, [key]: value }));

  const pick = (key: string, value: string, nextStep?: Step) => {
    update(key, value);
    if (nextStep) setTimeout(() => setStep(nextStep), 180);
  };

  const back = () => { if (step > 1) setStep((step - 1) as Step); };

  // Region counts
  const regionCounts = useMemo(() => {
    const m: Record<string, number> = {};
    cemeteries.forEach(c => { m[c.region] = (m[c.region] || 0) + 1; });
    return m;
  }, [cemeteries]);

  // Ordered regions: by distance if we have coords, else Houston/Dallas first then by cemetery count
  const orderedRegions = useMemo(() => {
    const list = REGISTRY_REGIONS.filter(r => (regionCounts[r] || 0) > 0);
    if (userCoords) {
      return [...list].sort((a, b) => {
        const ca = regionCenters[a], cb = regionCenters[b];
        if (!ca || !cb) return 0;
        return haversine(userCoords.lat, userCoords.lng, ca.lat, ca.lng) -
               haversine(userCoords.lat, userCoords.lng, cb.lat, cb.lng);
      });
    }
    // Most Texas buyers come from Houston or Dallas — surface those first.
    const priority: Record<string, number> = { "Greater Houston": 0, "Dallas–Fort Worth": 1 };
    return [...list].sort((a, b) => {
      const pa = priority[a] ?? 99;
      const pb = priority[b] ?? 99;
      if (pa !== pb) return pa - pb;
      return (regionCounts[b] || 0) - (regionCounts[a] || 0);
    });
  }, [userCoords, regionCounts]);

  // Cemeteries in the chosen region, narrowed by the search box, nearest first
  // when we know where the buyer is.
  const filteredCemeteries: RegistryCemetery[] = useMemo(() => {
    if (!selections.region) return [];
    const q = cemeteryQuery.trim().toLowerCase();
    let inRegion = cemeteries.filter(c => c.region === selections.region);
    if (q) {
      inRegion = inRegion.filter(c => `${c.name} ${c.city}`.toLowerCase().includes(q));
    }
    if (userCoords) {
      return [...inRegion].sort((a, b) =>
        haversine(userCoords.lat, userCoords.lng, a.lat ?? 0, a.lng ?? 0) -
        haversine(userCoords.lat, userCoords.lng, b.lat ?? 0, b.lng ?? 0)
      );
    }
    return inRegion;
  }, [cemeteries, selections.region, userCoords, cemeteryQuery]);

  // Grouped by city so a long region reads as a short list of places.
  const cemeteriesByCity = useMemo(() => {
    const m = new Map<string, RegistryCemetery[]>();
    for (const c of filteredCemeteries) {
      const key = c.city || "Elsewhere in Texas";
      m.set(key, [...(m.get(key) ?? []), c]);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [filteredCemeteries]);


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
    3: "Choose a comfortable range — we’ll find options to match.",
    4: "Find your area or use your location.",
    5: "Choose how you'd prefer we contact you.",
  };

  const canSubmit = selections.name.trim() && (selections.phone.trim() || selections.email.trim());

  const submit = async () => {
    setSubmitting(true);
    const typeLabel = propertyTypes.find(t => t.id === selections.propertyType)?.label || selections.propertyType;
    const timelineLabel = timelines.find(t => t.id === selections.timeline)?.label || selections.timeline;
    const budgetLabel = budgets.find(b => b.id === selections.budget)?.label || selections.budget;
    const prefLabel = selections.contactPref === "phone" ? "Call" : selections.contactPref === "email" ? "Email" : "Either";
    const details = [
      `Property type: ${typeLabel}`,
      `Timeline: ${timelineLabel}`,
      `Budget: ${budgetLabel}`,
      `Plots wanted: ${selections.quantity || "1"}`,
      `Region: ${selections.region || "—"}`,
      selections.cemetery ? `Cemetery: ${selections.cemetery}` : null,
      `Preferred contact: ${prefLabel}`,
      selections.note.trim() ? `\nMessage from buyer:\n${selections.note.trim()}` : null,
    ].filter(Boolean).join("\n");


    const submissionId = crypto.randomUUID();
    const { error } = await supabase.from("contact_submissions" as any).insert({
      id: submissionId,
      source: "buy_property_wizard",
      inquiry_channel: "texas_buy_wizard",
      state: "TX",
      name: selections.name.trim(),
      email: selections.email.trim() || null,
      phone: selections.phone.trim() || null,
      property_type: typeLabel,
      timeline: timelineLabel,
      budget: budgetLabel,
      region: selections.region,
      cemetery: selections.cemetery || null,
      details,
      message: details,
      created_at: new Date().toISOString(),
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Something went wrong", description: "Please call or email us directly.", variant: "destructive" });
      return;
    }
    const { error: emailError } = await supabase.functions.invoke("inquiry-notification-email", { body: { submission_id: submissionId } });
    if (emailError) console.warn("inquiry email failed", emailError);
    toast({ title: "Request submitted!", description: "We'll be in touch within 24 hours. You can also call (214) 230-4740." });
    navigate("/thank-you");
  };

  const cardBase = "text-left rounded-xl border-2 transition-all duration-200 w-full";
  const cardIdle = "border-border bg-card hover:border-primary/40";
  const cardActive = "border-primary bg-primary/5 shadow-soft";

  return (
    <div className="min-h-svh bg-background flex flex-col">
      <Seo
        title="Buy a Cemetery Plot in Texas — Burial Plots 30–50% Below Cemetery Prices"
        description="Looking for burial plots for sale in Texas? Our free buyer concierge matches you with privately resold cemetery plots, niches and crypts in Dallas, Houston, Austin & beyond — typically 30–50% below cemetery prices."
        path="/buy"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            serviceType: "Cemetery Plot Buyer Concierge",
            provider: { "@id": "https://texascemeterybrokers.com/#organization" },
            areaServed: "Texas, United States",
            description: "Guided concierge that matches Texas buyers with privately resold cemetery plots, niches, mausoleums and crypts at below-market prices.",
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://texascemeterybrokers.com/" },
              { "@type": "ListItem", position: 2, name: "Buy Property", item: "https://texascemeterybrokers.com/buy" },
            ],
          },
        ]}
      />
      <Navbar forceScrolled />

      {/* Editorial masthead, aligned with every buying step below. */}
      <header className="pt-24 sm:pt-24 pb-4 sm:pb-6 bg-background">
        <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between gap-4 border-y border-foreground/20 py-3">
            <p className="text-xs text-accent font-medium uppercase">Texas Cemetery Brokers · Buying</p>
            <Button asChild variant="link" className="h-auto p-0 text-xs text-foreground shrink-0">
              <Link to="/cemeteries"><List className="w-3 h-3" /> Browse cemeteries</Link>
            </Button>
          </div>
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-12 items-end py-8 sm:py-10 lg:py-12">
            <h1 className="lg:col-span-8 font-display text-foreground text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-none">
              Buy a cemetery plot.<br />
              <span className="italic text-primary">With peace of mind.</span>
            </h1>
            <div className="lg:col-span-4 lg:border-l border-foreground/20 lg:pl-8">
              <p className="font-display text-xl sm:text-2xl text-foreground leading-snug">The right place. A considered choice.</p>
              <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                The same cemeteries. A different way to buy. Privately resold plots, niches and crypts offer meaningful savings over buying directly from the cemetery — with personal guidance from first choice to final transfer.
              </p>
              <p className="mt-4 text-xs text-primary font-medium">Personal guidance · No concierge fee</p>
            </div>
          </div>
          <div className="border-t border-foreground/20 pt-6 sm:pt-8">
            <p className="text-xs text-accent font-medium mb-3">Find your property / {String(step).padStart(2, "0")} of 05</p>
            <h2 className="font-display text-3xl sm:text-4xl text-foreground leading-tight">
              {titles[step]}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">{subtitles[step]}</p>
          </div>

          <div className="flex items-center gap-2 mt-5">
            {steps.map(s => (
              <Button
                variant="ghost"
                key={s.num}
                onClick={() => { if (s.num < step) setStep(s.num as Step); }}
                disabled={s.num > step}
                className="group h-auto min-w-0 flex-1 flex flex-col items-start gap-1.5 p-0 rounded-none hover:bg-transparent"
                aria-label={`Step ${s.num}: ${s.label}`}
              >
                <span className={`h-[3px] w-full rounded-full transition-all ${s.num <= step ? "bg-primary" : "bg-muted"}`} />
                <span className={`text-[10px] tracking-wide ${s.num === step ? "text-foreground font-medium" : "text-muted-foreground"} hidden sm:inline`}>
                  {s.num}. {s.label}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-10 py-4 sm:py-6">
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
                className="w-full"
              >
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3 mb-4">
                  <CreditCard className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-foreground leading-snug">
                    <strong>Planning ahead?</strong> Pre-need buyers save <strong>around 40% off cemetery retail</strong> and can spread the cost over <strong>24 months at 0% interest</strong>.
                  </p>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {timelines.map(t => (
                    <button
                      key={t.id}
                      onClick={() => pick("timeline", t.id, 3)}
                      className={`${cardBase} p-4 sm:p-5 ${selections.timeline === t.id ? cardActive : cardIdle}`}
                    >
                      <h3 className="font-display text-base sm:text-lg text-foreground">{t.label}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3 — Budget */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                className="w-full"
              >
                {/* How many plots — stylised quantity selector */}
                <div className="mb-4 rounded-2xl border border-primary/15 bg-gradient-sage p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Quantity</p>
                      <h3 className="font-display text-lg sm:text-xl text-foreground leading-tight mt-0.5">How many plots do you need?</h3>
                      <p className="text-xs text-muted-foreground mt-1">Families often buy side-by-side spaces — we can hold adjacent plots together.</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {["1", "2", "3", "4", "5+"].map(q => {
                        const active = selections.quantity === q;
                        return (
                          <button
                            key={q}
                            type="button"
                            onClick={() => update("quantity", q)}
                            aria-pressed={active}
                            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl font-display text-base transition-all border ${
                              active
                                ? "bg-primary text-primary-foreground border-primary shadow-soft scale-105"
                                : "bg-background/70 text-foreground border-border hover:border-primary/40 hover:bg-background"
                            }`}
                          >
                            {q}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {selections.quantity === "5+" && (
                    <input
                      type="number"
                      min={5}
                      placeholder="How many exactly?"
                      onChange={(e) => update("quantity", e.target.value ? `${e.target.value}` : "5+")}
                      className="mt-3 w-full sm:w-56 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  )}
                </div>

                <p className="mb-5 text-sm text-muted-foreground leading-relaxed">
                  Private resale offers meaningful savings over buying directly from the cemetery. We’ll help you compare the available options.
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {budgets.map(b => (
                    <button
                      key={b.id}
                      onClick={() => pick("budget", b.id, 4)}
                      className={`${cardBase} p-4 flex items-center justify-between ${selections.budget === b.id ? cardActive : cardIdle}`}
                    >
                      <div>
                        <h3 className="font-display text-base text-foreground">{b.label}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{b.range}</p>
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
                {!selections.region && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                        {userCoords ? "Closest regions to you" : "Choose a region"}
                      </p>
                      <button
                        onClick={findNearest}
                        disabled={locating}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all shadow-soft disabled:opacity-60 self-start sm:self-auto"
                      >
                        {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
                        {locating ? "Locating…" : userCoords ? "Re-sort by location" : "Find nearest to me"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                      {orderedRegions.map(r => {
                        const count = regionCounts[r] || 0;
                        return (
                          <button
                            key={r}
                            onClick={() => update("region", r)}
                            className={`${cardBase} p-3 sm:p-4 text-left ${cardIdle}`}
                          >
                            <h3 className="font-display text-[13px] sm:text-sm text-foreground leading-snug">{r}</h3>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">{count} cemeteries</p>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {selections.region && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={cemeteryQuery}
                          onChange={(e) => setCemeteryQuery(e.target.value)}
                          placeholder={`Search ${selections.region} cemeteries or towns…`}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
                        />
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="uppercase tracking-wider">{filteredCemeteries.length} options</span>
                        <button
                          onClick={() => { update("region", ""); update("cemetery", ""); setCemeteryQuery(""); }}
                          className="text-primary hover:underline"
                        >
                          Change region
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => pick("cemetery", "", 5)}
                      className={`${cardBase} w-full p-4 mb-4 text-left flex items-center justify-between gap-3 ${selections.cemetery === "" ? cardActive : cardIdle}`}
                    >
                      <span>
                        <span className="block font-display text-sm text-foreground">Any cemetery in {selections.region}</span>
                        <span className="block text-[11px] text-muted-foreground">We'll show you everything available nearby</span>
                      </span>
                      <span className="text-[11px] text-primary shrink-0">Continue →</span>
                    </button>

                    <div className="max-h-[52vh] overflow-y-auto pr-1 space-y-5">
                      {loadingCemeteries && (
                        <p className="text-xs text-muted-foreground">Loading cemeteries…</p>
                      )}
                      {!loadingCemeteries && cemeteriesByCity.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          No match — try a different spelling, or choose “Any cemetery” above and we'll find it for you.
                        </p>
                      )}
                      {cemeteriesByCity.map(([city, list]) => (
                        <div key={city}>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2 flex items-center gap-1.5">
                            <MapPin className="w-3 h-3" /> {city} <span className="opacity-60">· {list.length}</span>
                          </p>
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {list.map(c => (
                              <button
                                key={`${c.id ?? c.name}`}
                                onClick={() => pick("cemetery", c.name, 5)}
                                className={`${cardBase} p-3 text-left ${selections.cemetery === c.name ? cardActive : cardIdle}`}
                              >
                                <h3 className="font-display text-sm text-foreground leading-snug">{c.name}</h3>
                                {c.address && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{c.address}</p>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

              </motion.div>
            )}

            {/* STEP 5 — Contact */}
            {step === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                className="grid lg:grid-cols-[1fr_1.2fr] gap-6 lg:gap-10 items-start"
              >
                {/* Left column — summary + call */}
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-gradient-sage border border-primary/15">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Your selections</p>
                    <div className="space-y-2.5 text-sm">
                      <div className="flex justify-between gap-3"><span className="text-muted-foreground">Type</span><span className="text-foreground font-medium text-right">{propertyTypes.find(t => t.id === selections.propertyType)?.label || "—"}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-muted-foreground">Timeline</span><span className="text-foreground font-medium text-right">{timelines.find(t => t.id === selections.timeline)?.label || "—"}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-muted-foreground">Budget</span><span className="text-foreground font-medium text-right">{budgets.find(b => b.id === selections.budget)?.label || "—"}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-muted-foreground">Plots</span><span className="text-foreground font-medium text-right">{selections.quantity || "1"}</span></div>
                      <div className="flex justify-between gap-3"><span className="text-muted-foreground">Location</span><span className="text-foreground font-medium text-right truncate max-w-[60%]">{selections.cemetery || selections.region || "—"}</span></div>
                    </div>
                  </div>
                  <a
                    href="tel:+12142304740"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-90 transition-all shadow-soft"
                  >
                    <Phone className="w-4 h-4" />
                    Or call us now — (214) 230-4740
                  </a>
                  <p className="text-[11px] text-muted-foreground text-center">Partnered with Bayer Cemetery Brokers (CA licensed) · We respond within 24 hours</p>
                </div>

                {/* Right column — form */}
                <form
                  onSubmit={(e) => { e.preventDefault(); if (canSubmit && !submitting) submit(); }}
                  className="space-y-3"
                >
                  <input
                    autoFocus
                    type="text"
                    value={selections.name}
                    onChange={e => update("name", e.target.value)}
                    placeholder="Full name *"
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                  />
                  <div className="grid sm:grid-cols-2 gap-3">
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
                  </div>

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
                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
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

                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1.5">Anything you'd like us to know? <span className="text-muted-foreground/70">(optional)</span></p>
                    <textarea
                      value={selections.note}
                      onChange={e => update("note", e.target.value)}
                      placeholder="Share any details, questions, or specific requests…"
                      rows={3}
                      maxLength={1000}
                      className="w-full px-4 py-3 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 resize-none"
                    />
                  </div>

                  <p className="text-[11px] text-muted-foreground">Phone or email — at least one required. We never share your info.</p>


                  <button
                    type="submit"
                    disabled={!canSubmit || submitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-soft"
                  >
                    {submitting ? "Submitting..." : "Submit Request"}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Buying editorial — shares the masthead's width and typographic hierarchy. */}
      <section className="border-t border-foreground/20 bg-background">
        <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-10 py-12 sm:py-16">
          <p className="text-xs text-accent font-medium uppercase border-b border-foreground/20 pb-3">The buying perspective / Texas</p>
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-12 items-end py-8 sm:py-10">
            <h2 className="lg:col-span-8 font-display text-4xl sm:text-5xl lg:text-6xl text-foreground leading-none">
              A place that feels right.<br />
              <span className="italic text-primary">A price that makes sense.</span>
            </h2>
            <p className="lg:col-span-4 lg:border-l border-foreground/20 lg:pl-8 text-base text-muted-foreground leading-relaxed">
              Burial plots, cremation niches, crypts and family estates across Dallas–Fort Worth, Houston, Austin, San Antonio and beyond. Considered choices, without navigating the resale process alone.
            </p>
          </div>
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 border-t border-foreground/20 pt-8 sm:pt-10">
            <figure className="m-0 lg:col-span-5">
              <img loading="lazy" decoding="async" src={teamWalkthroughAsset.url} alt="A Texas Cemetery Brokers team member walking the cemetery grounds" className="w-full aspect-[4/3] object-cover rounded-lg" />
              <figcaption className="mt-3 text-xs text-muted-foreground leading-relaxed">Personal guidance, on the grounds and throughout the transfer.</figcaption>
            </figure>
            <div className="lg:col-span-7 divide-y divide-foreground/20">
              {[
                { title: "The cemetery you want. Less to pay.", text: "Private resale means buying from an existing owner, rather than the cemetery’s own inventory. A comparable space can cost meaningfully less — we help you compare the location, property and full purchase costs before you decide." },
                { title: "See the place. Make it personal.", text: "Tell us your budget, preferred cemetery and when you need a space. We’ll put together a relevant shortlist, usually within 24 hours, and can meet you at the cemetery to walk the sections before you commit." },
                { title: "A clear path from choice to ownership.", text: "We coordinate the paperwork and transfer with the cemetery. On selected pre-need properties, financing can spread the cost over up to two years at 0% interest. Our buyer concierge is free, with no obligation to proceed." },
              ].map((item, index) => (
                <article key={item.title} className={index === 0 ? "pb-6 sm:pb-8" : "py-6 sm:py-8"}>
                  <div className="flex gap-4 sm:gap-6 items-baseline">
                    <span className="font-display italic text-xl text-primary shrink-0">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="font-display text-2xl sm:text-3xl text-foreground leading-tight">{item.title}</h3>
                      <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">{item.text}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-12 sm:mt-16 grid lg:grid-cols-12 gap-6 lg:gap-12 border-t border-foreground/20 pt-8">
            <div className="lg:col-span-5">
              <p className="text-xs text-accent font-medium uppercase mb-3">Before you decide</p>
              <h2 className="font-display text-3xl sm:text-4xl text-foreground leading-tight">A few things<br /><span className="italic text-primary">worth knowing.</span></h2>
            </div>
            <div className="lg:col-span-7 divide-y divide-border border-b border-border">
            {[
              {
                q: "How much do burial plots cost in Texas?",
                a: "It varies widely by cemetery and section. Direct-from-cemetery single spaces in major Texas metros generally run from around $2,000 to well over $10,000, and premium mausoleum crypts considerably more. Private resales can offer meaningful savings; the exact difference depends on the property and location.",
              },
              {
                q: "Is it legal to buy a cemetery plot from a private seller?",
                a: "Yes. Texas law allows plot owners to resell their interment rights. The transfer is recorded with the cemetery via a deed or assignment — we handle the paperwork and coordinate with the cemetery so the transfer is clean and documented.",
              },
              {
                q: "Can I buy ahead of time (pre-need)?",
                a: "Absolutely — pre-need buyers usually get the best selection and pricing, and on selected properties we can arrange 0% interest financing for up to two years. At-need buyers are prioritized and we can often present options the same day.",
              },
              {
                q: "Which cemeteries do you serve?",
                a: "We cover cemeteries across Texas, with the most activity around Dallas–Fort Worth and Houston — including Restland Memorial Park, Sparkman/Hillcrest, Bluebonnet Hills, Forest Park and many more. Browse the directory or just tell us the cemetery you have in mind.",
              },
            ].map((f, i) => (
              <details key={i} className="group">
                <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer list-none text-sm sm:text-[15px] font-medium text-foreground hover:text-primary transition-colors [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45 text-lg leading-none">+</span>
                </summary>
                <p className="pb-4 text-sm text-muted-foreground leading-relaxed max-w-3xl">{f.a}</p>
              </details>
            ))}
            </div>
          </div>

          <div className="mt-8 border-t border-foreground/20 pt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <Link to="/cemetery-plots-for-sale-texas" className="text-primary font-medium hover:underline">How to buy a cemetery plot →</Link>
            <Link to="/cemetery-plot-cost-texas" className="text-primary font-medium hover:underline">Texas cemetery plot costs →</Link>
            <Link to="/cemeteries" className="text-primary font-medium hover:underline">Browse the cemetery directory →</Link>
          </div>
        </div>
      </section>

      {/* Sticky footer */}
      <footer className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur z-20">
        <div className="w-full max-w-screen-2xl mx-auto px-6 lg:px-10 py-3 flex items-center justify-between gap-3">
          <button
            onClick={back}
            disabled={step === 1}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card text-sm text-foreground font-medium hover:bg-muted hover:border-primary/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="hidden sm:inline text-[11px] text-muted-foreground">Private · No spam · Partnered with Bayer Cemetery Brokers (CA licensed)</span>
          <a
            href="tel:+12142304740"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-primary font-medium hover:underline"
          >
            <Phone className="w-3.5 h-3.5" />
            (214) 230-4740
          </a>
        </div>
      </footer>
    </div>
  );
};

export default BuyProperty;
