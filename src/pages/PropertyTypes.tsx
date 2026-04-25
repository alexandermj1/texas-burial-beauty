import { useRef, useMemo } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { Phone, Mail, ArrowRight, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import singlePlotImg from "@/assets/property-types/single-plot.png";
import companionPlotImg from "@/assets/property-types/companion-plot.png";
import lawnCryptImg from "@/assets/property-types/lawn-crypt.png";
import mausoleumImg from "@/assets/property-types/mausoleum.png";
import cremationNicheImg from "@/assets/property-types/cremation-niche.png";
import familyEstateImg from "@/assets/property-types/family-estate.png";
import veteransGardenImg from "@/assets/property-types/veterans-garden.png";

/* ─── Data ────────────────────────────────────────────────────── */

const propertyTypes = [
  { id: "single-plot", title: "Single Burial Plot", subtitle: "The Traditional Choice", image: singlePlotImg, description: "The most common type of cemetery property — space for one casket burial with a flat bronze or granite marker flush with the ground.", features: ["Most affordable traditional burial option", "Wide availability across all Texas cemeteries", "Flat markers maintain a park-like setting", "Can often accommodate 1–2 cremation urns"], stat: { value: "1", unit: "Casket", detail: "Flat Bronze Marker" }, pullQuote: "The most popular choice for Texas families." },
  { id: "companion-plot", title: "Companion Plot", subtitle: "Together Forever", image: companionPlotImg, description: "Two side-by-side spaces for couples or family. Matching markers create a unified, elegant memorial tribute.", features: ["Perfect for couples and family members", "Often purchased at a bundled discount", "Matching markers for a unified tribute", "Some allow double-depth (stacked) interment"], stat: { value: "2", unit: "Caskets", detail: "Side-by-Side Layout" }, pullQuote: "A unified tribute for those who shared a lifetime together." },
  { id: "lawn-crypt", title: "Lawn Crypt", subtitle: "Superior Protection", image: lawnCryptImg, description: "A pre-installed concrete vault in the ground. Double-depth options allow two burials stacked vertically — ideal for couples.", features: ["Pre-installed concrete vault included", "Superior protection from soil and weather", "Double-depth option saves space and cost", "Clean, manicured lawn appearance"], stat: { value: "1–2", unit: "Caskets", detail: "Pre-Installed Vault" }, pullQuote: "Engineered for permanence." },
  { id: "mausoleum-crypt", title: "Mausoleum Crypt", subtitle: "Elegant Entombment", image: mausoleumImg, description: "Above-ground entombment in elegant structures. Single, tandem, or companion crypts in indoor or outdoor settings.", features: ["Elegant above-ground entombment", "Climate-protected indoor options", "No ground maintenance required", "Architecturally significant buildings"], stat: { value: "1–2", unit: "Entombments", detail: "Indoor / Outdoor" }, pullQuote: "Architecture that honours a life beautifully lived." },
  { id: "cremation-niche", title: "Cremation Niche", subtitle: "A Personal Memorial", image: cremationNicheImg, description: "Columbarium compartments for one or two urns. Glass, granite, or marble fronts allow personal mementos to be displayed.", features: ["Most affordable permanent memorial option", "Glass-front niches allow personal mementos", "Interior niches offer climate protection", "Available in single or double capacity"], stat: { value: "1–2", unit: "Urns", detail: "Glass · Granite Fronts" }, pullQuote: "An intimate, personal space for remembrance." },
  { id: "family-estate", title: "Family Estate", subtitle: "A Legacy Preserved", image: familyEstateImg, description: "Larger properties with an upright monument centrepiece. The most prestigious option — a dedicated space for generations.", features: ["Accommodates multiple generations", "Prominent upright monument included", "Premium scenic locations", "Highly sought-after, limited supply"], stat: { value: "4–8+", unit: "Burials", detail: "Upright Granite Monument" }, pullQuote: "Where family legacies are carved in stone." },
  { id: "veterans-garden", title: "Veterans Garden", subtitle: "Honouring Service", image: veteransGardenImg, description: "Dedicated memorial park sections for those who served. Dignified resting places with military honours and stunning views.", features: ["Sections exclusively for veterans", "Scenic ocean and mountain views", "Military marker and flag options", "Among the most beautiful sections"], stat: { value: "★", unit: "Military", detail: "Ocean & Mountain Views" }, pullQuote: "For those who gave everything, the most beautiful resting places." },
];

/* ─── Helpers ──────────────────────────────────────────────────── */

function useParallax(target: React.RefObject<HTMLElement>, range: [number, number]) {
  const { scrollYProgress } = useScroll({ target, offset: ["start end", "end start"] });
  return useTransform(scrollYProgress, [0, 1], range);
}

/* ─── Floating botanical leaves (aesthetic accent) ─────────────── */

const FloatingLeaf = ({ delay, x, size, rotate }: { delay: number; x: string; size: number; rotate: number }) => (
  <motion.div
    className="absolute pointer-events-none select-none"
    style={{ left: x, top: "-20px" }}
    initial={{ y: -40, opacity: 0, rotate: rotate - 20 }}
    whileInView={{ y: 80, opacity: [0, 0.15, 0.15, 0], rotate: rotate + 20 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 4, delay, ease: "easeInOut" }}
  >
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path d="M20 2C20 2 8 12 8 24C8 32 13 38 20 38C27 38 32 32 32 24C32 12 20 2 20 2Z" fill="currentColor" className="text-primary/20" />
      <path d="M20 8V34" stroke="currentColor" strokeWidth="0.5" className="text-primary/30" />
    </svg>
  </motion.div>
);

const FloatingLeaves = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <FloatingLeaf delay={0} x="10%" size={28} rotate={-15} />
    <FloatingLeaf delay={0.5} x="30%" size={22} rotate={10} />
    <FloatingLeaf delay={1} x="65%" size={32} rotate={-25} />
    <FloatingLeaf delay={1.5} x="85%" size={24} rotate={5} />
  </div>
);

/* ─── Waving flag for Veterans section ──────────────────────────── */

/* WavingFlag removed */

/* ─── Cascading honour ribbons for Veterans ────────────────────── */

const HonourRibbons = () => {
  const ribbons = [
    { x: "8%", delay: 0, color: "bg-accent/15", width: 3, height: 120 },
    { x: "15%", delay: 0.4, color: "bg-primary/12", width: 2, height: 100 },
    { x: "82%", delay: 0.2, color: "bg-accent/12", width: 3, height: 130 },
    { x: "90%", delay: 0.6, color: "bg-primary/10", width: 2, height: 90 },
    { x: "25%", delay: 0.8, color: "bg-accent/8", width: 2, height: 80 },
    { x: "75%", delay: 1.0, color: "bg-primary/8", width: 2, height: 85 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {ribbons.map((r, i) => (
        <motion.div
          key={i}
          className={`absolute ${r.color} rounded-full`}
          style={{ left: r.x, width: r.width, height: r.height, top: -r.height }}
          initial={{ y: 0, opacity: 0 }}
          whileInView={{ y: r.height + 200, opacity: [0, 0.8, 0.8, 0] }}
          viewport={{ once: true }}
          transition={{ duration: 3, delay: r.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
};

/* ─── Mausoleum architectural accents ──────────────────────────── */

const ArchitecturalColumns = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Decorative expanding rings */}
    {[200, 300, 400].map((size, i) => (
      <motion.div
        key={`ring-${i}`}
        className="absolute rounded-full border border-primary/[0.06]"
        style={{ width: size, height: size, left: "50%", top: "45%", marginLeft: -size / 2, marginTop: -size / 2 }}
        initial={{ opacity: 0, scale: 0.7 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, delay: 0.2 * i, ease: "easeOut" }}
      />
    ))}
    {/* Architectural column lines — left */}
    <motion.div
      className="absolute left-[8%] md:left-[12%] top-[15%] bottom-[15%] w-px"
      initial={{ scaleY: 0, opacity: 0 }}
      whileInView={{ scaleY: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.5, delay: 0.3 }}
      style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--primary) / 0.12), transparent)", transformOrigin: "top" }}
    />
    <motion.div
      className="absolute left-[10%] md:left-[14%] top-[18%] bottom-[18%] w-px"
      initial={{ scaleY: 0, opacity: 0 }}
      whileInView={{ scaleY: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.5, delay: 0.5 }}
      style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--primary) / 0.08), transparent)", transformOrigin: "top" }}
    />
    {/* Right columns */}
    <motion.div
      className="absolute right-[8%] md:right-[12%] top-[15%] bottom-[15%] w-px"
      initial={{ scaleY: 0, opacity: 0 }}
      whileInView={{ scaleY: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.5, delay: 0.4 }}
      style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--primary) / 0.12), transparent)", transformOrigin: "top" }}
    />
    <motion.div
      className="absolute right-[10%] md:right-[14%] top-[18%] bottom-[18%] w-px"
      initial={{ scaleY: 0, opacity: 0 }}
      whileInView={{ scaleY: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.5, delay: 0.6 }}
      style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--primary) / 0.08), transparent)", transformOrigin: "top" }}
    />
    {/* Horizontal entablature lines */}
    <motion.div
      className="absolute left-[8%] right-[8%] md:left-[12%] md:right-[12%] top-[14%] h-px"
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2, delay: 0.8 }}
      style={{ background: "linear-gradient(to right, transparent, hsl(var(--accent) / 0.15), transparent)" }}
    />
    <motion.div
      className="absolute left-[8%] right-[8%] md:left-[12%] md:right-[12%] bottom-[14%] h-px"
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1.2, delay: 1 }}
      style={{ background: "linear-gradient(to right, transparent, hsl(var(--accent) / 0.15), transparent)" }}
    />
  </div>
);

/* ─── Candle flicker for cremation section ─────────────────────── */

const CandleGlow = ({ position }: { position: "left" | "right" }) => (
  <motion.div
    className={`absolute ${position === "left" ? "left-8 md:left-16" : "right-8 md:right-16"} top-1/2 -translate-y-1/2 pointer-events-none`}
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    viewport={{ once: true }}
  >
    <motion.div
      className="w-1 h-8 bg-gradient-to-t from-accent/30 via-accent/50 to-transparent rounded-full mx-auto"
      animate={{ scaleY: [1, 1.15, 0.95, 1.1, 1], opacity: [0.5, 0.8, 0.6, 0.9, 0.5] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="w-6 h-6 rounded-full bg-accent/10 -mt-2 mx-auto"
      animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.25, 0.15] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      style={{ filter: "blur(4px)" }}
    />
  </motion.div>
);

/* ─── Heart connector for companion section ────────────────────── */

const HeartConnector = () => (
  <motion.div
    className="hidden md:flex absolute left-1/2 top-1/3 -translate-x-1/2 pointer-events-none z-10"
    initial={{ opacity: 0, scale: 0 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
  >
    <div className="relative">
      <svg width="28" height="26" viewBox="0 0 28 26" fill="none" className="text-accent/30">
        <path d="M14 26L2.1 13.4C-1.4 9.7-0.5 4.3 3.6 1.9C6.3 0.3 9.7 0.7 12 2.8L14 4.8L16 2.8C18.3 0.7 21.7 0.3 24.4 1.9C28.5 4.3 29.4 9.7 25.9 13.4L14 26Z" fill="currentColor" />
      </svg>
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0, 0.2] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ filter: "blur(8px)", background: "hsl(var(--accent) / 0.15)" }}
      />
    </div>
  </motion.div>
);

/* ─── Horizontal scroll strips ─────────────────────────────────── */

const ImageStrip = ({ direction = 1 }: { direction?: 1 | -1 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], [direction > 0 ? "8%" : "-8%", direction > 0 ? "-12%" : "12%"]);
  const images = [singlePlotImg, companionPlotImg, lawnCryptImg, mausoleumImg, cremationNicheImg, familyEstateImg, veteransGardenImg];
  return (
    <div ref={ref} className="overflow-hidden py-4">
      <motion.div style={{ x }} className="flex gap-10 px-8">
        {images.map((img, i) => (
          <img key={i} src={img} alt="" className="w-[100px] md:w-[140px] h-auto opacity-[0.12] select-none pointer-events-none grayscale" />
        ))}
      </motion.div>
    </div>
  );
};

/* ─── Pull quote ───────────────────────────────────────────────── */

const PullQuote = ({ text }: { text: string }) => (
  <motion.blockquote initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="border-l-2 border-primary/40 pl-5 py-1 my-5">
    <p className="font-display text-lg md:text-xl italic text-foreground/70 leading-relaxed">"{text}"</p>
  </motion.blockquote>
);

/* ─── Stat ribbon ──────────────────────────────────────────────── */

const StatRibbon = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-20%"]);
  const stats = [
    { label: "Single Plot", value: "1 Casket" }, { label: "Companion", value: "2 Side-by-Side" },
    { label: "Lawn Crypt", value: "1–2 Vaulted" }, { label: "Mausoleum", value: "Above Ground" },
    { label: "Cremation Niche", value: "1–2 Urns" }, { label: "Family Estate", value: "4–8+ Burials" },
    { label: "Veterans", value: "Military Honours" },
  ];
  return (
    <div ref={ref} className="overflow-hidden py-6 border-y border-border/30">
      <motion.div style={{ x }} className="flex gap-12 px-6 whitespace-nowrap">
        {[...stats, ...stats].map((s, i) => (
          <div key={i} className="flex items-baseline gap-2">
            <span className="font-display text-xl text-foreground/80">{s.value}</span>
            <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground/50">{s.label}</span>
            <span className="text-muted-foreground/20 mx-3">·</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

/* ─── Divider ──────────────────────────────────────────────────── */

const Divider = ({ label }: { label?: string }) => (
  <div className="container mx-auto px-6 max-w-7xl py-1">
    <div className="flex items-center gap-4">
      <div className="flex-1 h-px bg-border/30" />
      {label && <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground/40 font-medium">{label}</span>}
      <div className="flex-1 h-px bg-border/30" />
    </div>
  </div>
);

/* ─── Drop cap for editorial feel ──────────────────────────────── */

const DropCapText = ({ text }: { text: string }) => {
  const first = text.charAt(0);
  const rest = text.slice(1);
  return (
    <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-5 max-w-lg">
      <span className="font-display text-5xl float-left mr-2 mt-1 leading-[0.8] text-foreground/80">{first}</span>
      {rest}
    </p>
  );
};

/* ─── Section 1: Editorial spread with drop cap + floating leaves */

const Section1 = () => {
  const item = propertyTypes[0];
  const ref = useRef<HTMLDivElement>(null);
  const imgY = useParallax(ref, [60, -60]);
  const textY = useParallax(ref, [30, -30]);
  const numY = useParallax(ref, [100, -100]);

  return (
    <div ref={ref} className="relative py-8 md:py-12">
      <FloatingLeaves />
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          <motion.div style={{ y: imgY }} className="lg:col-span-5 relative flex justify-center">
            <motion.span style={{ y: numY }} className="absolute -top-4 -left-4 text-[10rem] md:text-[13rem] font-display font-bold text-foreground/[0.03] leading-none select-none pointer-events-none">01</motion.span>
            <motion.img src={item.image} alt={item.title} className="relative z-10 w-[280px] md:w-[380px] lg:w-[440px] h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.12)]" initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }} />
            <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="absolute bottom-2 right-4 z-20 bg-card/90 backdrop-blur-md border border-border/40 rounded-2xl px-4 py-2 shadow-hover">
              <p className="font-display text-xl text-foreground leading-none">{item.stat.value}</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">{item.stat.unit}</p>
            </motion.div>
          </motion.div>
          <motion.div style={{ y: textY }} className="lg:col-span-7 lg:pl-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px w-10 bg-primary" />
              <span className="text-primary text-xs tracking-[0.2em] uppercase font-medium">{item.subtitle}</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl lg:text-[2.8rem] text-foreground leading-tight mb-4">{item.title}</h2>
            <DropCapText text={item.description} />
            <div className="space-y-2 mb-5">
              {item.features.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.06 + i * 0.05 }} className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-2.5 h-2.5 text-primary" /></div>
                  <span className="text-sm text-muted-foreground">{f}</span>
                </motion.div>
              ))}
            </div>
            <p className="text-xs tracking-wider uppercase text-muted-foreground/50 border-t border-border/30 pt-3">{item.stat.detail}</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

/* ─── Section 2 & 3: Two-up with heart connector ──────────────── */

const Section2And3 = () => {
  const ref = useRef<HTMLDivElement>(null);
  const imgY1 = useParallax(ref, [40, -40]);
  const imgY2 = useParallax(ref, [60, -60]);
  const items = [propertyTypes[1], propertyTypes[2]];

  return (
    <div ref={ref} className="relative py-8 md:py-12" style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--terracotta-light)) 40%, hsl(var(--terracotta-light)) 60%, hsl(var(--background)) 100%)" }}>
      <HeartConnector />
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
          {items.map((item, idx) => (
            <div key={item.id} className="relative">
              <motion.div style={{ y: idx === 0 ? imgY1 : imgY2 }} className="flex justify-center mb-5">
                <span className="absolute -top-2 left-0 text-[8rem] md:text-[10rem] font-display font-bold text-foreground/[0.03] leading-none select-none pointer-events-none">{String(idx + 2).padStart(2, "0")}</span>
                <motion.img src={item.image} alt={item.title} className="relative z-10 w-[240px] md:w-[320px] lg:w-[380px] h-auto drop-shadow-[0_15px_40px_rgba(0,0,0,0.1)]" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: idx * 0.15 }} />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 + idx * 0.15 }}>
                <span className="text-primary text-[10px] tracking-[0.25em] uppercase font-medium">{item.subtitle}</span>
                <h3 className="font-display text-2xl md:text-3xl text-foreground leading-tight mt-1 mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{item.description}</p>
                <PullQuote text={item.pullQuote} />
                <div className="flex flex-wrap gap-2 mt-3">
                  {item.features.map((f, i) => (
                    <span key={i} className="text-[11px] px-3 py-1.5 rounded-full bg-card border border-accent/20 text-muted-foreground inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-accent/40" />{f}</span>
                  ))}
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Section 4: Mausoleum — cinematic with decorative rings ──── */

const Section4 = () => {
  const item = propertyTypes[3];
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgScale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.85, 1.05, 1.05, 0.95]);
  const textY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <div ref={ref} className="relative py-10 md:py-16" style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--sand-light)) 30%, hsl(var(--sand-light)) 70%, hsl(var(--background)) 100%)" }}>
      <ArchitecturalColumns />
      <div className="container mx-auto px-6 max-w-5xl">
        <motion.div style={{ scale: imgScale }} className="relative flex justify-center mb-7">
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[14rem] md:text-[18rem] font-display font-bold text-foreground/[0.02] leading-none select-none pointer-events-none">04</span>
          <motion.img src={item.image} alt={item.title} className="relative z-10 w-[260px] md:w-[380px] lg:w-[440px] h-auto drop-shadow-[0_25px_60px_rgba(0,0,0,0.15)]" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} />
          <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 }} className="absolute -bottom-2 right-1/4 z-20 bg-card/90 backdrop-blur-md border border-border/40 rounded-2xl px-5 py-2.5 shadow-hover">
            <p className="font-display text-2xl text-foreground leading-none">{item.stat.value}</p>
            <p className="text-muted-foreground text-xs mt-0.5">{item.stat.unit}</p>
          </motion.div>
        </motion.div>
        <motion.div style={{ y: textY }} className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-10 bg-primary" />
            <span className="text-primary text-xs tracking-[0.2em] uppercase font-medium">{item.subtitle}</span>
            <div className="h-px w-10 bg-primary" />
          </div>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-foreground leading-tight mb-4">{item.title}</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">{item.description}</p>
          <PullQuote text={item.pullQuote} />
          <div className="grid sm:grid-cols-2 gap-2.5 text-left max-w-lg mx-auto mt-4">
            {item.features.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.08 + i * 0.06 }} className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><Check className="w-2.5 h-2.5 text-primary" /></div>
                <span className="text-sm text-muted-foreground">{f}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

/* ─── Section 5: Cremation — candle glow accents ───────────────── */

const Section5 = () => {
  const item = propertyTypes[4];
  const ref = useRef<HTMLDivElement>(null);
  const imgY = useParallax(ref, [50, -50]);
  const textY = useParallax(ref, [20, -20]);

  return (
    <div ref={ref} className="relative py-8 md:py-12">
      <CandleGlow position="left" />
      <CandleGlow position="right" />
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          <motion.div style={{ y: textY }} className="lg:col-span-7 lg:pr-6 order-2 lg:order-1">
            <span className="text-primary text-[10px] tracking-[0.25em] uppercase font-medium">{item.subtitle}</span>
            <h2 className="font-display text-3xl md:text-4xl text-foreground leading-tight mt-2 mb-4">{item.title}</h2>
            <DropCapText text={item.description} />
            <PullQuote text={item.pullQuote} />
            <div className="grid grid-cols-2 gap-3 mt-4">
              {item.features.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.06 + i * 0.05 }} className="bg-card/60 border border-border/30 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-xs text-muted-foreground">{f}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
          <motion.div style={{ y: imgY }} className="lg:col-span-5 relative flex justify-center order-1 lg:order-2">
            <span className="absolute -top-4 -right-4 text-[10rem] md:text-[13rem] font-display font-bold text-foreground/[0.03] leading-none select-none pointer-events-none">05</span>
            <motion.img src={item.image} alt={item.title} className="relative z-10 w-[220px] md:w-[300px] lg:w-[360px] h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.12)]" initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }} />
            <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }} className="absolute bottom-2 left-4 z-20 bg-card/90 backdrop-blur-md border border-border/40 rounded-2xl px-4 py-2 shadow-hover">
              <p className="font-display text-xl text-foreground leading-none">{item.stat.value}</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">{item.stat.unit}</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

/* ─── Section 6: Family Estate — generational timeline ─────────── */

const Section6 = () => {
  const item = propertyTypes[5];
  const ref = useRef<HTMLDivElement>(null);
  const imgY = useParallax(ref, [70, -70]);
  const textY = useParallax(ref, [35, -35]);
  const lineHeight = useParallax(ref, [0, 100]);

  return (
    <div ref={ref} className="relative py-8 md:py-12">
      {/* Vertical timeline accent */}
      <motion.div
        className="absolute left-6 md:left-12 top-[10%] w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent pointer-events-none"
        style={{ height: lineHeight }}
      />
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          <motion.div style={{ y: imgY }} className="lg:col-span-5 relative flex justify-center">
            <span className="absolute -top-4 -left-4 text-[10rem] md:text-[13rem] font-display font-bold text-foreground/[0.03] leading-none select-none pointer-events-none">06</span>
            <motion.img src={item.image} alt={item.title} className="relative z-10 w-[220px] md:w-[300px] lg:w-[360px] h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.12)]" initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }} />
          </motion.div>
          <motion.div style={{ y: textY }} className="lg:col-span-7 lg:pl-6">
            <span className="text-primary text-[10px] tracking-[0.25em] uppercase font-medium">{item.subtitle}</span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-[2.8rem] text-foreground leading-tight mt-2 mb-4">{item.title}</h2>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4 max-w-lg">{item.description}</p>
            <div className="flex items-center gap-4 mb-4 border-l-2 border-primary/30 pl-4">
              <div>
                <p className="font-display text-3xl text-foreground">{item.stat.value}</p>
                <p className="text-xs text-muted-foreground/60 uppercase tracking-wider">{item.stat.unit}</p>
              </div>
              <div className="h-8 w-px bg-border/40" />
              <p className="text-xs text-muted-foreground/60 uppercase tracking-wider">{item.stat.detail}</p>
            </div>
            {/* Generational markers */}
            <div className="flex gap-3 mt-4">
              {["1st Gen", "2nd Gen", "3rd Gen", "4th Gen"].map((gen, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.12 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-2 h-2 rounded-full bg-primary/40 mb-1" />
                  <span className="text-[9px] tracking-wider uppercase text-muted-foreground/50">{gen}</span>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
                className="flex items-center"
              >
                <span className="text-[9px] tracking-wider uppercase text-primary/50 ml-1">& beyond</span>
              </motion.div>
            </div>
            <PullQuote text={item.pullQuote} />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

/* ─── Section 7: Veterans — star field + honour ribbon ─────────── */

const Section7 = () => {
  const item = propertyTypes[6];
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const imgScale = useTransform(scrollYProgress, [0, 0.4, 0.6, 1], [0.9, 1.02, 1.02, 0.95]);
  const textY = useTransform(scrollYProgress, [0, 1], [30, -30]);

  return (
    <div ref={ref} className="relative py-10 md:py-16 overflow-hidden" style={{ background: "linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--sage-light)) 25%, hsl(var(--sage-light)) 75%, hsl(var(--background)) 100%)" }}>
      <HonourRibbons />
      {/* Honour ribbon — slow horizontal sweep */}
      <motion.div
        className="absolute top-8 left-0 right-0 h-px pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-transparent via-primary/30 to-transparent"
          style={{ width: "200%" }}
          animate={{ x: ["-50%", "0%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
      <motion.div
        className="absolute bottom-8 left-0 right-0 h-px pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-transparent via-primary/30 to-transparent"
          style={{ width: "200%" }}
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
      <div className="container mx-auto px-6 max-w-5xl text-center relative z-10">
        <motion.div style={{ scale: imgScale }} className="relative flex justify-center mb-7">
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[12rem] md:text-[16rem] font-display font-bold text-foreground/[0.02] leading-none select-none pointer-events-none">07</span>
          <motion.img src={item.image} alt={item.title} className="relative z-10 w-[260px] md:w-[360px] lg:w-[420px] h-auto drop-shadow-[0_25px_60px_rgba(0,0,0,0.15)]" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} />
        </motion.div>
        <motion.div style={{ y: textY }}>
          <span className="text-primary text-[10px] tracking-[0.25em] uppercase font-medium">{item.subtitle}</span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl text-foreground leading-tight mt-2 mb-4">{item.title}</h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4 max-w-xl mx-auto">{item.description}</p>
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {item.features.map((f, i) => (
              <motion.span key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.05 + i * 0.06 }} className="text-[11px] px-3 py-1.5 rounded-full bg-card border border-border/40 text-muted-foreground">{f}</motion.span>
            ))}
          </div>
          <p className="font-display text-lg italic text-foreground/60">"{item.pullQuote}"</p>
        </motion.div>
      </div>
    </div>
  );
};

/* ─── Page ───────────────────────────────────────────────────────── */

const PropertyTypes = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroImgScale = useTransform(heroProgress, [0, 1], [1, 1.2]);
  const heroOpacity = useTransform(heroProgress, [0, 0.7], [1, 0]);
  const heroTextY = useTransform(heroProgress, [0, 1], [0, -50]);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Cemetery Property Types Explained | Plots, Niches, Crypts & Mausoleums"
        description="A guide to cemetery property types in Texas: single & companion plots, lawn crypts, mausoleums, cremation niches, family estates and veterans options."
        path="/property-types"
      />
      <Navbar />

      {/* Hero */}
      <section ref={heroRef} className="relative h-[44vh] md:h-[48vh] flex items-start pt-24 md:pt-28 overflow-hidden">
        <motion.div style={{ scale: heroImgScale }} className="absolute inset-0">
          <img src="/images/cemetery-greenhills.jpg" alt="Peaceful coastal memorial landscape" className="w-full h-full object-cover object-[center_15%]" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/50 via-foreground/25 to-background" />
        <motion.div style={{ opacity: heroOpacity, y: heroTextY }} className="relative container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="max-w-3xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px w-8 bg-primary-foreground/40" />
              <span className="text-primary-foreground/70 text-xs tracking-[0.25em] uppercase font-medium">Understanding Your Options</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-primary-foreground leading-tight drop-shadow-lg mb-3">
              Types of cemetery <span className="italic">property</span>
            </h1>
            <p className="text-primary-foreground/80 text-base md:text-lg font-light leading-relaxed max-w-2xl drop-shadow-md">
              A guide to the different memorial options available across Texas.
            </p>
          </motion.div>
        </motion.div>
      </section>

      <ImageStrip direction={1} />
      <Section1 />
      <Divider />
      <Section2And3 />
      <StatRibbon />
      <Section4 />
      <Divider label="Cremation & Specialty" />
      <Section5 />
      <ImageStrip direction={-1} />
      <Section6 />
      <Divider label="Honouring Service" />
      <Section7 />

      {/* Contact CTA */}
      <section className="py-14 md:py-20 bg-gradient-sage">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h2 className="font-display text-3xl md:text-4xl text-foreground mb-4">Not Sure Which Type Is Right?</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">Our team will walk you through every option and help you find the perfect property for your needs and budget.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href="tel:2142560795" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-full text-sm hover:opacity-90 transition-all">
                <Phone className="w-4 h-4" /> (214) 256-0795
              </a>
              <a href="mailto:Help@TexasCemeteryBrokers.com" className="inline-flex items-center gap-2 px-6 py-3 border-2 border-foreground/15 text-foreground font-medium rounded-full text-sm hover:bg-foreground/5 transition-all">
                <Mail className="w-4 h-4" /> Help@TexasCemeteryBrokers.com
              </a>
            </div>
            <div className="mt-8">
              <Link to="/properties" className="inline-flex items-center gap-2 text-primary font-medium text-sm hover:gap-3 transition-all">
                Browse Available Properties <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PropertyTypes;
