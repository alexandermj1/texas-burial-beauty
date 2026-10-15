import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import botanicalArch from "@/assets/featured-botanical-arch.png";

interface FeaturedPlot { id: string; cemetery: string; city: string; plot_type: string; section: string; spaces: number; }

const Shopfront = ({ listing, index }: { listing: FeaturedPlot; index: number }) => (
  <Link to={`/buy?cemetery=${encodeURIComponent(listing.cemetery)}`} className={`plot-shop plot-shop-${index % 6} group`}>
    <div className="plot-shop-sign">
      <p className="text-[10px] uppercase mb-1">Available in {listing.city || "Texas"}</p>
      <h3 className="font-display text-xl leading-tight">{listing.cemetery}</h3>
    </div>
    <div className="plot-shop-awning" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <span key={i} />)}</div>
    <div className="plot-shop-window" aria-hidden="true">
      <div className="plot-shop-arch" />
      <img src={botanicalArch} alt="" loading="lazy" width={1024} height={1024} className="plot-shop-botanicals" />
      <div className="plot-shop-ticket">
        <span className="block text-[10px] uppercase text-primary mb-2">A place to remember</span>
        <span className="block font-display text-2xl leading-tight">{listing.spaces > 0 ? `${listing.spaces} ${listing.spaces === 1 ? "space" : "spaces"}` : "Explore this property"}</span>
        <span className="block text-xs text-muted-foreground mt-2">Private resale · Texas</span>
      </div>
    </div>
    <div className="plot-shop-details">
      <p className="font-display text-xl italic text-foreground">{listing.plot_type || "Cemetery property"} · {listing.spaces > 0 ? `${listing.spaces} ${listing.spaces === 1 ? "space" : "spaces"}` : "Ask for details"}</p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2 min-h-[2.5rem]">{listing.section || "Ask us about the location and availability."}</p>
      <div className="flex items-center justify-between gap-3 border-t border-border mt-3 pt-3 text-xs">
        <span className="text-muted-foreground">Personal pricing on request</span>
        <span className="inline-flex items-center gap-1 text-primary shrink-0">Inquire <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" /></span>
      </div>
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
  const pageSize = mobile ? 1 : 6;
  const pageCount = Math.ceil(listings.length / pageSize);
  const currentPage = pageCount ? page % pageCount : 0;
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase.from("listings").select("id, cemetery, city, plot_type, section, spaces")
        .is("deleted_at", null).eq("status", "active").order("created_at", { ascending: false });
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
    <section ref={ref} aria-labelledby="featured-plots-heading" className="plot-shopfronts py-16 sm:py-20"
      onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
      <div className="mx-auto max-w-[1536px] px-6 sm:px-10 lg:px-16">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-9">
          <div><p className="text-[11px] uppercase text-primary mb-3">Available now · Texas</p>
            <h2 id="featured-plots-heading" className="font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-foreground">Featured <span className="italic text-primary">near you.</span></h2></div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 lg:max-w-lg">
            <p className="text-sm text-muted-foreground leading-relaxed">A selection of privately owned cemetery properties, with our team by your side.</p>
            <Button asChild className="shrink-0 self-start sm:self-auto"><Link to="/cemeteries">Explore cemeteries <ArrowRight /></Link></Button>
          </div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`${pageSize}-${currentPage}`} initial={{ opacity: 0, y: reducedMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.25 }} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
            {shown.map((listing, index) => <Shopfront key={listing.id} listing={listing} index={currentPage * pageSize + index} />)}
          </motion.div>
        </AnimatePresence>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 mt-8 pt-5 border-t border-border">
          <p className="text-sm text-muted-foreground">Planning ahead? <span className="text-foreground">24 months at 0% interest</span> for pre-need families.</p>
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
