import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, Heart, MapPin, ArrowRight, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { bayCemeteries } from "@/data/cemeteries";

import singlePlotImg from "@/assets/property-types/single-plot.png";
import singlePlotX2Img from "@/assets/property-types/single-plot-x2.png";
import singlePlotX3Img from "@/assets/property-types/single-plot-x3.png";
import companionPlotImg from "@/assets/property-types/companion-plot.png";
import lawnCryptImg from "@/assets/property-types/lawn-crypt.png";
import mausoleumImg from "@/assets/property-types/mausoleum.png";
import cremationNicheImg from "@/assets/property-types/cremation-niche.png";
import familyEstateImg from "@/assets/property-types/family-estate.png";
import veteransX1Img from "@/assets/property-types/veterans-x1.png";

import defaultCemImg from "@/assets/cemeteries/default-cemetery.png";
import hillsideCemImg from "@/assets/cemeteries/hillside-cemetery.png";
import mausoleumCemImg from "@/assets/cemeteries/mausoleum-cemetery.png";
import chapelCemImg from "@/assets/cemeteries/chapel-cemetery.png";
import naturalCemImg from "@/assets/cemeteries/natural-cemetery.png";
import italianCemImg from "@/assets/cemeteries/italian-cemetery.png";
import greekCemImg from "@/assets/cemeteries/greek-cemetery.png";
import veteransCemImg from "@/assets/cemeteries/veterans-cemetery.png";

// User-uploaded hero photos used for richer cemetery imagery
import heroCathedral from "@/assets/hero/cemetery-cathedral.jpg";
import heroHillside from "@/assets/hero/cemetery-hillside.jpg";
import heroMountains from "@/assets/hero/cemetery-mountains.jpg";
import heroMural from "@/assets/hero/cemetery-mural.jpg";
import heroPalms from "@/assets/hero/cemetery-palms.jpg";

export const getCemeteryImage = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes("chapel") || n.includes("chimes") || n.includes("columbarium")) return heroCathedral;
  if (n.includes("italian")) return italianCemImg;
  if (n.includes("greek") || n.includes("orthodox")) return greekCemImg;
  if (n.includes("skylawn") || n.includes("mt.") || n.includes("mount") || n.includes("mountain view") || n.includes("hilltop") || n.includes("rolling hills")) return heroMountains;
  if (n.includes("cypress") || n.includes("palm") || n.includes("olivet")) return heroPalms;
  if (n.includes("fernwood") || n.includes("natural") || n.includes("oak") || n.includes("evergreen") || n.includes("lone tree")) return heroHillside;
  if (n.includes("holy") || n.includes("mission") || n.includes("st.") || n.includes("queen") || n.includes("all souls") || n.includes("sepulchre")) return heroMural;
  if (n.includes("veteran")) return veteransCemImg;
  // Fallback rotation between uploaded photos for variety
  const pool = [heroCathedral, heroHillside, heroMountains, heroMural, heroPalms, defaultCemImg];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
};

const getPlotImage = (plotType: string, spaces: number): string => {
  const t = plotType.toLowerCase();
  if (t.includes("veteran")) return veteransX1Img;
  if (t.includes("companion") || t.includes("double")) return companionPlotImg;
  if (t.includes("family") || t.includes("estate")) return familyEstateImg;
  if (t.includes("mausoleum") || t.includes("crypt")) return mausoleumImg;
  if (t.includes("niche") || t.includes("cremation")) return cremationNicheImg;
  if (t.includes("lawn")) return lawnCryptImg;
  if (spaces >= 3) return singlePlotX3Img;
  if (spaces === 2) return singlePlotX2Img;
  return singlePlotImg;
};

interface Listing {
  id: string;
  cemetery: string;
  city: string;
  plot_type: string;
  section: string;
  spaces: number;
  asking_price: number | null;
  photos: string[] | null;
  profit: number | null;
}

/* -------- Airbnb-style search bar -------- */
const SearchBar = ({ query, setQuery }: { query: string; setQuery: (v: string) => void }) => (
  <div className="mx-auto max-w-3xl w-full">
    <div className="flex items-center bg-card rounded-full shadow-[0_2px_16px_-4px_hsl(var(--foreground)/0.12)] border border-border/60 hover:shadow-[0_4px_24px_-4px_hsl(var(--foreground)/0.18)] transition-shadow">
      <div className="flex-1 px-6 py-3 border-r border-border/60">
        <div className="text-[11px] font-semibold text-foreground">Where</div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cemeteries, cities, plot types"
          className="w-full text-sm text-muted-foreground bg-transparent outline-none placeholder:text-muted-foreground/70"
        />
      </div>
      <div className="hidden sm:block flex-1 px-6 py-3 border-r border-border/60">
        <div className="text-[11px] font-semibold text-foreground">Region</div>
        <div className="text-sm text-muted-foreground">Texas</div>
      </div>
      <div className="hidden sm:block flex-1 px-6 py-3 border-r border-border/60">
        <div className="text-[11px] font-semibold text-foreground">Type</div>
        <div className="text-sm text-muted-foreground">Any plot</div>
      </div>
      <button className="m-2 h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:scale-105 transition-transform">
        <Search className="w-4 h-4" />
      </button>
    </div>
  </div>
);

/* -------- Horizontal carousel row -------- */
const CarouselRow = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    if (!ref.current) return;
    ref.current.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <section className="mb-12">
      <div className="flex items-end justify-between mb-4">
        <div>
          <Link to="/properties" className="group inline-flex items-center gap-2">
            <h2 className="font-display text-2xl md:text-[26px] font-semibold text-foreground group-hover:underline">{title}</h2>
            <ArrowRight className="w-5 h-5 text-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button onClick={() => scroll(-1)} aria-label="Scroll left" className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center hover:shadow-md transition-shadow">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => scroll(1)} aria-label="Scroll right" className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center hover:shadow-md transition-shadow">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="flex gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  );
};

/* -------- Listing card (Airbnb-style) -------- */
const PlotCard = ({ listing, isAdmin }: { listing: Listing; isAdmin: boolean }) => {
  const img = (listing.photos && listing.photos[0]) || getCemeteryImage(listing.cemetery);
  const typeImg = getPlotImage(listing.plot_type, listing.spaces);
  return (
    <div className="snap-start shrink-0 w-[78%] sm:w-[44%] md:w-[31%] lg:w-[23%] xl:w-[18%] group">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-accent/30">
        <img src={img} alt={listing.cemetery} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-card/95 backdrop-blur text-[11px] font-semibold text-foreground shadow-sm">
          Available
        </div>
        <button aria-label="Save" className="absolute top-3 right-3 text-white/95 hover:scale-110 transition-transform drop-shadow">
          <Heart className="w-6 h-6" strokeWidth={2} />
        </button>
        <div className="absolute bottom-3 right-3 w-14 h-14 rounded-xl bg-card/95 backdrop-blur flex items-center justify-center shadow-md">
          <img src={typeImg} alt={listing.plot_type} className="w-12 h-12 object-contain mix-blend-multiply" />
        </div>
      </div>
      <div className="pt-3 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-[15px] text-foreground leading-tight truncate">{listing.cemetery}</h3>
        </div>
        <p className="text-[13px] text-muted-foreground truncate">{listing.city}, TX · {listing.plot_type}</p>
        <p className="text-[13px] text-muted-foreground">Section {listing.section} · {listing.spaces} {listing.spaces > 1 ? "spaces" : "space"}</p>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {listing.asking_price ? (
            <span className="text-[14px] text-foreground"><span className="font-semibold">${listing.asking_price.toLocaleString()}</span> <span className="text-muted-foreground">total</span></span>
          ) : (
            <span className="text-[14px] text-muted-foreground">Contact for pricing</span>
          )}
          {isAdmin && listing.profit != null && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200/60">
              <TrendingUp className="w-3 h-3" />+${listing.profit.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* -------- Cemetery card -------- */
export const CemeteryCard = ({ name, city, region }: { name: string; city: string; region: string }) => {
  const img = getCemeteryImage(name);
  return (
    <div className="snap-start shrink-0 w-[78%] sm:w-[44%] md:w-[31%] lg:w-[23%] xl:w-[18%] group">
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-accent/30">
        <img src={img} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
      </div>
      <div className="pt-3 px-0.5">
        <h3 className="font-medium text-[15px] text-foreground leading-tight truncate">{name}</h3>
        <p className="text-[13px] text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {city} · {region}</p>
      </div>
    </div>
  );
};

/* The browser body without Navbar/Footer — reusable on /home2. */
export const Properties2Browser = () => {
  const { isAdmin } = useAdmin();
  const [listings, setListings] = useState<Listing[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("listings")
        .select("id, cemetery, city, plot_type, section, spaces, asking_price, photos, profit")
        .in("status", ["active", "available"])
        .order("created_at", { ascending: false })
        .limit(200);
      setListings((data as Listing[]) || []);
      setLoading(false);
    })();
  }, []);

  const filteredListings = useMemo(() => {
    if (!query.trim()) return listings;
    const q = query.toLowerCase();
    return listings.filter((l) =>
      [l.cemetery, l.city, l.plot_type, l.section, `${l.spaces} space`].some((f) =>
        f?.toString().toLowerCase().includes(q)
      )
    );
  }, [listings, query]);

  const filteredCemeteries = useMemo(() => {
    if (!query.trim()) return bayCemeteries;
    const q = query.toLowerCase();
    return bayCemeteries.filter((c) => [c.name, c.city, c.region].some((f) => f.toLowerCase().includes(q)));
  }, [query]);

  const byRegion = (region: string) => filteredListings.filter((l) => {
    const cem = bayCemeteries.find((c) => c.name === l.cemetery);
    return cem?.region === region;
  });

  const featuredCemeteriesByRegion = (region: string) => filteredCemeteries.filter((c) => c.region === region);

  const isSearching = query.trim().length > 0;

  return (
    <>
      <div className="bg-background/95 backdrop-blur border-b border-border/60">
        <div className="mx-auto w-full max-w-[1536px] px-4 md:px-8 py-4">
          <SearchBar query={query} setQuery={setQuery} />
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1536px] px-4 md:px-8 pt-10 pb-16">
        {loading ? (
          <div className="text-center py-24 text-muted-foreground">Loading available plots…</div>
        ) : isSearching ? (
          <>
            {filteredListings.length > 0 && (
              <CarouselRow
                title={`Plots matching "${query}"`}
                subtitle={`${filteredListings.length} plot${filteredListings.length === 1 ? "" : "s"} found`}
              >
                {filteredListings.map((l) => <PlotCard key={l.id} listing={l} isAdmin={isAdmin} />)}
              </CarouselRow>
            )}
            {filteredCemeteries.length > 0 && (
              <CarouselRow
                title={`Cemeteries matching "${query}"`}
                subtitle={`${filteredCemeteries.length} cemeter${filteredCemeteries.length === 1 ? "y" : "ies"} found`}
              >
                {filteredCemeteries.map((c) => <CemeteryCard key={c.name} {...c} />)}
              </CarouselRow>
            )}
            {filteredListings.length === 0 && filteredCemeteries.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                Nothing matches "{query}". Try a different cemetery, city, or plot type.
              </div>
            )}
          </>
        ) : (
          <>
            {byRegion("Dallas–Fort Worth").length > 0 && (
              <CarouselRow title="Popular plots in Dallas–Fort Worth" subtitle="Restland, Hillcrest, Sparkman, Mount Olivet and more">
                {byRegion("Dallas–Fort Worth").slice(0, 20).map((l) => <PlotCard key={l.id} listing={l} isAdmin={isAdmin} />)}
              </CarouselRow>
            )}

            {byRegion("Greater Houston").length > 0 && (
              <CarouselRow title="Available in Greater Houston" subtitle="Forest Park, Memorial Oaks, Glenwood & more">
                {byRegion("Greater Houston").slice(0, 20).map((l) => <PlotCard key={l.id} listing={l} isAdmin={isAdmin} />)}
              </CarouselRow>
            )}

            <CarouselRow title="Featured cemeteries across Texas" subtitle="A collection of trusted memorial parks">
              {filteredCemeteries.slice(0, 16).map((c) => <CemeteryCard key={c.name} {...c} />)}
            </CarouselRow>

            {byRegion("Austin").length > 0 && (
              <CarouselRow title="Available in Austin" subtitle="Texas State Cemetery, Memorial Park, Cook-Walden">
                {byRegion("Austin").slice(0, 20).map((l) => <PlotCard key={l.id} listing={l} isAdmin={isAdmin} />)}
              </CarouselRow>
            )}

            {byRegion("San Antonio").length > 0 && (
              <CarouselRow title="Available in San Antonio" subtitle="Mission Burial Park, Sunset, Fort Sam Houston">
                {byRegion("San Antonio").slice(0, 20).map((l) => <PlotCard key={l.id} listing={l} isAdmin={isAdmin} />)}
              </CarouselRow>
            )}

            {featuredCemeteriesByRegion("San Antonio").length > 0 && (
              <CarouselRow title="Cemeteries in San Antonio" subtitle="Historic memorial parks of South Texas">
                {featuredCemeteriesByRegion("San Antonio").map((c) => <CemeteryCard key={c.name} {...c} />)}
              </CarouselRow>
            )}

            {filteredListings.length === 0 && (
              <div className="text-center py-16 px-6">
                <p className="font-display text-2xl text-foreground mb-2">Inventory refreshing</p>
                <p className="text-muted-foreground max-w-md mx-auto">New Texas plots are added to our private network every week. Request first access and we'll reach out as soon as new inventory matches your needs.</p>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
};

const Properties2 = () => {
  useEffect(() => {
    document.title = "Available Plots — Texas | Properties 2";
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
      <Seo
        title="Browse Texas Cemetery Plots & Cemeteries"
        description="Search Texas cemetery plots and memorial parks by city, type and price. Discover below-market listings across Dallas, Houston, Austin and San Antonio."
        path="/properties-2"
      />
      <Navbar />
      <Properties2Browser />
      <Footer />
    </div>
  );
};

export default Properties2;
