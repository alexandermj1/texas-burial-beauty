import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const cemeteryImages: Record<string, string> = {
  "Rose Hills Memorial Park": "/images/cemetery-rosehills.jpg",
  "Forest Lawn Memorial Park": "/images/cemetery-forestlawn.jpg",
  "Pacific View Memorial Park": "/images/cemetery-pacificview.jpg",
  "Green Hills Memorial Park": "/images/cemetery-greenhills.jpg",
  "El Camino Memorial Park": "/images/cemetery-elcamino.jpg",
};

const listings = [
  { id: 1, cemetery: "Rose Hills Memorial Park", city: "Whittier", type: "Double Plot", section: "Garden of Serenity", spaces: 2 },
  { id: 2, cemetery: "Rose Hills Memorial Park", city: "Whittier", type: "Single Plot", section: "Sunshine Terrace", spaces: 1 },
  { id: 3, cemetery: "Rose Hills Memorial Park", city: "Whittier", type: "Niche", section: "Memory Lane", spaces: 1 },
  { id: 4, cemetery: "Forest Lawn Memorial Park", city: "Glendale", type: "Single Plot", section: "Murmuring Trees", spaces: 1 },
  { id: 5, cemetery: "Forest Lawn Memorial Park", city: "Glendale", type: "Double Plot", section: "Vesperland", spaces: 2 },
  { id: 6, cemetery: "Forest Lawn Memorial Park", city: "Glendale", type: "Crypt", section: "Great Mausoleum", spaces: 1 },
  { id: 7, cemetery: "Pacific View Memorial Park", city: "Corona del Mar", type: "Niche", section: "Sunset Terrace", spaces: 1 },
  { id: 8, cemetery: "Pacific View Memorial Park", city: "Corona del Mar", type: "Double Plot", section: "Ocean View Garden", spaces: 2 },
  { id: 9, cemetery: "Green Hills Memorial Park", city: "Rancho Palos Verdes", type: "Double Plot", section: "Hillside", spaces: 2 },
  { id: 10, cemetery: "Green Hills Memorial Park", city: "Rancho Palos Verdes", type: "Single Plot", section: "Panorama", spaces: 1 },
  { id: 11, cemetery: "El Camino Memorial Park", city: "San Diego", type: "Crypt", section: "Sunrise Corridor", spaces: 2 },
  { id: 12, cemetery: "El Camino Memorial Park", city: "San Diego", type: "Single Plot", section: "Vista Garden", spaces: 1 },
  { id: 13, cemetery: "El Camino Memorial Park", city: "San Diego", type: "Niche", section: "Columbarium", spaces: 1 },
  { id: 14, cemetery: "Holy Cross Cemetery", city: "Culver City", type: "Double Plot", section: "Our Lady of Grace", spaces: 2 },
  { id: 15, cemetery: "Holy Cross Cemetery", city: "Culver City", type: "Single Plot", section: "Sacred Heart", spaces: 1 },
  { id: 16, cemetery: "Inglewood Park Cemetery", city: "Inglewood", type: "Niche", section: "Mausoleum of Light", spaces: 1 },
  { id: 17, cemetery: "Inglewood Park Cemetery", city: "Inglewood", type: "Single Plot", section: "Acacia Slope", spaces: 1 },
  { id: 18, cemetery: "Mountain View Cemetery", city: "Altadena", type: "Single Plot", section: "Garden View", spaces: 1 },
  { id: 19, cemetery: "Mountain View Cemetery", city: "Altadena", type: "Double Plot", section: "Summit Lawn", spaces: 2 },
  { id: 20, cemetery: "Harbor Lawn-Mt. Olive Memorial Park", city: "Costa Mesa", type: "Single Plot", section: "Tranquility", spaces: 1 },
  { id: 21, cemetery: "Riverside National Cemetery", city: "Riverside", type: "Single Plot", section: "Section 42", spaces: 1 },
  { id: 22, cemetery: "Eternal Hills Memorial Park", city: "Oceanside", type: "Double Plot", section: "Hillside Terrace", spaces: 2 },
  { id: 23, cemetery: "Eternal Hills Memorial Park", city: "Oceanside", type: "Niche", section: "Columbarium Garden", spaces: 1 },
  { id: 24, cemetery: "Forest Lawn Memorial Park", city: "Glendale", type: "Niche", section: "Freedom Mausoleum", spaces: 1 },
];

const types = ["All", "Single Plot", "Double Plot", "Niche", "Crypt"];

const Listings = () => {
  const [searchParams] = useSearchParams();
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");

  const cemeteryNames = useMemo(() => [...new Set(listings.map(l => l.cemetery))].sort(), []);

  const filtered = useMemo(() => {
    let result = listings;
    if (typeFilter !== "All") result = result.filter(l => l.type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.cemetery.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.section.toLowerCase().includes(q)
      );
    }
    return result;
  }, [typeFilter, searchQuery]);

  const getImage = (cemetery: string) =>
    cemeteryImages[cemetery] || "/images/cemetery-default.jpg";

  return (
    <div className="min-h-screen bg-background flex flex-col [&>footer]:mt-auto">
      <Navbar />

      {/* Hero banner */}
      <section className="relative pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <img src="/images/cemetery-default.jpg" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-hero" />
        </div>
        <div className="relative container mx-auto px-6 pt-8 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <p className="text-primary font-medium text-sm tracking-wide mb-3">Browse Properties</p>
            <h1 className="font-display text-4xl md:text-5xl text-foreground mb-4">
              Available listings
            </h1>
            <p className="text-muted-foreground text-lg font-light">
              Cemetery plots, niches, and crypts across Southern California — all below market price. Contact us for pricing.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container mx-auto px-6">
          {/* Search & Filters */}
          <div className="sticky top-[72px] z-30 bg-background/95 backdrop-blur-sm py-4 -mx-6 px-6 border-b border-border mb-6">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by cemetery, city, or section..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                {types.map(t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      typeFilter === t
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground hover:text-foreground border border-border"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-5">
            Showing {filtered.length} {filtered.length === 1 ? "property" : "properties"}
            {searchQuery && <> for "<span className="text-foreground font-medium">{searchQuery}</span>"</>}
          </p>

          {/* Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((listing, i) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.03, 0.3) }}
                className="bg-card rounded-2xl overflow-hidden shadow-soft hover:shadow-hover transition-all duration-300 group cursor-pointer"
              >
                <div className="h-40 overflow-hidden">
                  <img
                    src={getImage(listing.cemetery)}
                    alt={listing.cemetery}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {listing.type}
                    </span>
                    <span className="text-xs text-muted-foreground">{listing.spaces} {listing.spaces > 1 ? "spaces" : "space"}</span>
                  </div>
                  <h3 className="font-display text-lg text-foreground mb-1">{listing.cemetery}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                    <MapPin className="w-3.5 h-3.5" /> {listing.city}, CA
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">Section: {listing.section}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-primary font-medium">Contact for pricing</span>
                    <div className="inline-flex items-center gap-1 text-primary font-medium text-sm group-hover:gap-2 transition-all">
                      Inquire
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-2">No properties found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-12 bg-gradient-sage rounded-2xl p-8 text-center"
          >
            <h3 className="font-display text-2xl text-foreground mb-2">Don't see what you're looking for?</h3>
            <p className="text-muted-foreground mb-5">We have new listings coming in daily. Tell us what you need and we'll find it.</p>
            <a
              href="tel:+15551234567"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              Call us — (555) 123-4567
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Listings;
