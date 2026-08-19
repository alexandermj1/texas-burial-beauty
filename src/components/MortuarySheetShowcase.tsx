import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { SAMPLE_SHEET_URL, SAMPLE_SHEET_WEB_URL } from "@/lib/buildListingOptionsBlock";
import hibiscusCoral from "@/assets/flowers/hibiscus-coral.png.asset.json";
import bayerNavy from "@/assets/bayer-logo-navy.png.asset.json";
import sheetPhoto1 from "@/assets/sheet/sheet-featured-1.webp.asset.json";
import sheetPhoto2 from "@/assets/sheet/sheet-featured-2.webp.asset.json";

const featured = [
  {
    photo: sheetPhoto1.url,
    location: "Dallas · Restland",
    name: "Restland Memorial Park",
    line: "Garden of the Cross · Lot 214, Spaces 3 & 4 · Dallas, TX",
    desc:
      "Two companion lawn spaces on a level rise near the Garden of the Cross fountain, shaded in the afternoon. Immediate transfer, no interment rights outstanding.",
    cemeteryPrice: "$21,800",
    price: "$13,950",
    saves: "Family saves $7,850",
  },
  {
    photo: sheetPhoto2.url,
    location: "Houston · Forest Park",
    name: "Forest Park Westheimer",
    line: "Section 411, Memorial Gardens · Lot 387, Spaces 5 & 6 · Houston, TX",
    desc:
      "Side-by-side spaces in one of Westheimer's established garden sections, a short walk from the chapel and visitor parking.",
    cemeteryPrice: "$33,990",
    price: "$22,500",
    saves: "Family saves $11,490",
  },
];

const schedule = [
  ["Hillcrest Memorial Park", "Dallas", "Single plot", "$16,995", "$11,400"],
  ["Bluebonnet Hills Mem. Park", "Fort Worth", "Companion crypt", "$28,400", "$18,900"],
  ["Memorial Oaks Cemetery", "Houston", "Single plot", "$18,200", "$11,750"],
  ["Cook-Walden Capital Parks", "Austin", "Double niche", "$8,900", "$5,400"],
  ["Sunset Memorial Park", "San Antonio", "Two lawn crypts", "$19,400", "$12,900"],
];

const points = [
  "Sent every fortnight to funeral homes, mortuaries and family counselors statewide",
  "Featured listings open the sheet with photography and a direct broker line",
  "Pro and Starter listings appear in the standard property schedule",
  "Buyers come pre-qualified through the professional handling their arrangements",
];

/**
 * The mortuary "Available Property List" — the real sheet shown beside the
 * explanation: copy on one side, a compact replica of the sheet on the other.
 */
const MortuarySheetShowcase = () => {
  return (
    <section className="relative py-24 md:py-32 bg-[hsl(var(--sand-light))] overflow-hidden border-t border-foreground/10">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Explanation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }}
            className="lg:col-span-5"
          >
            <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-accent mb-4">What sets us apart</p>
            <h2 className="font-display text-4xl md:text-[2.75rem] text-foreground leading-[1.05] tracking-tight">
              Your plot, on the desk of the people{" "}
              <span className="italic text-primary">families turn to first.</span>
            </h2>
            <p className="text-foreground/70 leading-relaxed mt-6 text-[15px]">
              Every fortnight we publish a verified Available Property List and send it directly to funeral directors,
              mortuaries and family counselors across Texas — the professionals sitting with a family at the exact
              moment a plot is needed. This is the sheet they receive.
            </p>

            <ul className="space-y-2.5 mt-7">
              {points.map((line) => (
                <li key={line} className="flex gap-3 text-[14px] text-foreground/75 leading-relaxed">
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

          {/* THE SHEET */}
          <motion.div
            initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay: 0.05 }}
            className="lg:col-span-7 relative rounded-2xl overflow-hidden border border-foreground/15 bg-[hsl(var(--warm-white))] shadow-hover"
          >
            {/* EXAMPLE watermark */}
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <span
                className="font-display text-[clamp(3.5rem,9vw,7rem)] tracking-[0.14em] whitespace-nowrap"
                style={{ transform: "rotate(-24deg)", color: "hsl(var(--primary) / 0.12)" }}
              >
                EXAMPLE
              </span>
            </div>

            <div className="h-1.5 bg-foreground" />

            {/* Masthead */}
            <div className="flex items-center justify-between gap-4 px-5 md:px-7 py-4 flex-wrap">
              <div className="flex items-center gap-3">
                <img src={hibiscusCoral.url} alt="" aria-hidden className="w-9 h-9 object-contain" />
                <div>
                  <p className="font-display text-xl md:text-2xl text-foreground leading-none">Texas Cemetery Brokers</p>
                  <p className="text-[8.5px] tracking-[0.28em] uppercase font-bold text-accent mt-1.5">
                    Available Property List · Sample sheet
                  </p>
                </div>
              </div>
              <span className="px-3.5 py-2 rounded bg-primary text-primary-foreground text-[10px] tracking-[0.28em] uppercase font-bold">
                Example
              </span>
            </div>

            {/* Prepared-for bar */}
            <div className="flex justify-between gap-6 flex-wrap px-5 md:px-7 py-3 bg-[hsl(var(--sand-light))] border-y border-foreground/10">
              <p className="text-[11.5px] text-foreground/65 leading-relaxed max-w-sm">
                Prepared for our partner funeral homes and mortuaries. Every property is verified, deed-clear and
                transfer-ready.
              </p>
              <div className="text-right text-[11.5px] text-foreground/65 leading-relaxed">
                <p>(214) 230-4740</p>
                <p>info@texascemeterybrokers.com</p>
              </div>
            </div>

            {/* Featured */}
            <div className="px-5 md:px-7 pt-5">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-display text-base text-foreground">Featured Properties</h3>
                <span className="text-[8.5px] tracking-[0.28em] uppercase font-bold text-accent">Priority placement</span>
                <span className="h-px flex-1 bg-foreground/15" />
              </div>

              <div className="space-y-3">
                {featured.map((f) => (
                  <article
                    key={f.name}
                    className="grid sm:grid-cols-[150px,1fr] rounded-xl border border-foreground/15 bg-[hsl(var(--warm-white))] overflow-hidden shadow-soft"
                  >
                    <img
                      src={f.photo}
                      alt={`${f.name} grounds`}
                      loading="lazy"
                      className="w-full h-28 sm:h-full object-cover"
                    />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] tracking-[0.24em] uppercase font-bold px-2 py-1 rounded bg-foreground text-[hsl(var(--warm-white))]">
                            Featured
                          </span>
                          <span className="text-[8.5px] tracking-[0.22em] uppercase font-bold text-foreground/50">
                            {f.location}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-foreground/45 line-through">Cemetery {f.cemeteryPrice}</p>
                          <p className="font-display text-xl text-foreground leading-tight">{f.price}</p>
                        </div>
                      </div>

                      <h4 className="font-display text-lg text-foreground mt-2 leading-tight">{f.name}</h4>
                      <p className="text-[11px] text-foreground/55 mt-0.5">{f.line}</p>
                      <p className="text-[12px] text-foreground/70 leading-relaxed mt-2">{f.desc}</p>
                      <span className="inline-block mt-2.5 text-[9px] tracking-[0.14em] uppercase font-bold text-secondary-foreground bg-secondary px-2 py-1 rounded-full">
                        {f.saves}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* Standard schedule */}
            <div className="px-5 md:px-7 py-5">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-display text-base text-foreground">Standard Schedule</h3>
                <span className="h-px flex-1 bg-foreground/15" />
              </div>

              <table className="w-full border-collapse">
                <tbody>
                  {schedule.map((r) => (
                    <tr key={r[0]} className="border-b border-foreground/10">
                      <td className="py-2 pr-3 text-[12px] text-foreground">
                        {r[0]}
                        <span className="text-foreground/50"> · {r[1]}</span>
                        <span className="block text-[10px] text-foreground/45">{r[2]}</span>
                      </td>
                      <td className="py-2 pr-3 text-[11px] text-foreground/40 line-through text-right whitespace-nowrap">{r[3]}</td>
                      <td className="py-2 text-[12px] font-semibold text-foreground text-right whitespace-nowrap">{r[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-3 text-[10.5px] tracking-[0.08em] text-foreground/45">
                Page 1 of 4 · 47 properties available statewide
              </p>
            </div>

            {/* Sheet footer */}
            <div className="flex items-center justify-between gap-4 flex-wrap px-5 md:px-7 py-4 bg-[hsl(var(--sand-light))] border-t border-foreground/10">
              <p className="text-[11px] text-foreground/55 leading-relaxed max-w-xs">
                Example document — not a current inventory list. Prices subject to availability.
              </p>
              <div className="flex items-center gap-3">
                <span className="text-[8.5px] tracking-[0.24em] uppercase font-bold text-foreground/45">
                  In partnership with
                </span>
                <img src={bayerNavy.url} alt="Bayer Cemetery Brokers" className="h-4 w-auto object-contain opacity-80" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MortuarySheetShowcase;
