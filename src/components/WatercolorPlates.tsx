import { motion } from "framer-motion";

export type WatercolorPlate = {
  src: string;
  caption: string;
  note?: string;
};

type Props = {
  eyebrow: string;
  title: React.ReactNode;
  items: WatercolorPlate[];
  tone?: "sand" | "white";
  className?: string;
};

/* Editorial plate row — framed watercolor illustrations with serif
   captions, in the style of a printed magazine plate section. */
const WatercolorPlates = ({ eyebrow, title, items, tone = "white", className = "" }: Props) => (
  <section
    className={`py-20 md:py-28 border-t border-foreground/10 ${
      tone === "sand" ? "bg-[hsl(var(--sand-light))]" : "bg-[hsl(var(--warm-white))]"
    } ${className}`}
  >
    <div className="container mx-auto px-6">
      <div className="max-w-7xl mx-auto">
        <div className="border-b border-foreground/15 pb-4 mb-12 flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase font-bold text-accent mb-3">{eyebrow}</p>
            <h2 className="font-display text-3xl md:text-5xl text-foreground tracking-tight leading-[1.02] max-w-2xl">
              {title}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
          {items.map((item, i) => (
            <motion.figure
              key={item.caption}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
              className="group"
            >
              {/* Double-rule frame, like a plate in a printed book */}
              <div className="border border-foreground/25 p-1.5 bg-[hsl(var(--warm-white))]">
                <div className="border border-foreground/15 p-3 md:p-4">
                  <img
                    src={item.src}
                    alt={item.caption}
                    loading="lazy"
                    width={1024}
                    height={1024}
                    className="w-full aspect-square object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                </div>
              </div>
              <figcaption className="mt-4 flex items-baseline gap-3">
                <span className="font-mono text-[10px] text-foreground/50 tabular-nums shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-display italic text-base md:text-lg text-foreground leading-snug">
                    {item.caption}
                  </p>
                  {item.note && (
                    <p className="text-[10px] tracking-[0.25em] uppercase font-bold text-foreground/50 mt-1.5">
                      {item.note}
                    </p>
                  )}
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default WatercolorPlates;
