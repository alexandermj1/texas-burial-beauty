import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import sageBackground from "@/assets/plumeria-sage-tall.png.asset.json";
import blushBackground from "@/assets/plumeria-blush-tall.png.asset.json";
import midnightBackground from "@/assets/plumeria-midnight-tall.png.asset.json";
import verdantBackground from "@/assets/plumeria-verdant-tall.png.asset.json";
import clayBackground from "@/assets/plumeria-clay-tall.png.asset.json";
import terracottaBackground from "@/assets/plumeria-terracotta-tall.png.asset.json";

interface FeaturedPlot { id: string; cemetery: string; city: string; plot_type: string; section: string; spaces: number; retail_low?: number | null; retail_high?: number | null; resale_low?: number | null; resale_high?: number | null; }

const priceRange = (low: number, high: number) => {
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  return low === 0 ? `Under ${money.format(high)}` : `${money.format(low)}–${money.format(high)}`;
};

const backgrounds = [sageBackground, blushBackground, midnightBackground, verdantBackground, clayBackground, terracottaBackground];
const shuffle = <T,>(items: T[]) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = result[i]; const b = result[j];
    if (a !== undefined && b !== undefined) { result[i] = b; result[j] = a; }
  }
  return result;
};

const cleanText = (value: string) => value.trim().replace(/\s+/g, " ").replace(/\bLot\/Space\s*/gi, "");
const cemeteryLabel = (value: string) => cleanText(value).replace(/ Funeral Home & Cemetery$/i, "").replace(/\//g, " / ");
const propertyLabel = (value: string) => {
  if (/^burial plot/i.test(value)) return "Burial plots";
  if (/crypt.*mausoleum/i.test(value)) return "Mausoleum crypts";
  if (/double depth lc/i.test(value)) return "Double-depth lawn crypt";
  return cleanText(value) || "Cemetery property";
};

const Shopfront = ({ listing, index }: { listing: FeaturedPlot; index: number }) => (
  <Link data-listing-id={listing.id} to={`/buy?cemetery=${encodeURIComponent(listing.cemetery)}`} className={`plot-shop plot-shop-${index % 6} group`} aria-label={`Inquire about ${listing.cemetery}, ${listing.section || propertyLabel(listing.plot_type)}`}>
    <div className="plot-shop-art">
    <img src={backgrounds[index % backgrounds.length].url} alt="" loading="lazy" width={646} height={846} className="plot-shop-background" />
    <div className="plot-shop-content">
      <p className="plot-shop-location">{listing.city ? `${cleanText(listing.city)}, Texas` : "Texas"}</p>
      <h3 className="plot-shop-name font-display">{cemeteryLabel(listing.cemetery)}</h3>
      <div className="plot-shop-rule" aria-hidden="true" />
      <p className="plot-shop-type">{propertyLabel(listing.plot_type)}</p>
      {listing.spaces > 0 && <p className="plot-shop-count font-display">{listing.spaces}<span>{listing.spaces === 1 ? "space" : "spaces"}</span></p>}
      <p className="plot-shop-section">{cleanText(listing.section) || "Location details on request"}</p>
      <span className="plot-shop-inquire">Inquire <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></span>
    </div>
    </div>
    <div className="plot-shop-price">
      {listing.retail_low != null && listing.retail_high != null && listing.resale_low != null && listing.resale_high != null ? <>
        <div><span>Approx. retail / space</span><p>{priceRange(listing.retail_low, listing.retail_high)}</p></div>
        <div className="plot-shop-resale"><span>Approx. resale / space</span><p className="font-display">{priceRange(listing.resale_low, listing.resale_high)}</p></div>
      </> : <p className="plot-shop-price-pending">Price guidance on inquiry</p>}
    </div>
  </Link>
);

export default function FeaturedPlotShopfronts() {
  const [listings, setListings] = useState<FeaturedPlot[]>([]);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const reducedMotion = useReducedMotion();
  const mobile = useIsMobile();
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 1200px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1200px)");
    const update = () => setWide(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const pageSize = mobile ? 1 : wide ? 3 : 2;
  const pageCount = Math.ceil(listings.length / pageSize);
  const currentPage = listings.length ? page % listings.length : 0;
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(entries => setVisible(entries.some(entry => entry.isIntersecting)), { threshold: 0.1 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [listings.length]);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase.rpc("get_public_featured_plot_ranges");
      if (mounted && !error) setListings(shuffle(data || []));
    };
    void load();
    return () => { mounted = false; };
  }, []);
  useEffect(() => { setPage(0); }, [pageSize]);
  useEffect(() => {
    if (pageCount <= 1 || paused || interacting || !visible) return;
    const timer = window.setInterval(() => { if (!document.hidden) setPage(value => value + 1); }, 9000);
    return () => window.clearInterval(timer);
  }, [pageCount, paused, interacting, visible, reducedMotion]);
  if (!listings.length) return null;
  const shown = Array.from({ length: Math.min(pageSize, listings.length) }, (_, index) => listings[(currentPage * pageSize + index) % listings.length]).filter((listing): listing is FeaturedPlot => listing !== undefined);
  const move = (direction: number) => setPage(value => (value + direction + listings.length) % listings.length);
  return (
    <section ref={ref} aria-labelledby="featured-plots-heading" className="plot-shopfronts py-8 sm:py-10">
      <div className="mx-auto max-w-[1536px] px-6 sm:px-10 lg:px-16">
        <div className="plot-featured-canopy">
          <div className="plot-featured-sign">
            <p>Private resale · Across Texas</p>
            <h2 id="featured-plots-heading" className="font-display">Featured properties</h2>
          </div>
          <div className="plot-featured-awning" aria-hidden="true">
            <div className="plot-featured-awning-roof" />
            <div className="plot-featured-awning-valance">
              {Array.from({ length: 28 }, (_, index) => <span key={index} />)}
            </div>
          </div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`${pageSize}-${currentPage}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -6 }} transition={{ duration: reducedMotion ? 0 : 0.45, ease: "easeOut" }} onFocusCapture={() => setInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }} className={`grid gap-4 lg:gap-5 ${pageSize === 3 ? "grid-cols-3" : pageSize === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {shown.map((listing, index) => (
              <motion.div key={listing.id} initial={{ opacity: 0, y: reducedMotion ? 0 : 28 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reducedMotion ? 0 : 0.12 + index * 0.16, duration: reducedMotion ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}>
                <Shopfront listing={listing} index={currentPage * pageSize + index} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground max-w-md">Approximate ranges for a separately purchased space; resale includes recorded transfer fees and buyer charges. Buying together may cost less per space. Final pricing and availability confirmed on inquiry.</p>
          <Button asChild variant="link" className="px-0"><Link to="/buy">Find your place <ArrowRight /></Link></Button>
          {pageCount > 1 && <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" aria-label="Previous featured plots" title="Previous featured plots" onClick={() => move(-1)}><ArrowLeft /></Button>
            <Button variant="ghost" size="icon" aria-label={paused ? "Play featured plots" : "Pause featured plots"} title={paused ? "Play rotation" : "Pause rotation"} onClick={() => setPaused(value => !value)}>{paused ? <Play /> : <Pause />}</Button>
            <Button variant="outline" size="icon" aria-label="Next featured plots" title="Next featured plots" onClick={() => move(1)}><ArrowRight /></Button>
          </div>}
        </div>
      </div>
    </section>
  );
}
