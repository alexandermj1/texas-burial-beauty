import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BellRing, Search, X } from "lucide-react";

/**
 * Hand-drawn vector map of Restland Memorial Park, Dallas — redrawn in our own
 * brand palette from the cemetery's published garden plan. Every named garden,
 * section and estate on the official plan is reproduced here in its correct
 * relative position, with the price band we record for that ground.
 *
 * Bands are deliberately qualitative — we never publish a cemetery's counter
 * price or our own spread.
 */

type Band = "premium" | "standard" | "value" | "none";

interface Garden {
  n: string;
  x: number;
  y: number;
  w: number;
  h: number;
  band?: Band;
  /** rotate label 90deg for tall narrow strips */
  v?: boolean;
  /** structure rather than garden (mausoleum building, funeral home) */
  b?: boolean;
}

/* Layout is drawn in a 2000 x 700 field. West half (Restland Road side) on the
   left, east half (Greenville Avenue frontage) on the right, exactly as the two
   halves of the published plan join. */
const WEST: Garden[] = [
  { n: "Brookview Estates", x: 268, y: 40, w: 120, h: 42, band: "premium" },
  { n: "Woodland Estates", x: 630, y: 60, w: 130, h: 40 },
  { n: "Creekside Estates", x: 120, y: 120, w: 100, h: 38 },
  { n: "Whispering Waters Mausoleum", x: 148, y: 168, w: 86, h: 78, b: true, band: "premium" },
  { n: "Whispering Waters Ph. II", x: 240, y: 165, w: 130, h: 48, band: "premium" },
  { n: "Creekview Estates", x: 120, y: 250, w: 100, h: 36 },
  { n: "Valley View", x: 400, y: 130, w: 92, h: 58, band: "value" },
  { n: "Whispering Waters", x: 500, y: 130, w: 104, h: 46, band: "premium" },
  { n: "Woodland", x: 600, y: 168, w: 92, h: 46 },
  { n: "Babyland IV", x: 700, y: 155, w: 100, h: 40 },
  { n: "Acacia Section", x: 740, y: 200, w: 92, h: 44 },
  { n: "Memories", x: 168, y: 288, w: 112, h: 58 },
  { n: "Wisdom", x: 284, y: 282, w: 88, h: 68 },
  { n: "Good Shepherd", x: 350, y: 250, w: 122, h: 52, band: "standard" },
  { n: "Highland Gardens", x: 452, y: 264, w: 82, h: 62 },
  { n: "Whispering Wtrs", x: 538, y: 258, w: 66, h: 56 },
  { n: "Masonic", x: 586, y: 250, w: 70, h: 44 },
  { n: "Sunset", x: 658, y: 246, w: 70, h: 44 },
  { n: "Pioneer", x: 722, y: 258, w: 72, h: 38 },
  { n: "Colonial", x: 790, y: 246, w: 92, h: 46 },
  { n: "Floyd Cemetery", x: 712, y: 300, w: 84, h: 38 },
  { n: "Tower Section", x: 706, y: 342, w: 84, h: 38 },
  { n: "Tu-Dam", x: 92, y: 300, w: 72, h: 40 },
  { n: "Loving Cloud", x: 92, y: 344, w: 78, h: 42 },
  { n: "Rest", x: 176, y: 352, w: 112, h: 46 },
  { n: "Babyland II", x: 592, y: 336, w: 74, h: 40 },
  { n: "Babyland", x: 652, y: 348, w: 82, h: 40 },
  { n: "Lakeview Section H", x: 748, y: 336, w: 98, h: 46 },
  { n: "Garden of Honor", x: 858, y: 296, w: 44, h: 128, v: true, band: "premium" },
  { n: "Section I", x: 826, y: 388, w: 62, h: 34 },
  { n: "Christian Orthodox", x: 206, y: 402, w: 84, h: 46 },
  { n: "Reflections", x: 288, y: 396, w: 92, h: 54 },
  { n: "Trinity", x: 348, y: 386, w: 112, h: 58, band: "standard" },
  { n: "Nards", x: 222, y: 452, w: 62, h: 34 },
  { n: "Binnerri", x: 212, y: 490, w: 82, h: 38 },
  { n: "Mount Sinai", x: 102, y: 424, w: 74, h: 34 },
  { n: "Beth Torah", x: 92, y: 462, w: 64, h: 36 },
  { n: "Mount Zion", x: 152, y: 458, w: 72, h: 40 },
  { n: "Nishmat Am", x: 68, y: 506, w: 88, h: 34 },
  { n: "Babyland III", x: 582, y: 394, w: 74, h: 44 },
  { n: "Section E", x: 618, y: 388, w: 92, h: 44 },
  { n: "Section F", x: 626, y: 452, w: 100, h: 50 },
  { n: "Section J", x: 756, y: 452, w: 92, h: 50 },
  { n: "Abbey Estates", x: 856, y: 434, w: 44, h: 150, v: true, band: "premium" },
  { n: "Restland Funeral Home", x: 496, y: 436, w: 74, h: 62, b: true },
  { n: "Entrance Gardens", x: 580, y: 442, w: 84, h: 44, band: "standard" },
  { n: "Companion D", x: 586, y: 492, w: 80, h: 40 },
  { n: "Rosemont", x: 580, y: 534, w: 82, h: 40 },
  { n: "Section G", x: 626, y: 516, w: 100, h: 50 },
  { n: "Section K", x: 756, y: 516, w: 92, h: 50 },
  { n: "Serenity", x: 362, y: 490, w: 92, h: 44, band: "standard" },
  { n: "Freedom", x: 296, y: 522, w: 100, h: 44, band: "standard" },
  { n: "Gabriel", x: 198, y: 522, w: 92, h: 44 },
  { n: "Bahai", x: 242, y: 570, w: 72, h: 34 },
  { n: "Veteran's IV", x: 326, y: 598, w: 92, h: 34 },
  { n: "Administrative Offices", x: 426, y: 598, w: 104, h: 34, b: true },
  { n: "Florist", x: 540, y: 606, w: 58, h: 28, b: true },
  { n: "Section C", x: 700, y: 598, w: 140, h: 34 },
];

const EAST: Garden[] = [
  { n: "Chapel Gardens Mausoleum", x: 996, y: 72, w: 96, h: 36, b: true, band: "premium" },
  { n: "Four Seasons", x: 1112, y: 52, w: 92, h: 30 },
  { n: "Psalms", x: 1178, y: 86, w: 70, h: 30 },
  { n: "Gazebo", x: 1056, y: 116, w: 60, h: 28, b: true },
  { n: "Faith Urn Garden", x: 1246, y: 90, w: 84, h: 40 },
  { n: "Wildwood Garden", x: 1146, y: 138, w: 112, h: 34 },
  { n: "Court of Faith", x: 1290, y: 118, w: 72, h: 40, band: "premium" },
  { n: "Chapel Garden Cremorials", x: 1336, y: 68, w: 116, h: 34 },
  { n: "Maplewood Creekside", x: 1336, y: 104, w: 116, h: 30 },
  { n: "Chapel Gardens II Ph. 2", x: 1462, y: 76, w: 116, h: 40, band: "premium" },
  { n: "Peace", x: 952, y: 148, w: 62, h: 32, band: "standard" },
  { n: "Wildwood Chapel", x: 1018, y: 146, w: 90, h: 40, b: true },
  { n: "Chapel Gardens II Mausoleum", x: 1276, y: 164, w: 96, h: 42, b: true, band: "premium" },
  { n: "Chapel Garden Estates", x: 1382, y: 164, w: 100, h: 36, band: "premium" },
  { n: "Islamic Garden", x: 1494, y: 152, w: 84, h: 42, band: "value" },
  { n: "Parkview", x: 1594, y: 152, w: 112, h: 40 },
  { n: "Ten Commandments", x: 1728, y: 172, w: 126, h: 34 },
  { n: "Urn Garden", x: 950, y: 186, w: 72, h: 40 },
  { n: "Wildwood Rill", x: 1090, y: 174, w: 78, h: 32 },
  { n: "Wildwood Rill Cremation Gdn", x: 1078, y: 212, w: 122, h: 38 },
  { n: "Chapel", x: 996, y: 228, w: 92, h: 60 },
  { n: "Faith", x: 1106, y: 230, w: 72, h: 50, band: "standard" },
  { n: "Ascension", x: 1240, y: 218, w: 178, h: 58, band: "premium" },
  { n: "Cross", x: 1440, y: 218, w: 150, h: 58 },
  { n: "Kever Israel", x: 1736, y: 222, w: 92, h: 46 },
  { n: "Rock Garden", x: 950, y: 252, w: 62, h: 40 },
  { n: "Rose Section", x: 946, y: 296, w: 72, h: 38, band: "premium" },
  { n: "Floral Hill", x: 1008, y: 292, w: 112, h: 54 },
  { n: "Last Supper", x: 1136, y: 284, w: 72, h: 46, band: "premium" },
  { n: "Field of Honor", x: 1126, y: 336, w: 74, h: 44 },
  { n: "Devotion", x: 1226, y: 298, w: 130, h: 58, band: "premium" },
  { n: "Gospel", x: 1366, y: 298, w: 120, h: 58 },
  { n: "Mt. Vernon", x: 1496, y: 298, w: 120, h: 58 },
  { n: "Holy Family", x: 1626, y: 286, w: 112, h: 50, band: "premium" },
  { n: "Veteran's II", x: 1626, y: 344, w: 140, h: 54 },
  { n: "Court of Hope", x: 1782, y: 318, w: 92, h: 46 },
  { n: "Terrace Gardens", x: 1884, y: 318, w: 40, h: 148, v: true },
  { n: "Section O", x: 966, y: 376, w: 82, h: 34 },
  { n: "Section S", x: 1026, y: 368, w: 92, h: 40 },
  { n: "Companion A", x: 946, y: 412, w: 72, h: 40 },
  { n: "Companion B", x: 1046, y: 414, w: 92, h: 34 },
  { n: "Rose Garden", x: 1226, y: 388, w: 112, h: 58, band: "premium" },
  { n: "Acacia Lawn", x: 1356, y: 398, w: 140, h: 68 },
  { n: "Prayer", x: 1500, y: 384, w: 110, h: 50, band: "standard" },
  { n: "Love", x: 1616, y: 408, w: 92, h: 46 },
  { n: "Veteran's I", x: 1716, y: 408, w: 110, h: 46 },
  { n: "Court of Remembrance", x: 1782, y: 372, w: 96, h: 48 },
  { n: "Section Q", x: 950, y: 470, w: 92, h: 46 },
  { n: "Section T", x: 1046, y: 452, w: 100, h: 46 },
  { n: "Evergreen", x: 1140, y: 464, w: 80, h: 40 },
  { n: "Section X", x: 1128, y: 508, w: 80, h: 34 },
  { n: "Fountain View", x: 1206, y: 462, w: 122, h: 46, band: "premium" },
  { n: "Gethsemane", x: 1496, y: 452, w: 120, h: 46 },
  { n: "Court of Meditation", x: 1782, y: 436, w: 96, h: 48 },
  { n: "Section R", x: 950, y: 528, w: 92, h: 46 },
  { n: "Salvation Army", x: 1046, y: 506, w: 100, h: 34 },
  { n: "Section U", x: 1046, y: 546, w: 100, h: 34 },
  { n: "Evergreen Babyland", x: 1168, y: 546, w: 34, h: 92, v: true },
  { n: "Plaza", x: 1236, y: 528, w: 110, h: 48 },
  { n: "Crestview", x: 1362, y: 542, w: 110, h: 44 },
  { n: "Mission Valley", x: 1478, y: 528, w: 110, h: 48 },
  { n: "Inspiration", x: 1604, y: 532, w: 110, h: 44 },
  { n: "Compassion", x: 1726, y: 528, w: 112, h: 44 },
  { n: "Veteran's III", x: 1846, y: 566, w: 104, h: 34 },
  { n: "Section Y", x: 986, y: 606, w: 150, h: 32 },
  { n: "Gateway", x: 1226, y: 606, w: 120, h: 32 },
  { n: "Babyland V", x: 1444, y: 606, w: 130, h: 32 },
  { n: "Gateway North", x: 1616, y: 606, w: 140, h: 32 },
];

const GARDENS: Garden[] = [...WEST, ...EAST];

const BAND_META: Record<Exclude<Band, "none">, { label: string; fill: string; stroke: string; text: string }> = {
  premium: {
    label: "Feature garden — top of Restland's price range",
    fill: "hsl(18 42% 62% / 0.34)",
    stroke: "hsl(18 42% 45% / 0.65)",
    text: "Premium",
  },
  standard: {
    label: "Established garden — mid-range counter pricing",
    fill: "hsl(90 12% 55% / 0.28)",
    stroke: "hsl(95 15% 40% / 0.5)",
    text: "Mid-range",
  },
  value: {
    label: "Open lawn or faith garden — the most accessible pricing here",
    fill: "hsl(40 38% 70% / 0.32)",
    stroke: "hsl(38 35% 48% / 0.55)",
    text: "Best value",
  },
};

const DEFAULT_FILL = "hsl(38 22% 88% / 0.75)";
const DEFAULT_STROKE = "hsl(35 16% 66%)";

const RestlandGardenMap = () => {
  const [active, setActive] = useState<Garden | null>(null);
  const [q, setQ] = useState("");

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return null;
    return new Set(GARDENS.filter((g) => g.n.toLowerCase().includes(t)).map((g) => g.n));
  }, [q]);

  const band = active?.band && active.band !== "none" ? BAND_META[active.band] : null;

  return (
    <div className="rounded-[28px] border border-border bg-[hsl(40_36%_97%)] overflow-hidden">
      {/* Header */}
      <div className="px-6 md:px-8 pt-7 pb-5 flex flex-col lg:flex-row lg:items-end gap-5 justify-between border-b border-border/60">
        <div>
          <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-2">
            Restland garden plan
          </p>
          <h3 className="font-display text-2xl md:text-[34px] text-foreground leading-[1.08]">
            Every garden at Restland, redrawn.
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
            Tap any garden to see how it prices and whether it usually comes up through resale. Search your deed's
            garden name if you already own here.
          </p>
        </div>
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find your garden…"
            aria-label="Search Restland gardens"
            className="w-full pl-11 pr-9 py-3 rounded-full border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Clear search"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="overflow-x-auto no-scrollbar">
        <svg
          viewBox="0 0 2000 700"
          role="img"
          aria-label="Map of the gardens and sections at Restland Memorial Park, Dallas"
          className="w-[1400px] md:w-full h-auto block"
        >
          <rect x="0" y="0" width="2000" height="700" fill="hsl(40 36% 97%)" />

          {/* drives */}
          <g stroke="hsl(35 18% 82%)" strokeWidth="9" fill="none" strokeLinecap="round">
            <path d="M40 118 C 300 70, 620 96, 900 120 S 1500 118, 1960 132" />
            <path d="M60 250 H 900" />
            <path d="M940 200 H 1960" />
            <path d="M60 396 H 900" />
            <path d="M940 366 H 1930" />
            <path d="M60 512 H 900" />
            <path d="M940 452 H 1930" />
            <path d="M120 40 V 640" />
            <path d="M340 40 V 640" />
            <path d="M600 120 V 640" />
            <path d="M740 200 V 640" />
            <path d="M960 220 V 640" />
            <path d="M1200 200 V 640" />
            <path d="M1350 220 V 640" />
            <path d="M1470 200 V 640" />
            <path d="M1620 200 V 640" />
            <path d="M1770 220 V 640" />
            <path d="M1880 240 V 620" />
          </g>

          {/* Restland Road (diagonal spine) */}
          <path
            d="M395 40 L 470 640"
            stroke="hsl(35 18% 78%)"
            strokeWidth="16"
            fill="none"
            strokeLinecap="round"
          />
          <text
            x="440"
            y="330"
            transform="rotate(83 440 330)"
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize="13"
            letterSpacing="1.5"
          >
            RESTLAND ROAD
          </text>

          {/* Greenville Avenue */}
          <rect x="0" y="654" width="2000" height="26" fill="hsl(35 16% 86%)" />
          <line x1="0" y1="667" x2="2000" y2="667" stroke="hsl(40 36% 97%)" strokeWidth="2" strokeDasharray="22 18" />
          <text x="1000" y="696" textAnchor="middle" className="fill-foreground" fontSize="17" letterSpacing="4">
            GREENVILLE AVENUE
          </text>

          {/* Gardens */}
          {GARDENS.map((g) => {
            const meta = g.band && g.band !== "none" ? BAND_META[g.band] : null;
            const isActive = active?.n === g.n;
            const dim = matches ? !matches.has(g.n) : false;
            const hit = matches ? matches.has(g.n) : false;
            return (
              <g
                key={g.n + g.x}
                onClick={() => setActive(isActive ? null : g)}
                className="cursor-pointer"
                opacity={dim ? 0.28 : 1}
              >
                <rect
                  x={g.x}
                  y={g.y}
                  width={g.w}
                  height={g.h}
                  rx="6"
                  fill={g.b ? "hsl(30 12% 62% / 0.5)" : meta ? meta.fill : DEFAULT_FILL}
                  stroke={isActive || hit ? "hsl(18 48% 42%)" : meta ? meta.stroke : DEFAULT_STROKE}
                  strokeWidth={isActive || hit ? 2.6 : 1}
                  className="transition-all duration-200 hover:brightness-95"
                />
                <text
                  x={g.v ? g.x + g.w / 2 : g.x + g.w / 2}
                  y={g.v ? g.y + g.h / 2 : g.y + g.h / 2}
                  transform={g.v ? `rotate(-90 ${g.x + g.w / 2} ${g.y + g.h / 2})` : undefined}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={g.n.length > 20 ? 9 : g.n.length > 13 ? 10 : 11.5}
                  className="fill-foreground pointer-events-none select-none"
                  style={{ fontWeight: isActive ? 600 : 400 }}
                >
                  {g.n.length > 26 ? `${g.n.slice(0, 24)}…` : g.n}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend + detail */}
      <div className="px-6 md:px-8 py-6 border-t border-border/60 flex flex-col lg:flex-row gap-6 justify-between">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {(Object.keys(BAND_META) as (keyof typeof BAND_META)[]).map((k) => (
            <div key={k} className="flex items-center gap-2.5">
              <span
                className="w-4 h-4 rounded-[4px] border"
                style={{ background: BAND_META[k].fill, borderColor: BAND_META[k].stroke }}
              />
              <span className="text-xs text-muted-foreground">{BAND_META[k].text}</span>
            </div>
          ))}
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-[4px] border" style={{ background: DEFAULT_FILL, borderColor: DEFAULT_STROKE }} />
            <span className="text-xs text-muted-foreground">Standard lawn / section</span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground max-w-sm leading-relaxed">
          Redrawn by Texas Cemetery Brokers from Restland's published garden plan. Positions are indicative — confirm
          the exact lot and space with the cemetery office before you visit.
        </p>
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="overflow-hidden border-t border-border/60 bg-foreground text-background"
          >
            <div className="px-6 md:px-8 py-7 flex flex-col md:flex-row md:items-end gap-6 justify-between">
              <div>
                <p className="text-[10px] tracking-[0.24em] uppercase text-primary font-medium mb-2">
                  {band ? band.text : "Section"}
                </p>
                <h4 className="font-display text-2xl md:text-3xl leading-tight mb-2">{active.n}</h4>
                <p className="text-sm text-background/75 max-w-lg leading-relaxed">
                  {band
                    ? band.label
                    : "An established lawn or section at Restland. Availability here is almost always through a family releasing spaces rather than the cemetery office."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link
                  to={`/buy?cemetery=${encodeURIComponent("Restland Memorial Park")}&section=${encodeURIComponent(active.n)}`}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <BellRing className="w-4 h-4" /> Alert me here
                </Link>
                <Link
                  to={`/sell?cemetery=${encodeURIComponent("Restland Memorial Park")}&section=${encodeURIComponent(active.n)}`}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-background/30 text-sm font-medium hover:border-primary transition-colors"
                >
                  I own here — value it <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RestlandGardenMap;
