import { motion } from "framer-motion";
import { ArrowUpRight, Camera, Phone, BadgeCheck } from "lucide-react";
import { SAMPLE_SHEET_URL, SAMPLE_SHEET_WEB_URL } from "@/lib/buildListingOptionsBlock";

const standardRows = [
  { name: "Restland Memorial Park", city: "Dallas", detail: "Sec. 12 · Lot 208, Sp. 1", type: "Single plot", price: "$11,400" },
  { name: "Bluebonnet Hills Memorial Park", city: "Fort Worth", detail: "Mausoleum · Tier C, Crypt 214", type: "Companion crypt", price: "$18,900" },
  { name: "Memorial Oaks Cemetery", city: "Houston", detail: "Garden of Faith · Lot 42B", type: "Single plot", price: "$11,750" },
  { name: "Cook–Walden Capital Parks", city: "Austin", detail: "Garden of Peace · Lot 88, Sp. 2", type: "Single plot", price: "$9,600" },
  { name: "Sunset Memorial Park", city: "San Antonio", detail: "Niche · Wall B, Row 4", type: "Companion niche", price: "$6,250" },
];

const points = [
  "Sent every fortnight to funeral homes, mortuaries and family counselors statewide",
  "Featured listings open the sheet with photography and a direct broker line",
  "Pro and Starter listings appear in the standard property schedule",
  "Buyers come pre-qualified through the professional handling their arrangements",
];

/**
 * The mortuary "Available Property List" — rendered directly on the page
 * (not a PDF) so sellers can see exactly what funeral homes receive.
 */
const MortuarySheetShowcase = () => {
  return (
    <section className="relative py-24 md:py-32 bg-[hsl(var(--sand-light))] overflow-hidden border-t border-foreground/10">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }}
            className="lg:col-span-5"
          >
            <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-accent mb-4">What sets us apart</p>
            <h2 className="font-display text-4xl md:text-5xl text-foreground leading-[1.05] tracking-tight">
              Your plot, on the desk of the people <span className="italic text-primary">families turn to first.</span>
            </h2>
            <p className="text-foreground/70 leading-relaxed mt-6 text-[15px]">
              Most resale sites post your property online and wait. We don't. Every fortnight we publish a verified
              Available Property List and send it directly to funeral directors, mortuaries and family counselors
              across Texas — the professionals sitting with a family at the exact moment a plot is needed.
            </p>
            <p className="text-foreground/70 leading-relaxed mt-4 text-[15px]">
              These are industry relationships built over years, not advertising. They put your property in front of
              the small number of families who genuinely need it.
            </p>
            <ul className="mt-8 space-y-3">
              {points.map((line) => (
                <li key={line} className="flex gap-3 text-[15px] text-foreground/80 leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={SAMPLE_SHEET_WEB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all shadow-soft"
              >
                Open the full sheet <ArrowUpRight className="w-4 h-4" />
              </a>
              <a
                href={SAMPLE_SHEET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full border border-foreground/20 text-foreground/80 text-sm font-medium hover:border-primary hover:text-primary transition-all"
              >
                Download PDF
              </a>
            </div>
          </motion.div>

          {/* The sheet, rendered on the page */}
          <motion.div
            initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-7"
          >
            <div className="rounded-2xl overflow-hidden border border-foreground/15 bg-[hsl(var(--warm-white))] shadow-hover">
              <div className="h-1.5 bg-foreground" />

              {/* Sheet masthead */}
              <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-foreground/10 bg-[hsl(var(--warm-white))]">
                <div>
                  <p className="font-display text-lg text-foreground leading-tight">Texas Cemetery Brokers</p>
                  <p className="text-[9px] tracking-[0.26em] uppercase font-bold text-accent mt-1">
                    Available Property List · sent to Texas mortuaries
                  </p>
                </div>
                <span className="text-[9px] tracking-[0.24em] uppercase font-bold px-2.5 py-1.5 rounded bg-primary/15 text-primary shrink-0">
                  Sample
                </span>
              </div>

              {/* Featured block */}
              <div className="px-6 pt-6">
                <div className="flex items-baseline gap-3 mb-3">
                  <p className="font-display text-base text-foreground">Featured Properties</p>
                  <span className="text-[9px] tracking-[0.26em] uppercase font-bold text-primary">Priority placement</span>
                </div>

                <div className="rounded-xl border border-foreground/15 bg-[hsl(var(--sand-light))] p-5">
                  <span className="inline-block text-[9px] tracking-[0.24em] uppercase font-bold px-2 py-1 rounded bg-foreground text-[hsl(var(--warm-white))]">
                    Featured
                  </span>
                  <p className="font-display text-2xl text-foreground mt-3 leading-tight">Restland Memorial Park</p>
                  <p className="text-[13px] text-foreground/60 mt-1">Dallas · Garden of Memories · Lot 118, Spaces 1–2</p>
                  <p className="text-[14px] text-foreground/75 leading-relaxed mt-3">
                    Level, shaded double plot near the Garden of Memories fountain. Deed verified, transfer paperwork
                    prepared, endowment care current. Immediate availability.
                  </p>
                  <div className="flex flex-wrap gap-4 mt-4 text-[12px] text-foreground/60">
                    <span className="inline-flex items-center gap-1.5"><Camera className="w-3.5 h-3.5 text-primary" /> Photography included</span>
                    <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-primary" /> Direct broker line</span>
                    <span className="inline-flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-primary" /> Deed-clear</span>
                  </div>
                  <p className="font-display text-3xl text-foreground mt-4">
                    $12,900 <span className="font-sans text-[12px] font-normal text-foreground/55">per space · transfer-ready</span>
                  </p>
                </div>
              </div>

              {/* Standard schedule */}
              <div className="px-6 py-6">
                <p className="font-display text-base text-foreground mb-3">Standard Schedule</p>
                <div className="divide-y divide-foreground/10 border-t border-foreground/10">
                  {standardRows.map((r) => (
                    <div key={r.name} className="flex items-start justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">
                          {r.name} <span className="text-foreground/50 font-normal">· {r.city}</span>
                        </p>
                        <p className="text-[11.5px] text-foreground/55 mt-0.5">{r.detail} · {r.type}</p>
                      </div>
                      <p className="text-[13px] font-semibold text-foreground whitespace-nowrap">{r.price}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-foreground/45 mt-4">
                  Illustrative edition — properties shown are examples, not live inventory. Prices and availability
                  change with each publication.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MortuarySheetShowcase;
