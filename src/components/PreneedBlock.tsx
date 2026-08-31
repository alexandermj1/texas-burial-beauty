import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, PiggyBank, Footprints } from "lucide-react";
import { PriceAppreciationChart } from "@/components/guides/PreneedSavingsGraphics";

const PRENEED_PATH = "/preneed-cemetery-plots-texas";

const points = [
  {
    Icon: PiggyBank,
    t: "Around 40% below cemetery retail",
    d: "Planning ahead means you can wait for the right resale space instead of taking the first price offered in the days after a death.",
  },
  {
    Icon: CalendarClock,
    t: "24 months at 0% interest",
    d: "Spread the cost over two years with no interest and no finance charges — the price is locked the day you reserve it.",
  },
  {
    Icon: Footprints,
    t: "Walked, not clicked",
    d: "We meet you at the cemetery and show you the exact space in person before you commit to anything.",
  },
];

/**
 * Pre-need block reused across the buyer guide, the cost guide and the home page.
 * `variant` only changes the surrounding chrome — the argument and the chart stay the same.
 */
const PreneedBlock = ({
  variant = "guide",
  id = "preneed",
  eyebrow = "Planning ahead",
  heading,
}: {
  variant?: "guide" | "home";
  id?: string;
  eyebrow?: string;
  heading?: React.ReactNode;
}) => {
  const title = heading ?? (
    <>
      Buying pre-need is the cheapest cemetery property will ever be
    </>
  );

  const body = (
    <>
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-accent font-semibold mb-4">{eyebrow}</p>
        <h2 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-tight text-foreground mb-5 leading-[1.05]">
          {title}
        </h2>
        <p className="text-lg text-foreground/80 leading-relaxed mb-4">
          Cemetery retail prices have historically doubled roughly every seven years, and they are never lower than they
          are today. Buying pre-need — before anyone needs it — is the one decision that takes that increase off the table
          entirely: you lock a resale price that already sits well below the cemetery's own price list, and the years of
          increases that follow happen without you.
        </p>
        <p className="text-lg text-foreground/80 leading-relaxed">
          It also spares your family the hardest version of this purchase: choosing a resting place, and a price, in the
          first 48 hours after a loss.
        </p>
      </div>

      <div className="mt-10">
        <PriceAppreciationChart />
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-8">
        {points.map(({ Icon, t, d }) => (
          <motion.div
            key={t}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="p-6 rounded-2xl bg-card border border-border/60 hover:border-primary/30 transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Icon className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <h3 className="font-display text-lg text-foreground mb-2 leading-snug">{t}</h3>
            <p className="text-sm text-foreground/70 leading-relaxed">{d}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-start gap-3 mt-8">
        <Link
          to={PRENEED_PATH}
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-accent text-accent-foreground rounded-2xl font-medium text-[15px] shadow-[0_10px_28px_-8px_hsl(var(--accent)/0.55)] hover:-translate-y-0.5 transition-all"
        >
          Read the pre-need guide <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/contact#buy-inquiry"
          className="inline-flex items-center gap-2 px-7 py-3.5 bg-background/80 backdrop-blur border border-border rounded-2xl font-medium text-[15px] text-foreground hover:bg-muted/50 transition-all"
        >
          Ask about 0% financing
        </Link>
      </div>
    </>
  );

  if (variant === "home") {
    return (
      <section id={id} className="relative py-16 sm:py-24 scroll-mt-24 overflow-hidden bg-gradient-warm">
        <div className="container mx-auto px-6 max-w-5xl">{body}</div>
      </section>
    );
  }

  return (
    <section id={id} className="py-12 md:py-16 scroll-mt-24 not-prose">
      {body}
    </section>
  );
};

export default PreneedBlock;
