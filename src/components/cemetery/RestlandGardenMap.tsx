import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BellRing, Maximize2, Search, X } from "lucide-react";

import westMap from "@/assets/restland-map-west.png.asset.json";
import eastMap from "@/assets/restland-map-east.png.asset.json";
import { RESTLAND_GARDENS } from "./restlandGardens";

/**
 * Restland Memorial Park garden plan, redrawn in the Texas Cemetery Brokers
 * palette. Two halves: the west grounds (Restland Road / funeral home side)
 * and the east grounds along Greenville Avenue.
 */

const HALVES = [
  {
    id: "west",
    label: "West grounds",
    blurb:
      "Whispering Waters, Abbey Estates, Good Shepherd, Trinity and the United Jewish Cemeteries — the older, more established side of the park.",
    src: westMap.url,
    alt: "Map of the west grounds at Restland Memorial Park, Dallas, showing Whispering Waters, Abbey Estates, Good Shepherd, Trinity and the surrounding gardens",
    tone: "sepia-[.06] saturate-[.92] contrast-[1.02]",
  },
  {
    id: "east",
    label: "East grounds",
    blurb:
      "Chapel Gardens, Ascension, Devotion, Rose Garden and the Veteran's gardens along the Greenville Avenue frontage.",
    src: eastMap.url,
    alt: "Map of the east grounds at Restland Memorial Park, Dallas, showing Chapel Gardens, Ascension, Devotion, Rose Garden and the Veteran's gardens",
    tone: "sepia-[.22] saturate-[.8] contrast-[1.04] brightness-[.99]",
  },
] as const;

const RestlandGardenMap = () => {
  const [half, setHalf] = useState<(typeof HALVES)[number]["id"]>("west");
  const [zoom, setZoom] = useState(false);
  const [query, setQuery] = useState("");
  const current = HALVES.find((h) => h.id === half)!;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = RESTLAND_GARDENS.filter(
      (g) =>
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.children?.some((c) => c.toLowerCase().includes(q)),
    );
    const map = new Map<string, typeof matched>();
    matched.forEach((g) => {
      const letter = g.name[0].toUpperCase();
      map.set(letter, [...(map.get(letter) ?? []), g]);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [query]);


  return (
    <div className="rounded-[28px] border border-border bg-[hsl(40_36%_97%)] overflow-hidden">
      <div className="px-6 md:px-8 pt-7 pb-5 flex flex-col lg:flex-row lg:items-end gap-5 justify-between border-b border-border/60">
        <div>
          <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-2">
            Restland garden plan
          </p>
          <h3 className="font-display text-2xl md:text-[34px] text-foreground leading-[1.08]">
            Every garden at Restland, redrawn.
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
            {current.blurb}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex p-1 rounded-full border border-border bg-background">
            {HALVES.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setHalf(h.id)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                  half === h.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setZoom(true)}
            aria-label="Enlarge map"
            className="p-3 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setZoom(true)}
        className="block w-full bg-[hsl(40_36%_97%)] cursor-zoom-in"
        aria-label="Enlarge Restland map"
      >
        <img
          src={current.src}
          alt={current.alt}
          loading="lazy"
          className={`w-full h-auto block mix-blend-multiply ${current.tone}`}
        />
      </button>

      {/* Garden directory */}
      <div className="px-6 md:px-8 py-8 border-t border-border/60">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-2">
              Section index
            </p>
            <h4 className="font-display text-xl md:text-2xl text-foreground leading-tight">
              All {RESTLAND_GARDENS.length} gardens & sections
            </h4>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-md leading-relaxed">
              Indented entries are sub-sections — usually a cryptorium or court inside the parent garden.
            </p>
          </div>
          <label className="relative w-full md:w-72 shrink-0">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a garden…"
              aria-label="Search Restland gardens"
              className="w-full pl-11 pr-4 py-3 rounded-full border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </label>
        </div>

        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No garden matches “{query}”.</p>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-8">
            {groups.map(([letter, items]) => (
              <div key={letter} className="break-inside-avoid mb-6">
                <div className="flex items-baseline gap-3 mb-2 pb-1.5 border-b border-border/70">
                  <span className="font-display text-lg text-primary leading-none">{letter}</span>
                  <span className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <ul className="space-y-1">
                  {items.map((g) => (
                    <li key={g.name}>
                      <span className="text-sm text-foreground leading-snug">{g.name}</span>
                      {g.note && (
                        <span className="text-xs text-muted-foreground"> — {g.note}</span>
                      )}
                      {g.children && (
                        <ul className="mt-0.5 ml-3 pl-3 border-l border-border/70 space-y-0.5">
                          {g.children.map((c) => (
                            <li key={c} className="text-xs text-muted-foreground leading-snug">
                              {c}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>


      <div className="px-6 md:px-8 py-6 border-t border-border/60 flex flex-col lg:flex-row gap-5 justify-between lg:items-center">
        <p className="text-[11px] text-muted-foreground max-w-md leading-relaxed">
          Redrawn by Texas Cemetery Brokers from Restland's published garden plan. Positions are indicative — confirm
          the exact lot and space with the cemetery office before you visit.
        </p>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            to={`/buy?cemetery=${encodeURIComponent("Restland Memorial Park")}`}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <BellRing className="w-4 h-4" /> Alert me at Restland
          </Link>
          <Link
            to={`/sell?cemetery=${encodeURIComponent("Restland Memorial Park")}`}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-border text-sm font-medium text-foreground hover:border-primary transition-colors"
          >
            I own here — value it <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4"
          onClick={() => setZoom(false)}
          role="dialog"
          aria-label="Restland garden plan, enlarged"
        >
          <button
            type="button"
            onClick={() => setZoom(false)}
            aria-label="Close map"
            className="absolute top-5 right-5 p-3 rounded-full bg-background text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="max-h-full max-w-full overflow-auto rounded-2xl bg-[hsl(40_36%_97%)]">
            <img
              src={current.src}
              alt={current.alt}
              className={`max-w-none w-[1600px] h-auto mix-blend-multiply ${current.tone}`}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RestlandGardenMap;
