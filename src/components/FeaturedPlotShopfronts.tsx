import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
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

interface FeaturedPlot { id: string; cemetery: string; city: string; plot_type: string; section: string; spaces: number; }

const backgrounds = [sageBackground, blushBackground, midnightBackground, verdantBackground, clayBackground, terracottaBackground];

const cleanText = (value: string) => value.trim().replace(/\s+/g, " ").replace(/\bLot\/Space\s*/gi, "");
const propertyLabel = (value: string) => {
  if (/^burial plot/i.test(value)) return "Burial plots";
  if (/crypt.*mausoleum/i.test(value)) return "Mausoleum crypts";
  if (/double depth lc/i.test(value)) return "Double-depth lawn crypt";
  return cleanText(value) || "Cemetery property";
};

const Shopfront = ({ listing, index }: { listing: FeaturedPlot; index: number }) => (
  <Link to={`/buy?cemetery=${encodeURIComponent(listing.cemetery)}`} className={`plot-shop plot-shop-${index % 6} group`} aria-label={`Inquire about ${listing.cemetery}, ${listing.section || propertyLabel(listing.plot_type)}`}>
    <img src={backgrounds[index % backgrounds.length].url} alt="" loading="lazy" width={646} height={846} className="plot-shop-background" />
    <div className="plot-shop-content">
      <p className="plot-shop-location">{listing.city ? `${cleanText(listing.city)}, Texas` : "Texas"}</p>
      <h3 className="plot-shop-name font-display">{cleanText(listing.cemetery)}</h3>
      <div className="plot-shop-rule" aria-hidden="true" />
      <p className="plot-shop-type">{propertyLabel(listing.plot_type)}</p>
      {listing.spaces > 0 && <p className="plot-shop-count font-display">{listing.spaces}<span>{listing.spaces === 1 ? "space" : "spaces"}</span></p>}
      <p className="plot-shop-section">{cleanText(listing.section) || "Location details on request"}</p>
      <span className="plot-shop-inquire">Inquire <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></span>
    </div>
  </Link>
);

export default function FeaturedPlotShopfronts() {
  const [listings, setListings] = useState<FeaturedPlot[]>([]);
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const visible = useInView(ref, { amount: 0.2 });
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
  const currentPage = pageCount ? page % pageCount : 0;
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase.rpc("get_public_featured_plots");
      if (mounted && !error) setListings(data || []);
    };
    void load();
    return () => { mounted = false; };
  }, []);
  useEffect(() => { setPage(0); }, [pageSize]);
  useEffect(() => {
    if (pageCount <= 1 || paused || interacting || !visible || reducedMotion) return;
    const timer = window.setInterval(() => { if (!document.hidden) setPage(value => (value + 1) % pageCount); }, 8500);
    return () => window.clearInterval(timer);
  }, [pageCount, paused, interacting, visible, reducedMotion]);
  if (!listings.length) return null;
  const shown = listings.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const move = (direction: number) => setPage((currentPage + direction + pageCount) % pageCount);
  return (
    <section ref={ref} aria-labelledby="featured-plots-heading" className="plot-shopfronts py-8 sm:py-10"
      onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
      <div className="mx-auto max-w-[1536px] px-6 sm:px-10 lg:px-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
          <div>
            <p className="text-[11px] uppercase text-primary mb-1">Private resale · Across Texas</p>
            <h2 id="featured-plots-heading" className="font-display text-3xl sm:text-4xl leading-tight text-foreground">Featured properties<span className="text-primary">.</span></h2>
          </div>
          <Button asChild variant="link" className="shrink-0 self-start sm:self-auto px-0"><Link to="/buy">Find your place <ArrowRight /></Link></Button>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`${pageSize}-${currentPage}`} initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.25 }} className={`grid gap-4 lg:gap-5 ${pageSize === 3 ? "grid-cols-3" : pageSize === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {shown.map((listing, index) => <Shopfront key={listing.id} listing={listing} index={currentPage * pageSize + index} />)}
          </motion.div>
        </AnimatePresence>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">Privately owned. Personally guided. <span className="text-foreground">Pricing on request.</span></p>
          {pageCount > 1 && <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground tabular-nums mr-1">{currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, listings.length)} of {listings.length}</span>
            <Button variant="outline" size="icon" aria-label="Previous featured plots" title="Previous featured plots" onClick={() => move(-1)}><ArrowLeft /></Button>
            {!reducedMotion && <Button variant="ghost" size="icon" aria-label={paused ? "Play featured plots" : "Pause featured plots"} title={paused ? "Play rotation" : "Pause rotation"} onClick={() => setPaused(value => !value)}>{paused ? <Play /> : <Pause />}</Button>}
            <Button variant="outline" size="icon" aria-label="Next featured plots" title="Next featured plots" onClick={() => move(1)}><ArrowRight /></Button>
          </div>}
        </div>
      </div>
    </section>
  );
}
