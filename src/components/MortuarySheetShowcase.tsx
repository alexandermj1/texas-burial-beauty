import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { SAMPLE_SHEET_URL, SAMPLE_SHEET_WEB_URL } from "@/lib/buildListingOptionsBlock";
import hibiscusCoral from "@/assets/flowers/hibiscus-coral.png.asset.json";
import bayerWhite from "@/assets/bayer-logo-white.png.asset.json";
import grounds1 from "@/assets/cemeteries/cemetery-grounds-1.jpg.asset.json";
import grounds2 from "@/assets/cemeteries/cemetery-grounds-2.jpg.asset.json";

const featured = [
  {
    photo: grounds1.url,
    location: "Dallas · Restland",
    name: "Restland Memorial Park",
    line: "Garden of the Cross · Lot 214, Spaces 3 & 4 · Dallas, TX",
    desc:
      "Two companion lawn spaces on a level rise near the Garden of the Cross fountain, shaded in the afternoon. Mature grounds, immediate transfer, no interment rights outstanding.",
    cemeteryPrice: "$21,800",
    price: "$13,950",
    saves: "FAMILY SAVES $7,850",
    meta: [
      { k: "Type", v: "Two adjacent plots" },
      { k: "Vaults", v: "Included" },
      { k: "Broker", v: "Direct line · ext. 2" },
      { k: "Ref.", v: "TCB-1042" },
    ],
  },
  {
    photo: grounds2.url,
    location: "Houston · Forest Park",
    name: "Forest Park Westheimer",
    line: "Section 411, Memorial Gardens · Lot 387, Spaces 5 & 6 · Houston, TX",
    desc:
      "Side-by-side spaces in one of Westheimer's established garden sections, a short walk from the chapel and visitor parking. Suited to a family holding one space and planning for a second.",
    cemeteryPrice: "$33,990",
    price: "$22,500",
    saves: "FAMILY SAVES $11,490",
    meta: [
      { k: "Type", v: "Two adjacent plots" },
      { k: "Vaults", v: "Buyer's option" },
      { k: "Broker", v: "Direct line · ext. 4" },
      { k: "Ref.", v: "TCB-1078" },
    ],
  },
];

const schedule = [
  ["Hillcrest Memorial Park", "Dallas", "Garden of Prayer · Lot 118, Sp. 2", "Single plot", "$16,995", "$11,400"],
  ["Laurel Land Memorial Park", "Dallas", "Sec. 7 · Lot 96, Sp. 1–2", "Two plots", "$14,600", "$9,200"],
  ["Bluebonnet Hills Mem. Park", "Fort Worth", "Mausoleum · Tier C, Crypt 214", "Companion crypt", "$28,400", "$18,900"],
  ["Greenwood Memorial Park", "Fort Worth", "Sec. 22 · Lot 41, Sp. 3", "Single plot", "$12,750", "$8,500"],
  ["Memorial Oaks Cemetery", "Houston", "Garden of Faith · Lot 42B", "Single plot", "$18,200", "$11,750"],
  ["Brookside Memorial Park", "Houston", "Azalea Terrace · Lot 66, Sp. 5–6", "Two plots", "$33,990", "$23,400"],
  ["Cook-Walden Capital Parks", "Austin", "Colonnade · Lvl 4, Niche 405", "Double niche", "$8,900", "$5,400"],
  ["Sunset Memorial Park", "San Antonio", "Sec. 216A · Lot 2088, Crypts A–B", "Two lawn crypts", "$19,400", "$12,900"],
  ["Woodlawn Garden of Memories", "Houston", "Sec. 9 · Lot 208, Sp. 1–2", "Two plots", "$15,400", "$9,950"],
];

const points = [
  "Sent every fortnight to funeral homes, mortuaries and family counselors statewide",
  "Featured listings open the sheet with photography and a direct broker line",
  "Pro and Starter listings appear in the standard property schedule",
  "Buyers come pre-qualified through the professional handling their arrangements",
];

/**
 * The mortuary "Available Property List" — the real sheet rendered directly
 * on the page (photography, logo, featured cards, standard schedule).
 */
const MortuarySheetShowcase = () => {
  return (
    <section className="relative py-24 md:py-32 bg-[hsl(var(--sand-light))] overflow-hidden border-t border-foreground/10">
      <div className="container mx-auto px-6">
        {/* Intro copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-10 items-end mb-12"
        >
          <div className="lg:col-span-7">
            <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-accent mb-4">What sets us apart</p>
            <h2 className="font-display text-4xl md:text-5xl text-foreground leading-[1.05] tracking-tight">
              Your plot, on the desk of the people <span className="italic text-primary">families turn to first.</span>
            </h2>
            <p className="text-foreground/70 leading-relaxed mt-6 text-[15px] max-w-xl">
              Every fortnight we publish a verified Available Property List and send it directly to funeral directors,
              mortuaries and family counselors across Texas — the professionals sitting with a family at the exact
              moment a plot is needed. This is the sheet they receive.
            </p>
          </div>
          <div className="lg:col-span-5">
            <ul className="space-y-2.5">
              {points.map((line) => (
                <li key={line} className="flex gap-3 text-[14px] text-foreground/75 leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* THE SHEET */}
        <motion.div
          initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, delay: 0.05 }}
          className="max-w-5xl mx-auto rounded-2xl overflow-hidden border border-foreground/15 bg-[hsl(var(--warm-white))] shadow-hover"
        >
          <div className="h-1.5 bg-foreground" />

          {/* Masthead */}
          <div className="flex items-center justify-between gap-6 px-6 md:px-10 py-6 flex-wrap">
            <div className="flex items-center gap-4">
              <img src={hibiscusCoral.url} alt="" aria-hidden className="w-11 h-11 object-contain" />
              <div>
                <p className="font-display text-2xl md:text-3xl text-foreground leading-none">Texas Cemetery Brokers</p>
                <p className="text-[9.5px] tracking-[0.28em] uppercase font-bold text-accent mt-2">
                  Available Property List · August 2026
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-right">
                <p className="text-[10px] tracking-[0.22em] uppercase font-bold text-foreground/70">Sample sheet</p>
                <p className="text-[11px] text-foreground/45 mt-1">Not live inventory</p>
              </div>
              <span className="px-5 py-3 rounded bg-primary text-primary-foreground text-[12px] tracking-[0.28em] uppercase font-bold">
                Example
              </span>
            </div>
          </div>

          {/* Prepared-for bar */}
          <div className="flex justify-between gap-8 flex-wrap px-6 md:px-10 py-5 bg-[hsl(var(--sand-light))] border-y border-foreground/10">
            <p className="text-[13px] text-foreground/70 leading-relaxed max-w-xl">
              Prepared for our partner funeral homes and mortuaries. Every property below is verified, deed-clear and
              transfer-ready. Prices shown are net to the family — we handle the cemetery paperwork.
            </p>
            <div className="text-right text-[13px] text-foreground/70 leading-relaxed">
              <p>(214) 230-4740</p>
              <p>info@texascemeterybrokers.com</p>
            </div>
          </div>

          {/* Featured */}
          <div className="px-6 md:px-10 pt-8">
            <div className="flex items-center gap-4 mb-2">
              <h3 className="font-display text-xl text-foreground">Featured Properties</h3>
              <span className="text-[9.5px] tracking-[0.28em] uppercase font-bold text-accent">Priority placement</span>
              <span className="h-px flex-1 bg-foreground/15" />
            </div>
            <p className="text-[13px] text-foreground/60 leading-relaxed mb-6 max-w-2xl">
              Featured listings open the list with photography, an expanded description, a named broker and a direct
              line for the family. Every other property appears in the standard schedule below.
            </p>

            <div className="space-y-5">
              {featured.map((f) => (
                <article
                  key={f.name}
                  className="grid md:grid-cols-[220px,1fr] gap-0 rounded-xl border border-foreground/15 bg-[hsl(var(--warm-white))] overflow-hidden shadow-soft"
                >
                  <img
                    src={f.photo}
                    alt={`${f.name} grounds`}
                    loading="lazy"
                    className="w-full h-44 md:h-full object-cover"
                  />
                  <div className="p-5 md:p-6">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] tracking-[0.24em] uppercase font-bold px-2 py-1 rounded bg-foreground text-[hsl(var(--warm-white))]">
                          Featured
                        </span>
                        <span className="text-[9.5px] tracking-[0.24em] uppercase font-bold text-foreground/50">
                          {f.location}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-[11.5px] text-foreground/45 line-through">Cemetery price {f.cemeteryPrice}</p>
                        <p className="font-display text-3xl text-foreground leading-tight">{f.price}</p>
                        <span className="inline-block mt-1.5 text-[9.5px] tracking-[0.16em] uppercase font-bold text-secondary-foreground bg-secondary px-2 py-1 rounded">
                          {f.saves}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-display text-2xl text-foreground mt-3 leading-tight">{f.name}</h4>
                    <p className="text-[13px] text-foreground/60 mt-1">{f.line}</p>
                    <p className="text-[13.5px] text-foreground/75 leading-relaxed mt-3">{f.desc}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-foreground/10">
                      {f.meta.map((m) => (
                        <div key={m.k}>
                          <p className="text-[9px] tracking-[0.22em] uppercase font-bold text-accent">{m.k}</p>
                          <p className="text-[12.5px] text-foreground/80 mt-1">{m.v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Standard schedule */}
          <div className="px-6 md:px-10 py-8">
            <div className="flex items-center gap-4 mb-4">
              <h3 className="font-display text-xl text-foreground">Standard Schedule</h3>
              <span className="hidden sm:inline text-[9.5px] tracking-[0.24em] uppercase font-bold text-foreground/45">
                Dallas · Fort Worth · Houston · Austin · San Antonio
              </span>
              <span className="h-px flex-1 bg-foreground/15" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="border-b border-foreground/20">
                    {["Cemetery", "City", "Section · Lot · Space", "Property", "Cemetery", "Our price"].map((h, i) => (
                      <th
                        key={h}
                        className={`py-2 text-[9px] tracking-[0.22em] uppercase font-bold text-foreground/45 ${i > 3 ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((r) => (
                    <tr key={r[0] + r[2]} className="border-b border-foreground/10">
                      <td className="py-2.5 pr-4 text-[13px] text-foreground">{r[0]}</td>
                      <td className="py-2.5 pr-4 text-[13px] text-foreground/60">{r[1]}</td>
                      <td className="py-2.5 pr-4 text-[13px] text-foreground/60">{r[2]}</td>
                      <td className="py-2.5 pr-4 text-[13px] text-foreground/60">{r[3]}</td>
                      <td className="py-2.5 pr-4 text-[12.5px] text-foreground/40 line-through text-right whitespace-nowrap">{r[4]}</td>
                      <td className="py-2.5 text-[13px] font-semibold text-foreground text-right whitespace-nowrap">{r[5]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between gap-4 mt-4 text-[11px] tracking-[0.1em] text-foreground/45">
              <span>Page 1 of 4 · 47 properties available statewide</span>
              <span className="tracking-[0.24em] uppercase">Continued</span>
            </div>
          </div>

          {/* Sheet footer */}
          <div className="flex items-center justify-between gap-6 flex-wrap px-6 md:px-10 py-6 bg-[hsl(var(--sand-light))] border-t border-foreground/10">
            <div>
              <p className="text-[13px] text-foreground/80">
                Texas Cemetery Brokers · (214) 230-4740 · texascemeterybrokers.com
              </p>
              <p className="text-[11px] text-foreground/45 mt-1 max-w-xl leading-relaxed">
                Prices subject to availability. Cemetery transfer fees quoted at the time of offer. Example document —
                not a current inventory list.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[9px] tracking-[0.24em] uppercase font-bold text-foreground/45">In partnership with</span>
              <span className="inline-flex items-center justify-center px-3 py-2 rounded bg-foreground">
                <img src={bayerWhite.url} alt="Bayer Cemetery Brokers" className="h-5 w-auto object-contain" />
              </span>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="max-w-5xl mx-auto mt-8 flex flex-wrap items-center gap-3">
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
      </div>
    </section>
  );
};

export default MortuarySheetShowcase;
