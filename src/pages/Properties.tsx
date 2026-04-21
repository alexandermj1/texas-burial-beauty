import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Search, SlidersHorizontal, Phone, ArrowRight, TrendingUp } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NearestCemeteryFinder from "@/components/NearestCemeteryFinder";
import { BuyerPromoAnimation } from "@/components/PromoAnimation";
import { bayCemeteries, regions, plotTypes } from "@/data/cemeteries";

import singlePlotImg from "@/assets/property-types/single-plot.png";
import singlePlotX2Img from "@/assets/property-types/single-plot-x2.png";
import singlePlotX3Img from "@/assets/property-types/single-plot-x3.png";
import singlePlotX4Img from "@/assets/property-types/single-plot-x4.png";
import companionPlotImg from "@/assets/property-types/companion-plot.png";
import lawnCryptImg from "@/assets/property-types/lawn-crypt.png";
import lawnCryptX2Img from "@/assets/property-types/lawn-crypt-x2.png";
import mausoleumImg from "@/assets/property-types/mausoleum.png";
import mausoleumX2Img from "@/assets/property-types/mausoleum-x2.png";
import mausoleumX3Img from "@/assets/property-types/mausoleum-x3.png";
import cremationNicheImg from "@/assets/property-types/cremation-niche.png";
import cremationNicheX2Img from "@/assets/property-types/cremation-niche-x2.png";
import cremationNicheX3Img from "@/assets/property-types/cremation-niche-x3.png";
import familyEstateImg from "@/assets/property-types/family-estate.png";
import veteransX1Img from "@/assets/property-types/veterans-x1.png";
import veteransX2Img from "@/assets/property-types/veterans-x2.png";
import veteransX3Img from "@/assets/property-types/veterans-x3.png";

import heroBg from "@/assets/hero/cemetery-hillside.jpg";
import defaultCemImg from "@/assets/cemeteries/default-cemetery.png";
import hillsideCemImg from "@/assets/cemeteries/hillside-cemetery.png";
import mausoleumCemImg from "@/assets/cemeteries/mausoleum-cemetery.png";
import chapelCemImg from "@/assets/cemeteries/chapel-cemetery.png";
import naturalCemImg from "@/assets/cemeteries/natural-cemetery.png";
import italianCemImg from "@/assets/cemeteries/italian-cemetery.png";
import greekCemImg from "@/assets/cemeteries/greek-cemetery.png";
import veteransCemImg from "@/assets/cemeteries/veterans-cemetery.png";

const getCemeteryImage = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes("chapel") || n.includes("chimes") || n.includes("columbarium")) return chapelCemImg;
  if (n.includes("italian")) return italianCemImg;
  if (n.includes("greek") || n.includes("orthodox")) return greekCemImg;
  if (n.includes("skylawn") || n.includes("mt.") || n.includes("mount") || n.includes("mountain view") || n.includes("hilltop") || n.includes("rolling hills")) return hillsideCemImg;
  if (n.includes("fernwood") || n.includes("natural") || n.includes("oak") || n.includes("evergreen") || n.includes("lone tree")) return naturalCemImg;
  if (n.includes("holy") || n.includes("mission") || n.includes("st.") || n.includes("queen") || n.includes("all souls") || n.includes("sepulchre")) return mausoleumCemImg;
  if (n.includes("cypress") || n.includes("garden") || n.includes("memory") || n.includes("green")) return defaultCemImg;
  if (n.includes("sunset") || n.includes("sunrise") || n.includes("skyview")) return hillsideCemImg;
  return defaultCemImg;
};

const getPlotImage = (plotType: string, spaces: number): string | undefined => {
  const type = plotType.toLowerCase();

  if (type.includes("veteran")) {
    if (spaces >= 3) return veteransX3Img;
    if (spaces === 2) return veteransX2Img;
    return veteransX1Img;
  }
  if (type.includes("companion") || type.includes("double")) {
    if (spaces >= 4) return singlePlotX4Img;
    if (spaces >= 3) return singlePlotX3Img;
    return companionPlotImg;
  }
  if (type.includes("family") || type.includes("estate")) return familyEstateImg;
  if (type.includes("mausoleum") || type === "crypt" || type.includes("crypt")) {
    if (spaces >= 3) return mausoleumX3Img;
    return spaces >= 2 ? mausoleumX2Img : mausoleumImg;
  }
  if (type.includes("niche") || type.includes("cremation")) {
    if (spaces >= 3) return cremationNicheX3Img;
    return spaces >= 2 ? cremationNicheX2Img : cremationNicheImg;
  }
  if (type.includes("lawn")) {
    return spaces >= 2 ? lawnCryptX2Img : lawnCryptImg;
  }
  // Single plot variants — use double image for 2+ spaces
  if (spaces >= 4) return singlePlotX4Img;
  if (spaces === 3) return singlePlotX3Img;
  if (spaces === 2) return singlePlotX2Img;
  return singlePlotImg;
};

interface ListingRow {
  id: string;
  cemetery: string;
  city: string;
  plot_type: string;
  section: string;
  spaces: number;
  asking_price: number | null;
  photos: string[] | null;
  description: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  profit: number | null;
  cost_price: number | null;
}

/* Reusable listing card for use on home page too */
export const ListingCard = ({ listing, isAdmin, index = 0 }: { listing: ListingRow; isAdmin: boolean; index?: number }) => {
  const typeImg = getPlotImage(listing.plot_type, listing.spaces);
  const hasPhoto = listing.photos && listing.photos.length > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.2) }}
      className="group relative bg-card rounded-2xl overflow-hidden shadow-[0_2px_16px_-4px_hsl(var(--primary)/0.08),0_1px_3px_-1px_hsl(var(--foreground)/0.06)] hover:shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.15),0_2px_8px_-2px_hsl(var(--foreground)/0.08)] hover:-translate-y-1 transition-all duration-300 border border-border/60"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-secondary/[0.06] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      {hasPhoto && (
        <div className="h-40 overflow-hidden relative bg-gradient-to-br from-accent/30 via-secondary/20 to-primary/5">
          <img src={listing.photos![0]} alt={listing.cemetery} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        </div>
      )}
      <div className="relative p-5">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                {listing.plot_type}
              </span>
              <span className="text-xs text-muted-foreground">{listing.spaces} {listing.spaces > 1 ? "spaces" : "space"}</span>
            </div>
            <h3 className="font-display text-lg text-foreground mb-1 truncate">{listing.cemetery}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mb-0.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" /> {listing.city}, TX
            </p>
            <p className="text-xs text-muted-foreground mb-0">Section: {listing.section}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-3">
                {listing.asking_price ? (
                  <span className="text-sm font-semibold text-foreground">${listing.asking_price.toLocaleString()}</span>
                ) : (
                  <span className="text-xs text-primary font-medium">Contact for pricing</span>
                )}
                {isAdmin && listing.profit != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/60">
                    <TrendingUp className="w-3 h-3" />
                    +${listing.profit.toLocaleString()}
                  </span>
                )}
              </div>
              {listing.contact_phone ? (
                <a href={`tel:${listing.contact_phone}`} className="inline-flex items-center gap-1.5 text-primary font-medium text-sm hover:gap-2 transition-all">
                  <Phone className="w-3.5 h-3.5" /> Contact
                </a>
              ) : (
                <a href="tel:+12142560795" className="inline-flex items-center gap-1.5 text-primary font-medium text-sm hover:gap-2 transition-all">
                  Inquire <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
          {typeImg && (
            <>
              <div className="w-px h-24 bg-gradient-to-b from-primary/30 via-border to-transparent shrink-0 mt-1" />
              <motion.div
                initial={{ opacity: 0, x: 8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.08 }}
                className="shrink-0 w-28 h-28 flex items-center justify-center relative"
              >
                <div className="absolute inset-2 rounded-full bg-primary/10 blur-xl opacity-70" />
                <img
                  src={typeImg}
                  alt={listing.plot_type}
                  className="relative h-24 w-auto object-contain drop-shadow-lg mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </motion.div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const Properties = () => {
  const [searchParams] = useSearchParams();
  const [regionFilter, setRegionFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [tab, setTab] = useState<"cemeteries" | "plots">("cemeteries");
  const [dbListings, setDbListings] = useState<ListingRow[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [showGuided, setShowGuided] = useState(true);
  const [spacesFilter, setSpacesFilter] = useState("All");
  const { isAdmin } = useAdmin();

  useEffect(() => { fetchListings(); }, []);

  const fetchListings = async () => {
    const { data } = await supabase
      .from("listings")
      .select("id, cemetery, city, plot_type, section, spaces, asking_price, photos, description, contact_name, contact_phone, contact_email, profit, cost_price")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (data) setDbListings(data as any);
    setLoadingListings(false);
  };

  const filteredCemeteries = useMemo(() => {
    let result = bayCemeteries;
    if (regionFilter !== "All") result = result.filter(c => c.region === regionFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q) || c.address.toLowerCase().includes(q));
    }
    return result;
  }, [regionFilter, searchQuery]);

  const spacesOptions = useMemo(() => {
    const unique = [...new Set(dbListings.map(l => l.spaces))].sort((a, b) => a - b);
    return ["All", ...unique.map(String)];
  }, [dbListings]);

  const filteredListings = useMemo(() => {
    let result = dbListings;
    if (typeFilter !== "All") result = result.filter(l => l.plot_type === typeFilter);
    if (spacesFilter !== "All") result = result.filter(l => String(l.spaces) === spacesFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.cemetery.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.section.toLowerCase().includes(q) ||
        l.plot_type.toLowerCase().includes(q) ||
        String(l.spaces).includes(q) ||
        (q.includes("veteran") && l.plot_type.toLowerCase().includes("veteran")) ||
        (q.includes("companion") && l.plot_type.toLowerCase().includes("companion")) ||
        (q.includes("niche") && l.plot_type.toLowerCase().includes("niche")) ||
        (q.includes("crypt") && l.plot_type.toLowerCase().includes("crypt")) ||
        (q.includes("mausoleum") && l.plot_type.toLowerCase().includes("mausoleum")) ||
        (q.includes("family") && l.plot_type.toLowerCase().includes("family"))
      );
    }
    return result;
  }, [dbListings, typeFilter, spacesFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Compact photo hero with dark overlay for white text legibility */}
      <section className="relative pt-24 pb-5 overflow-hidden">
        <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/65 to-foreground/40" />
        <div className="relative container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-3xl">
            <p className="text-primary-foreground/70 text-xs tracking-[0.2em] uppercase font-medium mb-2 drop-shadow">Browse & Search</p>
            <h1 className="font-display text-3xl md:text-4xl text-primary-foreground mb-2 drop-shadow-lg">Available Plots</h1>
            <p className="text-primary-foreground/85 text-sm font-light max-w-xl drop-shadow-md">Discounted burial plots, niches, and crypts across Texas — Dallas, Fort Worth, Houston, Austin & San Antonio.</p>
          </motion.div>
        </div>
      </section>

      {/* Guided Search Prompt */}
      {showGuided && (
        <section className="py-8 bg-gradient-sage">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col md:flex-row items-center justify-between gap-6 bg-card rounded-2xl p-6 md:p-8 shadow-soft border border-border/50"
            >
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Search className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-xl md:text-2xl text-foreground mb-1">Not sure where to start?</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">Our guided search walks you through finding the perfect property step by step.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link to="/buy" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all">
                  Start Guided Search <ArrowRight className="w-4 h-4" />
                </Link>
                <button onClick={() => setShowGuided(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2">Dismiss</button>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      <section className="pb-16 pt-8">
        <div className="container mx-auto px-6">
          {/* Tab toggle */}
          <div className="flex gap-2 mb-6">
            <button onClick={() => setTab("cemeteries")} className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${tab === "cemeteries" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              Cemeteries We Serve ({filteredCemeteries.length})
            </button>
            <button onClick={() => setTab("plots")} className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${tab === "plots" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>
              Available Plots ({filteredListings.length})
            </button>
          </div>

          {/* Search & Filters — NOT sticky on mobile */}
          <div className="sm:sticky sm:top-[72px] z-30 bg-background/95 backdrop-blur-sm py-4 -mx-6 px-6 border-b border-border mb-6">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder={tab === "plots" ? "Search by cemetery, city, plot type, veteran..." : "Search by cemetery, city, or address..."} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-full bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {tab === "cemeteries" ? (
                  <>
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {regions.map(r => (
                      <button key={r} onClick={() => setRegionFilter(r)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${regionFilter === r ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>{r}</button>
                    ))}
                  </>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                      <div className="sm:hidden w-full">
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full px-3 py-2 rounded-full bg-card border border-border text-sm text-foreground">
                          {plotTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 flex-wrap">
                        {plotTypes.map(t => (
                          <button key={t} onClick={() => setTypeFilter(t)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${typeFilter === t ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>{t}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground font-medium">Spaces:</span>
                      <div className="sm:hidden">
                        <select value={spacesFilter} onChange={e => setSpacesFilter(e.target.value)} className="px-3 py-1.5 rounded-full bg-card border border-border text-xs text-foreground">
                          {spacesOptions.map(s => <option key={s} value={s}>{s === "All" ? "All" : s}</option>)}
                        </select>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 flex-wrap">
                        {spacesOptions.map(s => (
                          <button key={s} onClick={() => setSpacesFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${spacesFilter === s ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>{s === "All" ? "All" : s}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cemeteries Tab */}
          {tab === "cemeteries" && (
            <>
              <p className="text-sm text-muted-foreground mb-5">Showing {filteredCemeteries.length} {filteredCemeteries.length === 1 ? "cemetery" : "cemeteries"}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredCemeteries.map((cem, i) => (
                  <motion.div key={`${cem.name}-${cem.city}`} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.2) }} className="group bg-card rounded-xl overflow-hidden shadow-soft hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300 cursor-pointer border border-border/40" onClick={() => { setSearchQuery(cem.name); setTab("plots"); }}>
                    <div className="flex items-start gap-3 p-5">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-base text-foreground mb-1 truncate">{cem.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2 truncate">{cem.address}</p>
                        <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{cem.region}</span>
                      </div>
                      <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden relative">
                        <img src={getCemeteryImage(cem.name)} alt={cem.name} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-500" loading="lazy" width={64} height={64} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              {filteredCemeteries.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg mb-2">No cemeteries found</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
                </div>
              )}
            </>
          )}

          {/* Available Plots Tab */}
          {tab === "plots" && (
            <>
              <p className="text-sm text-muted-foreground mb-5">Showing {filteredListings.length} {filteredListings.length === 1 ? "plot" : "plots"}</p>
              {loadingListings ? (
                <div className="text-center py-16 text-muted-foreground">Loading plots...</div>
              ) : filteredListings.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg mb-2">No plots available yet</p>
                  <p className="text-sm text-muted-foreground mb-6">New properties are added regularly. Use our guided search to tell us what you need.</p>
                  <Link to="/buy" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity">
                    Start Guided Search <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredListings.map((listing, i) => (
                    <ListingCard key={listing.id} listing={listing} isAdmin={isAdmin} index={i} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Bottom CTA */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mt-12 bg-gradient-sage rounded-2xl p-8 text-center">
            <h3 className="font-display text-2xl text-foreground mb-2">Don't see what you're looking for?</h3>
            <p className="text-muted-foreground mb-5">Use our guided search to tell us exactly what you need — we'll find it for you.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/buy" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity">
                Start Guided Search <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="tel:+12142560795" className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground font-medium rounded-full text-sm hover:bg-card transition-all">
                <Phone className="w-4 h-4" /> Call (214) 256-0795
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <BuyerPromoAnimation />
      <NearestCemeteryFinder cemeteries={bayCemeteries} />
      <Footer />
    </div>
  );
};

export default Properties;
