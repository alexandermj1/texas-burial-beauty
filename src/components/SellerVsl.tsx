import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, Clock3, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import sellerVslVideo from "@/assets/sell/tcb-seller-vsl-v4.mp4.asset.json";
import sellerVslCover from "@/assets/sell/tcb-seller-vsl-v4-cover.jpg.asset.json";

const videoTitle = "How Texas Cemetery Brokers sells your cemetery property";

interface SellerVslProps {
  ctaHref?: string;
  embedded?: boolean;
}

const SellerVsl = ({ ctaHref = "#quote-form", embedded = false }: SellerVslProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  const playVideo = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.ended) video.currentTime = 0;
    try {
      await video.play();
    } catch {
      setHasStarted(false);
    }
  };

  return (
    <section
      id="seller-vsl"
      aria-labelledby="seller-vsl-title"
      className={cn("relative overflow-hidden border-y border-foreground/15 bg-[hsl(var(--warm-white))] py-7 md:py-24", embedded && "bg-transparent md:py-10")}
    >
      <div className={cn("container mx-auto px-5 md:px-6", embedded && "w-full max-w-none px-0 md:px-0")}>
        <div className="mx-auto max-w-7xl">
          <div className={cn("mb-5 grid gap-6 md:mb-12 md:grid-cols-12 md:items-end", embedded && "md:mb-7")}>
            <div className="md:col-span-8">
              <div className="mb-3 flex items-center gap-4 md:mb-5">
                <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-accent">Watch the film</span>
                <span className="h-px w-12 bg-foreground/25" />
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-foreground/55">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> 2 min 39 sec
                </span>
              </div>
              <h2 id="seller-vsl-title" className={cn("max-w-4xl font-display text-3xl leading-tight text-foreground md:text-6xl lg:text-7xl", embedded && "md:text-4xl lg:text-4xl")}>
                A listing isn’t a sale.
                <span className="block italic text-primary">See how we work differently.</span>
              </h2>
            </div>
            <p className="hidden max-w-md text-base leading-relaxed text-foreground/70 md:block md:col-span-4 md:justify-self-end">
              From mortuary relationships and buyer inquiries to the documents prepared before a sale — see what we handle, and the few steps that remain yours.
            </p>
          </div>

          <motion.figure
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative"
          >
            <div className="rounded-2xl border border-foreground/20 bg-[hsl(var(--sand-light))] p-2 shadow-hover md:p-3">
              <div className="relative aspect-video overflow-hidden rounded-xl bg-primary">
                <video
                  ref={videoRef}
                  src={sellerVslVideo.url}
                  poster={sellerVslCover.url}
                  controls={hasStarted}
                  playsInline
                  preload="metadata"
                  title={videoTitle}
                  aria-label={`${videoTitle}, 2 minutes 39 seconds`}
                  aria-describedby="seller-vsl-summary"
                  onPlay={() => setHasStarted(true)}
                  onEnded={() => setHasStarted(false)}
                  className="h-full w-full object-cover"
                >
                  Your browser does not support this video. The video summary below explains how Texas Cemetery Brokers handles marketing, paperwork, buyer inquiries and closing coordination for sellers.
                </video>

                {!hasStarted && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={playVideo}
                    aria-label={`Play video: ${videoTitle}, 2 minutes 39 seconds`}
                    className="group absolute inset-0 h-full w-full overflow-hidden rounded-none p-0 text-left whitespace-normal focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <img
                      src={sellerVslCover.url}
                      alt="Texas Cemetery Brokers video cover reading “A listing isn’t a sale,” over a classified-listings page with a cemetery plot listing"
                      className="absolute inset-0 h-full w-full object-cover"
                      width={1920}
                      height={1080}
                    />
                    <span className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-foreground/75 via-foreground/20 to-transparent" aria-hidden="true" />
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-3 rounded-full bg-[hsl(var(--warm-white))] py-2 pl-2 pr-4 text-foreground shadow-soft transition-transform duration-300 group-hover:scale-[1.02] md:bottom-7 md:left-7 md:gap-4 md:py-2.5 md:pl-2.5 md:pr-7">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground md:h-12 md:w-12">
                        <Play className="ml-0.5 h-4 w-4 fill-current md:h-5 md:w-5" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold md:text-base"><span className="sm:hidden">Play our film</span><span className="hidden sm:inline">Watch how selling with us works</span></span>
                        <span className="mt-0.5 hidden text-[10px] uppercase tracking-[0.2em] text-foreground/55 sm:block">Play the film · 2 min 39 sec</span>
                      </span>
                    </span>
                  </Button>
                )}
              </div>
            </div>

            <p id="seller-vsl-summary" className="sr-only">
              An animated overview explaining why cemetery property can sit unsold on classified listing sites, how Texas Cemetery Brokers works with mortuaries and cemetery counselors, prepares required documents in advance, handles buyer inquiries and transfer coordination, and leaves offer approval with the seller. It also explains that listing packages start at $299 and a separate 15 percent seller commission applies at closing.
            </p>

            <figcaption className="mt-6 grid gap-5 border-t border-foreground/15 pt-5 md:grid-cols-[1fr_auto] md:items-center">
              <ul className="grid gap-3 text-sm text-foreground/70 sm:grid-cols-3 sm:gap-5" aria-label="What the video covers">
                {["Mortuary and cemetery coordination", "Documents prepared in advance", "You approve every offer"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <a href={ctaHref} className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline md:justify-self-end">
                Start your free valuation <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </figcaption>
          </motion.figure>
        </div>
      </div>
    </section>
  );
};

export default SellerVsl;
