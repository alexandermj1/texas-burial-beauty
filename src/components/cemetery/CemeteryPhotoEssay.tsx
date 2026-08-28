import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera } from "lucide-react";
import type { CemeteryPhotoEssay as Essay } from "@/data/cemeteryPhotos";

/**
 * Magazine-style photo essay for a cemetery page.
 * Editorial mosaic: one full-bleed opener, then an asymmetric grid — Vogue-ish
 * proportions, generous type, click-to-enlarge lightbox. Every image carries
 * descriptive alt text and a figcaption for image search.
 */
const CemeteryPhotoEssay = ({ essay, cemeteryName }: { essay: Essay; cemeteryName: string }) => {
  const [open, setOpen] = useState<number | null>(null);
  const [lead, ...rest] = essay.photos;

  const frame =
    "group relative overflow-hidden rounded-[26px] border border-border/70 bg-card cursor-zoom-in";
  const img =
    "w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]";

  const Caption = ({ kicker, caption }: { kicker?: string; caption: string }) => (
    <figcaption className="absolute inset-x-0 bottom-0 p-4 md:p-6 bg-gradient-to-t from-foreground/90 via-foreground/45 to-transparent">
      {kicker && (
        <span className="block text-[10px] tracking-[0.3em] uppercase text-background/75 mb-1.5">{kicker}</span>
      )}
      <span className="block text-background text-sm md:text-[15px] leading-snug max-w-2xl">{caption}</span>
    </figcaption>
  );

  return (
    <section id="grounds" className="py-14 md:py-24 scroll-mt-32">
      <div className="container mx-auto px-6">
        {/* Masthead */}
        <div className="max-w-4xl mb-10 md:mb-14">
          <div className="flex items-center gap-4 mb-5">
            <span className="text-[11px] tracking-[0.32em] uppercase text-primary font-medium shrink-0">
              {essay.eyebrow}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <h2 className="font-display text-4xl md:text-[58px] leading-[1.02] text-foreground mb-6">
            {essay.heading}
          </h2>
          <p className="text-muted-foreground text-base md:text-[17px] leading-[1.75] md:columns-2 md:gap-10 [&]:first-letter:text-5xl [&]:first-letter:font-display [&]:first-letter:float-left [&]:first-letter:leading-[0.85] [&]:first-letter:mr-2 [&]:first-letter:mt-1 [&]:first-letter:text-primary">
            {essay.standfirst}
          </p>
          <p className="mt-6 inline-flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-muted-foreground">
            <Camera className="w-3.5 h-3.5 text-primary" /> {essay.credit}
          </p>
        </div>

        {/* Opener */}
        {lead && (
          <motion.figure
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className={`${frame} h-[300px] md:h-[560px] mb-4 md:mb-5`}
            onClick={() => setOpen(0)}
          >
            <img
              src={lead.src}
              alt={lead.alt}
              width={1600}
              height={1200}
              loading="lazy"
              className={img}
            />
            <Caption kicker={lead.kicker} caption={lead.caption} />
          </motion.figure>
        )}

        {/* Asymmetric editorial grid */}
        <div className="grid md:grid-cols-6 gap-4 md:gap-5">
          {rest.map((p, i) => {
            // Rhythm: 3 / 3 / 2 / 2 / 2 / 4 / 2 ... repeating for a magazine feel.
            const spans = ["md:col-span-3", "md:col-span-3", "md:col-span-2", "md:col-span-2", "md:col-span-2", "md:col-span-4", "md:col-span-2"];
            const heights = ["h-[240px] md:h-[400px]", "h-[240px] md:h-[400px]", "h-[220px] md:h-[300px]", "h-[220px] md:h-[300px]", "h-[220px] md:h-[300px]", "h-[240px] md:h-[380px]", "h-[240px] md:h-[380px]"];
            return (
              <motion.figure
                key={p.src}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: (i % 3) * 0.06 }}
                className={`${frame} ${spans[i % spans.length]} ${heights[i % heights.length]}`}
                onClick={() => setOpen(i + 1)}
              >
                <img src={p.src} alt={p.alt} width={1600} height={1200} loading="lazy" className={img} />
                <Caption kicker={p.kicker} caption={p.caption} />
              </motion.figure>
            );
          })}
        </div>

        <p className="mt-6 text-xs text-muted-foreground max-w-3xl">
          Original photography of {cemeteryName}. Tap any frame to enlarge.
        </p>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {open !== null && essay.photos[open] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-foreground/92 backdrop-blur-sm flex items-center justify-center p-4 md:p-10"
            onClick={() => setOpen(null)}
            role="dialog"
            aria-modal="true"
            aria-label={essay.photos[open].caption}
          >
            <button
              type="button"
              className="absolute top-5 right-5 text-background/80 hover:text-background"
              aria-label="Close photo"
              onClick={() => setOpen(null)}
            >
              <X className="w-7 h-7" />
            </button>
            <figure className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
              <img
                src={essay.photos[open].src}
                alt={essay.photos[open].alt}
                className="w-full max-h-[78vh] object-contain rounded-2xl"
              />
              <figcaption className="mt-4 text-background/85 text-sm text-center">
                {essay.photos[open].caption}
              </figcaption>
            </figure>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default CemeteryPhotoEssay;
