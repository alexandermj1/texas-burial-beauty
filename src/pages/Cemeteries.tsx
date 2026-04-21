import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, Phone, ArrowRight, Search, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import CemeteryMap from "@/components/CemeteryMap";
import Footer from "@/components/Footer";
import cemHeroBg from "@/assets/hero/cemetery-mural.jpg";

const cemeteryImages: Record<string, string> = {
  "Rose Hills Memorial Park": "/images/cemetery-rosehills.jpg",
  "Forest Lawn Memorial Park": "/images/cemetery-forestlawn.jpg",
  "Pacific View Memorial Park": "/images/cemetery-pacificview.jpg",
  "Green Hills Memorial Park": "/images/cemetery-greenhills.jpg",
  "El Camino Memorial Park": "/images/cemetery-elcamino.jpg",
};

const cemeteries = [
  { name: "Rose Hills Memorial Park", city: "Whittier", county: "Los Angeles", plots: 120, priceRange: "$2,000 – $25,000", desc: "The largest cemetery in North America, spanning over 1,400 acres with a wide variety of burial and memorial options including gardens, hillside plots, and mausoleums.", features: ["Gardens", "Mausoleums", "Hillside Plots", "Niches"] },
  { name: "Forest Lawn Memorial Park", city: "Glendale", county: "Los Angeles", plots: 85, priceRange: "$4,000 – $50,000", desc: "An iconic SoCal landmark known for its world-class art, grand architecture, and beautifully maintained hillside settings.", features: ["Art Collections", "Grand Mausoleums", "Gardens", "Crypts"] },
  { name: "Pacific View Memorial Park", city: "Corona del Mar", county: "Orange", plots: 34, priceRange: "$5,000 – $40,000", desc: "A stunning ocean-view memorial park perched along the Newport Coast, offering breathtaking panoramic views of the Pacific Ocean.", features: ["Ocean Views", "Garden Plots", "Niches", "Mausoleum"] },
  { name: "Green Hills Memorial Park", city: "Rancho Palos Verdes", county: "Los Angeles", plots: 45, priceRange: "$3,000 – $35,000", desc: "Beautiful hilltop grounds with panoramic views of the Pacific Ocean and Catalina Island.", features: ["Ocean Views", "Hilltop Settings", "Gardens", "Crypts"] },
  { name: "El Camino Memorial Park", city: "San Diego", county: "San Diego", plots: 52, priceRange: "$2,500 – $30,000", desc: "San Diego's premier memorial park surrounded by the scenic Sorrento Valley.", features: ["Valley Setting", "Mausoleums", "Garden Plots", "Niches"] },
  { name: "Holy Cross Cemetery", city: "Culver City", county: "Los Angeles", plots: 38, priceRange: "$3,000 – $20,000", desc: "A historic Catholic cemetery serving families since 1939.", features: ["Catholic", "Historic", "Mausoleum", "Garden Plots"] },
  { name: "Inglewood Park Cemetery", city: "Inglewood", county: "Los Angeles", plots: 29, priceRange: "$2,000 – $18,000", desc: "One of LA's most established cemeteries, featuring a beautiful mausoleum and serene garden settings.", features: ["Historic", "Mausoleum", "Gardens", "Niches"] },
  { name: "Riverside National Cemetery", city: "Riverside", county: "Riverside", plots: 18, priceRange: "$1,500 – $12,000", desc: "One of the busiest national cemeteries in the United States, honoring veterans.", features: ["Veterans", "National Cemetery", "Flat Markers", "Memorial Wall"] },
  { name: "Mountain View Cemetery", city: "Altadena", county: "Los Angeles", plots: 22, priceRange: "$2,000 – $15,000", desc: "Nestled at the foot of the San Gabriel Mountains, offering tranquil garden settings.", features: ["Mountain Views", "Garden Settings", "Flat Markers", "Niches"] },
  { name: "Harbor Lawn-Mt. Olive Memorial Park", city: "Costa Mesa", county: "Orange", plots: 15, priceRange: "$3,000 – $22,000", desc: "A peaceful Orange County memorial park with well-maintained grounds.", features: ["Gardens", "Mausoleum", "Niches", "Flat Markers"] },
  { name: "Eternal Hills Memorial Park", city: "Oceanside", county: "San Diego", plots: 20, priceRange: "$2,000 – $18,000", desc: "North San Diego County's premier cemetery with ocean breezes and hillside terraces.", features: ["Ocean Breezes", "Hillside", "Gardens", "Niches"] },
  { name: "Westminster Memorial Park", city: "Westminster", county: "Orange", plots: 14, priceRange: "$2,500 – $20,000", desc: "A well-established Orange County memorial park offering serene landscaped surroundings.", features: ["Gardens", "Mausoleum", "Cremation Options", "Flat Markers"] },
];

const counties = ["All", "Los Angeles", "Orange", "San Diego", "Riverside"];

const Cemeteries = () => {
  const [county, setCounty] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    let result = cemeteries;
    if (county !== "All") result = result.filter(c => c.county === county);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q));
    }
    return result;
  }, [county, searchQuery]);

  const getImage = (name: string) => cemeteryImages[name] || "/images/cemetery-default.jpg";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero — cinematic photo with white text overlay */}
      <section className="relative min-h-[40vh] overflow-hidden">
        <motion.img src={cemHeroBg} alt="" className="absolute inset-0 w-full h-full object-cover" initial={{ scale: 1.06 }} animate={{ scale: 1 }} transition={{ duration: 1.4, ease: "easeOut" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/50 to-foreground/30" />
        <div className="relative container mx-auto px-6 pt-32 pb-10 flex items-end min-h-[40vh]">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <p className="text-primary-foreground/80 text-xs tracking-[0.2em] uppercase font-medium mb-3 drop-shadow">Our Coverage</p>
            <h1 className="font-display text-4xl md:text-5xl text-primary-foreground mb-3 drop-shadow-lg">Cemeteries We Serve</h1>
            <p className="text-primary-foreground/90 text-base leading-relaxed drop-shadow-md">We specialize in Southern California's most sought-after cemeteries. Browse by county or search to find properties near you.</p>
          </motion.div>
        </div>
      </section>

      <CemeteryMap />

      <section className="pb-16">
        <div className="container mx-auto px-6">
          <div className="sm:sticky sm:top-[72px] z-30 bg-background/95 backdrop-blur-sm py-4 -mx-6 px-6 border-b border-border mb-6">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" placeholder="Search by cemetery or city..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-full bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {counties.map(c => (
                  <button key={c} onClick={() => setCounty(c)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${county === c ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground border border-border"}`}>{c}</button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-5">Showing {filtered.length} {filtered.length === 1 ? "cemetery" : "cemeteries"}</p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((cem, i) => (
              <motion.div key={cem.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.3) }} className="bg-card rounded-2xl overflow-hidden shadow-soft hover:shadow-hover transition-all duration-300 group">
                <div className="h-44 overflow-hidden">
                  <img src={getImage(cem.name)} alt={cem.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-block px-3 py-1 rounded-full bg-sage-light text-primary text-xs font-medium">{cem.county} County</span>
                    <span className="text-xs text-muted-foreground">{cem.plots} plots</span>
                  </div>
                  <h3 className="font-display text-lg text-foreground mb-1">{cem.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3"><MapPin className="w-3.5 h-3.5" /> {cem.city}, CA</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{cem.desc}</p>
                  <div className="flex items-center gap-1.5 mb-3 px-3 py-2 rounded-lg bg-muted/50">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm font-medium text-foreground">Price range:</span>
                    <span className="text-sm text-muted-foreground">{cem.priceRange}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {cem.features.map(f => (
                      <span key={f} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">{f}</span>
                    ))}
                  </div>
                  <Link to={`/listings?search=${encodeURIComponent(cem.name)}`} className="inline-flex items-center gap-2 text-primary font-medium text-sm group-hover:gap-3 transition-all">
                    View plots <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-2">No cemeteries found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="mt-12 bg-gradient-sage rounded-2xl p-8 text-center">
            <h3 className="font-display text-2xl text-foreground mb-2">Don't see your cemetery?</h3>
            <p className="text-muted-foreground mb-5">We serve many more cemeteries across Southern California. Give us a call.</p>
            <a href="tel:+16503720795" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity">
              <Phone className="w-4 h-4" /> (650) 372-0795
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Cemeteries;
