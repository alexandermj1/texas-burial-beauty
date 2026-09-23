import { useState, useMemo, useEffect, useRef, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Search,
  ArrowRight,
  Phone,
  X,
  ShieldCheck,
  Check,
  Tag,
  ChevronRight,
  Navigation,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";

import { bayCemeteries, regions } from "@/data/cemeteries";
import { slugify } from "@/lib/cemeterySlug";
import { ALL_TEXAS_REGIONS } from "@/data/metroRegions";

const MetroCemeteryMap = lazy(() => import("@/components/MetroCemeteryMap"));

import imgHillside from "@/assets/hero/cemetery-hillside.jpg";
import heroBotanicalLeft from "@/assets/flowers/hero-botanical-left.png";
import heroBotanicalRight from "@/assets/flowers/hero-botanical-right.png";
import searchSprig from "@/assets/flowers/search-sprig.png";

// Memorial park photography (CDN-hosted)
import restlandHero from "@/assets/restland/restland-hero-lawn.jpg.asset.json";
import restlandLawn from "@/assets/restland/restland-lawn-monuments.jpg.asset.json";
import resthavenAvenue from "@/assets/resthaven/resthaven-avenue.jpg.asset.json";
import resthavenOakPath from "@/assets/resthaven/resthaven-oak-path.jpg.asset.json";
// Photography from the individual cemetery pages, used for the featured cards
// Local copies of the cemeteries' own photography (the .asset.json CDN
// pointers don't resolve in every environment, so these are bundled).
import sparkmanHero from "@/assets/featured/sparkman-fountain-garden.jpg";
import bluebonnetHero from "@/assets/featured/bluebonnet-hero-lake.jpg";
import restlandFeatured from "@/assets/featured/restland-hero-lawn.jpg";
import { RESTHAVEN_HERO } from "@/data/resthavenPhotos";
import { LAUREL_LAND_HERO } from "@/data/laurelLandPhotos";
import park04 from "@/assets/parks/local/park-04.jpg";
import park12 from "@/assets/parks/local/park-12.jpg";
import park23 from "@/assets/parks/local/park-23.jpg";
import park30 from "@/assets/parks/local/park-30.jpg";
import park36 from "@/assets/parks/local/park-36.jpg";
import park39 from "@/assets/parks/local/park-39.jpg";
import park47 from "@/assets/parks/local/park-47.jpg";
import park50 from "@/assets/parks/local/park-50.jpg";
import park57 from "@/assets/parks/local/park-57.jpg";

const PHOTO_POOL: string[] = [
  park04,
  park12,
  park23,
  park30,
  park36,
  park39,
  park47,
  park50,
  park57,
  restlandHero.url,
  resthavenAvenue.url,
  restlandLawn.url,
  resthavenOakPath.url,
];

// Photography is chosen by REGION (a landscape that represents the area),
// not per individual cemetery — same region shares the same imagery family.
const REGION_PHOTOS: Record<string, string[]> = {
  "Dallas–Fort Worth": [park30, park04],
  "Greater Houston": [park47, park12],
  "Austin": [park23, park36],
  "Central Texas": [park39, park50],
  "San Antonio": [park57, park23],
  "South Texas": [park12, park47],
  "East Texas": [park36, park39],
  "El Paso & West Texas": [park50, park57],
  "West Texas": [park50, park30],
  "North Texas": [park04, park39],
};

// Featured areas shown as large photo cards above the cemetery lists.
const AREA_FEATURES: Array<{ region: string; cities: string }> = [
  { region: "Dallas–Fort Worth", cities: "Dallas · Fort Worth · Plano · Arlington · Denton" },
  { region: "Greater Houston", cities: "Houston · Katy · Sugar Land · The Woodlands" },
  { region: "Austin", cities: "Austin · Round Rock · San Marcos · Georgetown" },
  { region: "San Antonio", cities: "San Antonio · New Braunfels · Boerne" },
  { region: "East Texas", cities: "Tyler · Longview · Lufkin · Texarkana" },
  { region: "El Paso & West Texas", cities: "El Paso · Midland · Odessa · Lubbock" },
];


const photoFor = (region: string, hash: number) => {
  const set = REGION_PHOTOS[region];
  if (set && set.length) return set[hash % set.length];
  return PHOTO_POOL[hash % PHOTO_POOL.length];
};

/* ------------------------------------------------------------------ */
/* Most-in-demand cemeteries per region — these appear as large photo  */
/* cards above each region's list. Everything else is a compact,       */
/* photo-free card so the same park imagery never repeats down the page */
/* ------------------------------------------------------------------ */
const FEATURED_BY_REGION: Record<string, string[]> = {
  "Dallas–Fort Worth": [
    "Sparkman-Hillcrest Memorial Park",
    "Restland Memorial Park",
    "Bluebonnet Hills Memorial Park",
  ],
  "Greater Houston": ["Memorial Oaks Cemetery", "Forest Park Lawndale", "Glenwood Cemetery"],
  Austin: ["Austin Memorial Park", "Cook-Walden Capital Parks Funeral Home & Cemetery", "Forest Oaks Memorial Park"],
  "San Antonio": ["Sunset Memorial Park", "Mission Burial Park South", "Roselawn Memorial Park"],
  "East Texas": ["Cathedral in the Pines Memorial Gardens", "Tyler Memorial Park", "Forest Lawn Beaumont"],
  "El Paso & West Texas": ["Evergreen Cemetery", "Restlawn Cemetery", "Resthaven Memorial Park"],
  "South Texas": ["Seaside Memorial Park", "Rose Hill Burial Park", "Valley Memorial Gardens"],
  "Central Texas": ["Waco Memorial Park", "Greenleaf Cemetery", "Killeen Memorial Park"],
  "West & North Texas": ["Resthaven Funeral Home & Memorial Park", "Llano Cemetery", "Elmwood Memorial Park"],
};

// Original photography we hold for specific cemeteries (same shots as their own pages)
const CEMETERY_PHOTOS: Record<string, string> = {
  "Sparkman-Hillcrest Memorial Park": sparkmanHero,
  "Restland Memorial Park": restlandFeatured,
  "Bluebonnet Hills Memorial Park": bluebonnetHero,
  "Rest Haven Memorial Park": RESTHAVEN_HERO.src,
  "Laurel Land Memorial Park Fort Worth": LAUREL_LAND_HERO.src,
};

const FEATURED_LABELS = ["High interest", "Sought after", "Most requested", "Frequently traded"];

const hashName = (s: string) => {
  let h = 0;
  for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) >>> 0;
  return h;
};

// Botanical leaf accents (scattered decoratively across the page background)
const LEAF_MODULES = import.meta.glob("@/assets/leaves/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;
const LEAVES = Object.values(LEAF_MODULES);
const LEAF_SCATTER: Array<{ top: string; left?: string; right?: string; size: number; rotate: number; opacity: number; idx: number }> = [
  { top: "2%", right: "1%", size: 130, rotate: 14, opacity: 0.5, idx: 0 },
  { top: "6%", left: "2%", size: 110, rotate: -8, opacity: 0.45, idx: 5 },
  { top: "14%", left: "3%", size: 95, rotate: -25, opacity: 0.4, idx: 2 },
  { top: "18%", right: "3%", size: 110, rotate: 10, opacity: 0.42, idx: 7 },
  { top: "28%", right: "2%", size: 125, rotate: -30, opacity: 0.5, idx: 16 },
  { top: "34%", left: "2%", size: 140, rotate: -8, opacity: 0.5, idx: 9 },
  { top: "44%", right: "3%", size: 150, rotate: 12, opacity: 0.5, idx: 21 },
  { top: "52%", left: "2%", size: 130, rotate: -20, opacity: 0.5, idx: 17 },
  { top: "60%", right: "2%", size: 120, rotate: 20, opacity: 0.45, idx: 12 },
  { top: "68%", left: "3%", size: 130, rotate: 0, opacity: 0.5, idx: 4 },
  { top: "76%", right: "2%", size: 180, rotate: 0, opacity: 0.55, idx: 15 },
  { top: "84%", left: "3%", size: 115, rotate: -10, opacity: 0.45, idx: 19 },
  { top: "90%", right: "3%", size: 130, rotate: 8, opacity: 0.5, idx: 20 },
];

type Cem = (typeof bayCemeteries)[number];

type Step = "where" | "cemetery" | null;

/* ------------------------------------------------------------------ */
/* Search — Airbnb-style segmented pill with dropdown panels           */
/* ------------------------------------------------------------------ */

function HeroSearch({
  variant = "hero",
  region,
  setRegion,
  query,
  setQuery,
  cemeteryNames,
  onSubmit,
}: {
  variant?: "hero" | "compact";
  region: string;
  setRegion: (r: string) => void;
  query: string;
  setQuery: (q: string) => void;
  cemeteryNames: string[];
  onSubmit: () => void;
}) {
  const [step, setStep] = useState<Step>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setStep(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const whereLabel = region === "All" ? "All of Texas" : region;
  const cemeteryLabel = query.trim() ? query : "Any cemetery";

  const submit = () => {
    setStep(null);
    onSubmit();
  };

  if (variant === "compact") {
    return (
      <div ref={ref} className="relative z-40 w-full max-w-2xl">
        <div className="flex items-center bg-background border border-border rounded-full shadow-[0_10px_28px_-16px_hsl(var(--foreground)/0.4)] h-[52px] pl-5 pr-1.5 gap-3">
          <Search className="w-[18px] h-[18px] text-primary flex-none" strokeWidth={2.4} />
          <button
            onClick={() => setStep(step === "where" ? null : "where")}
            className="text-[15.5px] font-semibold text-foreground truncate hover:text-primary transition-colors"
          >
            {whereLabel}
          </button>
          <span className="w-px h-5 bg-border flex-none" />
          <button
            onClick={() => setStep(step === "cemetery" ? null : "cemetery")}
            className="text-[15.5px] font-semibold text-foreground truncate hover:text-primary transition-colors flex-1 text-left"
          >
            {cemeteryLabel}
          </button>
          <button
            onClick={submit}
            aria-label="Search"
            className="ml-auto w-[40px] h-[40px] rounded-full bg-primary text-primary-foreground grid place-items-center transition-opacity hover:opacity-90 flex-none"
          >
            <Search className="w-[16px] h-[16px]" strokeWidth={2.4} />
          </button>
        </div>
        {step && (
          <SearchPanel
            step={step}
            region={region}
            query={query}
            cemeteryNames={cemeteryNames}
            setRegion={setRegion}
            setQuery={setQuery}
            setStep={setStep}
          />
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative mx-auto max-w-[920px] text-left z-40">
      {/* Floral sprigs leaning in from each end of the bar (desktop only) */}
      <img
        src={searchSprig}
        alt=""
        aria-hidden
        loading="lazy"
        width={992}
        height={672}
        className="hidden lg:block absolute -left-[118px] -top-[52px] w-[150px] rotate-[168deg] pointer-events-none select-none opacity-90"
      />
      <img
        src={searchSprig}
        alt=""
        aria-hidden
        loading="lazy"
        width={992}
        height={672}
        className="hidden lg:block absolute -right-[118px] -bottom-[58px] w-[150px] rotate-[-12deg] pointer-events-none select-none opacity-90"
      />
      {/* Clean, bright search bar — cream-white so it pops off the warm hero */}
      <div className="rounded-full bg-background shadow-[0_28px_70px_-28px_hsl(var(--foreground)/0.45),0_0_0_1px_hsl(var(--border)/0.5)]">
        <div className="flex items-center rounded-full p-2.5 gap-1 bg-background/95 backdrop-blur-sm">
          <Segment
            icon={<MapPin className="w-[18px] h-[18px] text-primary" strokeWidth={2} />}
            label="Where"
            value={whereLabel}
            active={step === "where"}
            onClick={() => setStep(step === "where" ? null : "where")}
          />
          <span className="w-px h-9 bg-gradient-to-b from-transparent via-primary/25 to-transparent flex-none hidden min-[760px]:block" />
          <Segment
            icon={
              <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px] text-accent" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 20h12" />
                <path d="M9 20v-8a3 3 0 0 1 6 0v8" />
                <path d="M8 12h8" />
              </svg>
            }
            label="Cemetery"
            value={cemeteryLabel}
            active={step === "cemetery"}
            onClick={() => setStep(step === "cemetery" ? null : "cemetery")}
            hideOnSmall
          />
          <button
            onClick={submit}
            className="ml-auto flex-none flex items-center gap-2.5 rounded-full h-[56px] px-6 md:px-9 font-bold text-[15.5px] text-primary-foreground bg-gradient-to-r from-primary via-primary to-accent transition-all hover:shadow-[0_10px_26px_-8px_hsl(var(--accent)/0.55)] hover:brightness-[1.05]"
          >
            <Search className="w-[18px] h-[18px]" strokeWidth={2.6} />
            <span>Search</span>
          </button>
        </div>
      </div>

      {step && (
        <SearchPanel
          step={step}
          region={region}
          query={query}
          cemeteryNames={cemeteryNames}
          setRegion={setRegion}
          setQuery={setQuery}
          setStep={setStep}
        />
      )}
    </div>
  );
}

function Segment({
  icon,
  label,
  value,
  active,
  onClick,
  hideOnSmall,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
  hideOnSmall?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-0 flex items-center gap-3.5 text-left rounded-full px-3 py-2.5 transition-colors ${
        active ? "bg-gradient-to-r from-primary/[0.10] to-accent/[0.10]" : "hover:bg-muted/60"
      } ${hideOnSmall ? "hidden min-[760px]:flex" : ""}`}
    >
      <span className="w-[44px] h-[44px] rounded-2xl bg-gradient-to-br from-primary/[0.16] to-accent/[0.16] grid place-items-center flex-none shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.14)]">{icon}</span>
      <span className="flex flex-col min-w-0">
        <span className="text-[12px] font-bold uppercase tracking-[0.11em] text-foreground/60 leading-none">{label}</span>
        <span className="text-[17px] font-semibold text-foreground leading-tight truncate mt-1">{value}</span>
      </span>
    </button>
  );
}

function SearchPanel({
  step,
  region,
  query,
  cemeteryNames,
  setRegion,
  setQuery,
  setStep,
}: {
  step: Step;
  region: string;
  query: string;
  cemeteryNames: string[];
  setRegion: (r: string) => void;
  setQuery: (q: string) => void;
  setStep: (s: Step) => void;
}) {
  const [typed, setTyped] = useState(query);

  const matches = useMemo(() => {
    const q = typed.trim().toLowerCase();
    const list = q ? cemeteryNames.filter((n) => n.toLowerCase().includes(q)) : cemeteryNames;
    return list.slice(0, 60);
  }, [typed, cemeteryNames]);

  return (
    <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-background border border-border rounded-3xl shadow-2xl p-5 md:p-6 z-50 w-[min(92vw,680px)]">
      <div className="text-[11.5px] font-bold uppercase tracking-wider text-foreground/60 mb-4 px-1">
        {step === "where" ? "Choose a region" : "Choose a cemetery"}
      </div>

      {step === "where" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {regions.map((r) => {
            const selected = region === r;
            return (
              <button
                key={r}
                onClick={() => {
                  setRegion(r);
                  setTyped("");
                  setQuery("");
                  setStep("cemetery");
                }}
                className={`flex items-center justify-between text-left px-4 py-3.5 rounded-full text-[13.5px] font-semibold transition-all hover:-translate-y-0.5 ${
                  selected ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted hover:bg-accent/40 text-foreground"
                }`}
              >
                <span className="truncate">{r === "All" ? "All of Texas" : r}</span>
                {selected && <Check className="w-4 h-4 flex-none ml-2" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2.5 bg-muted rounded-full px-4 h-11 mb-3">
            <Search className="w-4 h-4 text-muted-foreground flex-none" />
            <input
              autoFocus
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
                setQuery(e.target.value);
              }}
              placeholder="Search cemeteries, cities or regions"
              className="flex-1 bg-transparent text-[14.5px] font-medium text-foreground placeholder:text-foreground/45 focus:outline-none"
            />
            {typed && (
              <button
                onClick={() => {
                  setTyped("");
                  setQuery("");
                }}
                aria-label="Clear"
                className="w-6 h-6 rounded-full hover:bg-background grid place-items-center text-muted-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-[320px] overflow-y-auto -mx-1 px-1">
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => {
                  setTyped("");
                  setQuery("");
                  setStep(null);
                }}
                className="flex items-center gap-2.5 text-left px-4 py-3 rounded-xl text-[14px] font-semibold bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
              >
                <Navigation className="w-4 h-4 flex-none" /> Any cemetery
              </button>
              {matches.map((name) => {
                const selected = query === name;
                return (
                  <button
                    key={name}
                    onClick={() => {
                      setTyped(name);
                      setQuery(name);
                      setStep(null);
                    }}
                    className={`flex items-center justify-between text-left px-4 py-3 rounded-xl text-[14px] font-semibold transition-colors ${
                      selected ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent/40 text-foreground"
                    }`}
                  >
                    <span className="truncate">{name}</span>
                    {selected && <Check className="w-4 h-4 flex-none ml-2" />}
                  </button>
                );
              })}
              {matches.length === 0 && (
                <p className="px-4 py-6 text-center text-[13.5px] text-foreground/60">No cemeteries match that name.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cemetery card — serif-led botanical cards. The name is the hero;    */
/* photos appear only on rare anchor cards.                            */
/* ------------------------------------------------------------------ */

// Split a cemetery name into a plain first line + italic remainder.
const splitName = (name: string): [string, string] => {
  const words = name.split(" ");
  if (words.length < 2) return [name, ""];
  const cut = Math.max(1, Math.ceil(words.length / 2));
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
};

/* Featured card — photo with a floating cream plate (used sparingly, at the
   top of each region for the cemeteries we see the most interest in). */
const FeaturedCemeteryCard = ({ c, index }: { c: Cem; index: number }) => {
  const h = hashName(c.name);
  const slug = slugify(c.name);
  const [first, rest] = splitName(c.name);
  // Prefer the cemetery's own photography; otherwise pick a distinct park photo
  // so the featured row of a region never shows the same shot twice.
  const regionSet = REGION_PHOTOS[c.region] ?? [];
  const fallbackPool = [...regionSet, ...PHOTO_POOL.filter((p) => !regionSet.includes(p))];
  const photo =
    CEMETERY_PHOTOS[c.name] ?? fallbackPool[(index + (hashName(c.region) % fallbackPool.length)) % fallbackPool.length];
  const label = FEATURED_LABELS[index % FEATURED_LABELS.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.2) }}
    >
      <Link
        to={`/cemeteries/${slug}`}
        className="group relative block h-[300px] sm:h-[340px] rounded-2xl overflow-hidden border border-border shadow-[0_18px_40px_-24px_hsl(var(--foreground)/0.45)]"
      >
        <img
          src={photo}
          alt={`${c.name}, ${c.city}, Texas`}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover brightness-[1.14] saturate-[1.06] group-hover:scale-[1.04] transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/18 via-transparent to-transparent" />

        <div className="absolute left-4 right-4 bottom-4 sm:left-5 sm:right-5 sm:bottom-5 rounded-xl bg-background/95 backdrop-blur-sm px-5 py-4 shadow-[0_10px_28px_-16px_hsl(var(--foreground)/0.5)]">
          <p className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.18em] text-accent font-semibold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden />
            {label}
          </p>
          <h3 className="font-display text-xl sm:text-2xl leading-tight text-foreground">
            {first}
            {rest && (
              <>
                {" "}
                <span className="italic font-medium text-foreground/80">{rest}</span>
              </>
            )}
          </h3>
          <div className="h-px bg-border my-3" aria-hidden />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-foreground/65 truncate">
              {c.city}, TX · {c.region}
            </span>
            <span className="text-[13px] font-semibold text-primary whitespace-nowrap group-hover:underline underline-offset-4">
              Buy or sell
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

/* Compact card — no photography, the name leads. */
const CemeteryCard = ({ c, index }: { c: Cem; index: number }) => {
  const slug = slugify(c.name);
  const [first, rest] = splitName(c.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.015, 0.15) }}
    >
      <Link
        to={`/cemeteries/${slug}`}
        className="group relative flex flex-col justify-between h-full min-h-[134px] rounded-xl border border-border bg-card px-5 py-4 transition-all hover:border-primary/45 hover:shadow-[0_14px_28px_-18px_hsl(var(--primary)/0.45)]"
      >
        <div>
          <h3 className="font-display text-[1.15rem] sm:text-[1.25rem] leading-snug text-foreground">
            {first}
            {rest && (
              <>
                {" "}
                <span className="italic font-medium text-foreground/70">{rest}</span>
              </>
            )}
          </h3>
          <p className="mt-1.5 text-[12.5px] text-foreground/60">{c.city}, TX</p>
        </div>
        <div className="flex items-center justify-between gap-3 mt-4">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-primary/85">Plots available</span>
          <ChevronRight className="w-4 h-4 text-primary/70 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */

const CemeteryDirectory = () => {
  const [region, setRegion] = useState("All");
  const [query, setQuery] = useState("");

  const cemeteryNames = useMemo(
    () =>
      Array.from(
        new Set(
          bayCemeteries
            .filter((c) => region === "All" || c.region === region)
            .map((c) => c.name)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [region]
  );

  const grouped = useMemo(() => {
    const filtered = bayCemeteries.filter((c) => {
      if (region !== "All" && c.region !== region) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.region.toLowerCase().includes(q)
        );
      }
      return true;
    });
    const map = new Map<string, Cem[]>();
    filtered.forEach((c) => {
      const arr = map.get(c.region) ?? [];
      arr.push(c);
      map.set(c.region, arr);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [region, query]);

  const total = bayCemeteries.length;

  // While someone is searching for a cemetery by name, the matching cemeteries
  // move to the top of the page — the metro gallery and coverage map step aside.
  const isSearching = query.trim().length > 0;

  // The coverage map follows whichever metro area is selected.
  const mapRegions = useMemo(
    () => (region === "All" ? ALL_TEXAS_REGIONS : [region]),
    [region]
  );

  const countByRegion = useMemo(() => {
    const m: Record<string, number> = {};
    bayCemeteries.forEach((c) => {
      m[c.region] = (m[c.region] ?? 0) + 1;
    });
    return m;
  }, []);


  const listRef = useRef<HTMLDivElement | null>(null);
  const barAnchorRef = useRef<HTMLDivElement | null>(null);
  const [barPinned, setBarPinned] = useState(false);
  const [navHeight, setNavHeight] = useState(64);

  useEffect(() => {
    const measureNav = () => {
      const nav = document.querySelector("nav");
      if (nav) setNavHeight((nav as HTMLElement).offsetHeight);
    };
    measureNav();
    const onScroll = () => {
      measureNav();
      const anchor = barAnchorRef.current;
      if (anchor) setBarPinned(anchor.getBoundingClientRect().top <= navHeight);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [navHeight]);

  const scrollToResults = () => {
    const el = listRef.current;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 140;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Texas Cemeteries Served by Texas Cemetery Brokers",
    numberOfItems: total,
    itemListElement: bayCemeteries.slice(0, 50).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://texascemeterybrokers.com/cemeteries/${slugify(c.name)}`,
      name: c.name,
    })),
  };

  return (
    <div className="relative min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
      {/* Hero artwork + warm wash — page-level, always behind content,
          fading gently into the page below the region gallery */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[900px] md:h-[1500px] z-0 overflow-hidden pointer-events-none"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)",
        }}
      >
        {/* Desktop: richer diagonal wash */}
        <div className="hidden md:block absolute inset-0 bg-gradient-to-br from-accent/65 via-secondary to-background" />
        <div className="md:hidden absolute inset-0 bg-gradient-to-b from-accent/30 via-secondary/50 via-40% to-background" />

        {/* Desktop blur accents */}
        <div className="hidden md:block absolute -top-28 -right-24 w-[680px] h-[680px] rounded-full bg-primary/35 blur-3xl" />
        <div className="hidden md:block absolute top-28 -left-36 w-[580px] h-[580px] rounded-full bg-accent/55 blur-3xl" />
        <div className="hidden md:block absolute top-[560px] right-1/3 w-[460px] h-[460px] rounded-full bg-primary/25 blur-3xl" />

        {/* Mobile blur accents — smaller, lighter, cream-forward so it doesn't turn brown */}
        <div className="md:hidden absolute -top-10 -right-14 w-[320px] h-[320px] rounded-full bg-accent/25 blur-3xl" />
        <div className="md:hidden absolute top-10 -left-14 w-[280px] h-[280px] rounded-full bg-primary/20 blur-3xl" />
        <div className="md:hidden absolute top-[320px] right-1/4 w-[240px] h-[240px] rounded-full bg-background/60 blur-3xl" />

        {/* Two purpose-built arrangements wrap around the headline and search bar,
            extending lower so they visually frame the search field from both sides. */}
        <div className="absolute inset-x-0 top-8 h-[640px] hidden md:block">
          <img
            src={heroBotanicalLeft}
            alt=""
            width={1024}
            height={1408}
            className="absolute -left-32 top-0 h-[580px] w-auto max-w-[38vw] object-contain object-left-top opacity-90 select-none drop-shadow-sm"
          />
          <img
            src={heroBotanicalRight}
            alt=""
            width={1024}
            height={1408}
            className="absolute -right-32 top-0 h-[590px] w-auto max-w-[38vw] object-contain object-right-top opacity-90 select-none drop-shadow-sm"
          />
        </div>
        {/* On phones, small sprigs wrap around the search bar instead of towering side arrangements. */}
        <div className="absolute inset-x-0 top-16 h-[440px] md:hidden pointer-events-none">
          <img
            src={searchSprig}
            alt=""
            width={320}
            height={220}
            className="absolute top-[232px] -left-10 w-24 opacity-80 select-none rotate-[168deg]"
          />
          <img
            src={searchSprig}
            alt=""
            width={320}
            height={220}
            className="absolute top-[250px] -right-10 w-24 opacity-80 select-none rotate-[-12deg]"
          />
        </div>
      </div>
      <Seo
        title="Texas Cemeteries We Serve — Buy & Sell Plots | Texas Cemetery Brokers"
        description={`Browse ${total}+ cemeteries across Dallas–Fort Worth, Houston, Austin, San Antonio, El Paso & beyond. Get help buying or selling cemetery plots in Texas.`}
        path="/cemeteries"
        jsonLd={jsonLd}
      />
      <Navbar warm />

      {/* HERO — warm wash that feathers into the page */}
      <section className="relative z-30 overflow-visible">
        <div className="relative z-10 container mx-auto px-6 pt-28 pb-6 md:pt-36 md:pb-5">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-background/75 backdrop-blur ring-1 ring-primary/15 mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] tracking-[0.16em] uppercase font-bold text-primary">
                Texas&rsquo; licensed plot marketplace
              </span>
            </span>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[54px] text-foreground leading-[1.06] tracking-tight">
              Cemetery plots,{" "}
              <em className="not-italic text-primary">simply</em> bought and sold.
            </h1>
            <p className="mt-3 md:mt-4 text-foreground/70 text-[15px] md:text-base max-w-2xl mx-auto leading-relaxed">
              {total}+ cemeteries from Dallas–Fort Worth to the Valley — at meaningfully below retail. We handle the
              cemetery paperwork, transfer and title end to end.
            </p>

            <div className="mt-5 md:mt-6">
              <HeroSearch
                region={region}
                setRegion={setRegion}
                query={query}
                setQuery={setQuery}
                cemeteryNames={cemeteryNames}
                onSubmit={scrollToResults}
              />
            </div>

            <div className="hidden md:flex mt-4 flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[13.5px] font-medium text-foreground/70">
              <span className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                {total}+ cemeteries served
              </span>
              <span>30–60% below retail</span>
              <a href="tel:+12142304740" className="text-foreground font-semibold hover:text-primary transition-colors">
                (214) 230-4740
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* METRO AREAS — photo cards straight under the search (hidden while searching) */}
      {!isSearching && (
      <section className="relative z-20 container mx-auto px-6 pt-2 pb-8 md:pt-2 md:pb-16">
        <div className="text-center mb-4 md:mb-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary font-bold mb-1">Explore Texas</p>
          <h2 className="font-display text-2xl md:text-3xl tracking-tight text-foreground">
            Choose a metro area
          </h2>
          <p className="mt-1 text-sm text-foreground/60">
            Each one opens its cemeteries and coverage map below.
          </p>
        </div>


        <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 md:gap-5">
          {AREA_FEATURES.map((a, index) => (
            <button
              key={a.region}
              onClick={() => {
                setRegion(a.region);
                setQuery("");
                window.setTimeout(scrollToResults, 60);
              }}
              className={`${index < 2 ? "lg:col-span-6" : "lg:col-span-3"} group relative overflow-hidden rounded-2xl text-left shadow-[0_12px_30px_-18px_hsl(var(--foreground)/0.55)] hover:shadow-[0_24px_44px_-18px_hsl(var(--primary)/0.5)] transition-shadow`}
            >
              <img
                src={REGION_PHOTOS[a.region]?.[0] ?? PHOTO_POOL[0]}
                alt={`${a.region} cemetery park`}
                className={`w-full object-cover transition-transform duration-700 group-hover:scale-105 ${index < 2 ? "h-56 md:h-72" : "h-48 md:h-60"}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 text-primary-foreground">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-foreground/90 mb-1">Texas region</p>
                    <h3 className={`font-display tracking-tight leading-none ${index < 2 ? "text-2xl md:text-4xl" : "text-xl md:text-2xl"}`}>{a.region}</h3>
                  </div>
                  <span className="shrink-0 rounded-full bg-background/90 px-2.5 py-1 text-xs font-bold text-foreground backdrop-blur">
                    {countByRegion[a.region] ?? 0}
                  </span>
                </div>
                <p className="hidden sm:block mt-2 text-xs md:text-sm text-primary-foreground/90 truncate">{a.cities}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-5 flex justify-center">
          <button
            onClick={() => {
              setRegion("All");
              setQuery("");
              window.setTimeout(scrollToResults, 60);
            }}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            View all {total} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
      )}

      {/* COVERAGE MAP — follows whichever metro area is selected, styled as an inline widget */}
      {!isSearching && (
      <section className="relative z-20 container mx-auto px-6 pb-6 md:pb-8">
        <div className="text-center mb-6 md:mb-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary font-bold mb-1.5 inline-flex items-center gap-2">
            <Navigation className="w-3.5 h-3.5" />
            Coverage map
          </p>
          <h2 className="font-display text-2xl md:text-3xl tracking-tight text-foreground">
            {region === "All" ? "Every cemetery we cover in Texas" : `Cemeteries across ${region}`}
          </h2>
          <p className="mt-1.5 text-sm text-foreground/60">
            Pick a metro to zoom in — every pin is a cemetery we hold a profile for, with pricing and the current transfer fee.
          </p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-background/80 backdrop-blur-sm shadow-[0_24px_50px_-30px_hsl(var(--foreground)/0.4)] px-5 py-6 md:px-8 md:py-8">
          <Suspense
            fallback={<div className="h-[320px] flex items-center justify-center text-sm text-foreground/60">Loading map…</div>}
          >
            <MetroCemeteryMap
              regions={mapRegions}
              metro={region === "All" ? "Texas" : region}
              fullBleed={false}
              widget
              hideTitle
              onMetroChange={(regions) => {
                if (regions.length >= ALL_TEXAS_REGIONS.length) {
                  setRegion("All");
                } else {
                  const match = ALL_TEXAS_REGIONS.find((r) => regions.includes(r));
                  if (match) setRegion(match);
                }
                setQuery("");
              }}
            />
          </Suspense>
        </div>
      </section>
      )}

      <div ref={barAnchorRef} aria-hidden="true" />

      {/* Condensed pinned search — same control, slim variant */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {barPinned && (
              <motion.div
                key="sticky-search"
                initial={{ y: -28, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="hidden md:block fixed left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.22)]"
                style={{ top: `${navHeight}px` }}
              >
                <div className="container mx-auto px-6 py-3 flex justify-center">
                  <HeroSearch
                    variant="compact"
                    region={region}
                    setRegion={setRegion}
                    query={query}
                    setQuery={setQuery}
                    cemeteryNames={cemeteryNames}
                    onSubmit={scrollToResults}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* REGION SECTIONS — grid of compact cards, one block per region */}
      <section className="relative z-10 pt-10 md:pt-14 pb-20 md:pb-28 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.45]"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--accent) / 0.45) 1.4px, transparent 1.4px)",
            backgroundSize: "24px 24px",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0, hsl(0 0% 0%) 180px, hsl(0 0% 0%) calc(100% - 220px), transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0, hsl(0 0% 0%) 180px, hsl(0 0% 0%) calc(100% - 220px), transparent 100%)",
          }}
        />
        <div aria-hidden className="pointer-events-none absolute top-[18%] -right-40 w-[520px] h-[520px] rounded-full bg-primary/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute top-[55%] -left-40 w-[460px] h-[460px] rounded-full bg-accent/12 blur-3xl" />

        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {LEAVES.length > 0 &&
            LEAF_SCATTER.map((s, i) => (
              <img
                key={i}
                src={LEAVES[s.idx % LEAVES.length]}
                alt=""
                loading="lazy"
                className="absolute select-none"
                style={{
                  top: s.top,
                  left: s.left,
                  right: s.right,
                  width: `${Math.round(s.size * 1.45)}px`,
                  height: "auto",
                  opacity: s.opacity,
                  transform: `rotate(${s.rotate}deg)`,
                  filter: "saturate(0.85)",
                }}
              />
            ))}
        </div>

        <div className="relative container mx-auto px-6">
          {grouped.length === 0 && (
            <div className="text-center py-24">
              <p className="font-display text-2xl text-foreground mb-2">No cemeteries match</p>
              <p className="text-sm text-foreground/65">Try a different search or region.</p>
            </div>
          )}

          <div ref={listRef}>
            {grouped.map(([groupRegion, list]) => (
              <section key={groupRegion} className="py-5 sm:py-8">
              <div className="text-center mb-4 sm:mb-6">
                <h2 className="font-display text-2xl sm:text-3xl md:text-4xl tracking-tight text-foreground">
                  Cemeteries in <em className="italic text-primary">{groupRegion}</em>
                </h2>
                <span className="inline-block mt-1.5 text-[12px] uppercase tracking-[0.16em] text-foreground/60 font-semibold">
                  {list.length} {list.length === 1 ? "cemetery" : "cemeteries"}
                </span>

                {/* Region switcher — lets users hop to another region without scrolling back to the top */}
                {region !== "All" && groupRegion === region && (
                  <div className="flex flex-wrap justify-center gap-2 mt-5">
                    <button
                      onClick={() => {
                        setRegion("All");
                        setQuery("");
                        window.setTimeout(scrollToResults, 60);
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-all ${
                        region === "All"
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background/80 text-foreground/80 border-border hover:border-primary/50 hover:bg-secondary"
                      }`}
                    >
                      All Texas
                    </button>
                    {regions.filter((r) => r !== "All").map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setRegion(r);
                          setQuery("");
                          window.setTimeout(scrollToResults, 60);
                        }}
                        className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition-all ${
                          region === r
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background/80 text-foreground/80 border-border hover:border-primary/50 hover:bg-secondary"
                        }`}
                      >
                        {r}
                        <span className="ml-1.5 text-[10px] opacity-70">({countByRegion[r] ?? 0})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {(() => {
                const featuredNames = FEATURED_BY_REGION[groupRegion] ?? [];
                const featured = featuredNames
                  .map((n) => list.find((c) => c.name === n))
                  .filter(Boolean) as Cem[];
                const rest = list.filter((c) => !featured.includes(c));
                return (
                  <>
                    {featured.length > 0 && (
                      <div className="mb-8 sm:mb-10">
                        <p className="text-center text-[11px] uppercase tracking-[0.2em] text-foreground/55 font-semibold mb-4">
                          Most interest in {groupRegion}
                        </p>
                        <div
                          className={`grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 ${
                            featured.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"
                          }`}
                        >
                          {featured.map((c, i) => (
                            <FeaturedCemeteryCard key={`f-${c.name}-${c.city}`} c={c} index={i} />
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                      {rest.map((c, i) => (
                        <CemeteryCard key={`${c.name}-${c.city}`} c={c} index={i} />
                      ))}
                    </div>
                  </>
                );
              })()}
              </section>
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-16 relative overflow-hidden rounded-[28px] border border-border/60"
          >
            <img loading="lazy" decoding="async" src={imgHillside} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/95 via-foreground/85 to-foreground/60" />

            <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-10 items-center p-10 md:p-14">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <p className="text-[11px] tracking-[0.3em] uppercase text-background/80 font-medium">
                    Don't see yours? · We work with hundreds more
                  </p>
                </div>
                <h3 className="font-display text-3xl md:text-5xl text-background mb-4 tracking-tight leading-[1.05]">
                  Talk to a Texas broker today.
                  <br />
                  <em className="italic font-normal text-background/70">Buying or selling — we'll guide it.</em>
                </h3>
                <p className="text-background/70 mb-7 max-w-xl text-base">
                  One short call. No pressure. We'll tell you exactly what we can do at your specific cemetery, what
                  your plot is worth, and what's available to buy.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href="tel:+12142304740"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity"
                  >
                    <Phone className="w-4 h-4" /> (214) 230-4740
                  </a>
                  <Link
                    to="/sell"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-background text-foreground font-medium rounded-full text-sm hover:bg-background/90 transition-colors"
                  >
                    Get a free valuation <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/buy"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-transparent border border-background/40 text-background font-medium rounded-full text-sm hover:bg-background/10 transition-colors"
                  >
                    I want to buy <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="hidden md:grid grid-cols-2 gap-3">
                {[
                  { k: "30+", v: "Years brokering Texas plots" },
                  { k: "$0", v: "Upfront cost to sellers" },
                  { k: "30–60%", v: "Avg. buyer savings vs retail" },
                  { k: "24h", v: "Valuation response time" },
                ].map((s) => (
                  <div key={s.v} className="rounded-2xl bg-background/8 border border-background/15 backdrop-blur-md p-4">
                    <p className="font-display text-2xl text-background leading-none mb-2">{s.k}</p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-background/65 leading-snug">{s.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CemeteryDirectory;
