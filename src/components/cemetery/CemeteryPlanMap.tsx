import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BellRing, Download, Maximize2, X } from "lucide-react";

import type { CemeteryPlanMap as PlanMap } from "./cemeteryPlanMaps";

interface Props {
  cemeteryName: string;
  map: PlanMap;
}

/**
 * Full-size, downloadable section plan for a single cemetery. Deliberately
 * generic — the artwork and copy come from cemeteryPlanMaps.ts.
 */
const CemeteryPlanMap = ({ cemeteryName, map }: Props) => {
  const [zoom, setZoom] = useState(false);

  return (
    <div className="rounded-[28px] border border-border bg-[hsl(40_36%_97%)] overflow-hidden">
      <div className="px-6 md:px-8 pt-7 pb-5 flex flex-col lg:flex-row lg:items-end gap-5 justify-between border-b border-border/60">
        <div>
          <p className="text-[11px] tracking-[0.28em] uppercase text-primary font-medium mb-2">Section plan</p>
          <h3 className="font-display text-2xl md:text-[34px] text-foreground leading-[1.08]">
            {cemeteryName}, mapped.
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">{map.blurb}</p>
        </div>
        <button
          type="button"
          onClick={() => setZoom(true)}
          aria-label="Enlarge map"
          className="p-3 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setZoom(true)}
        className="block w-full cursor-zoom-in px-3 py-5 md:px-8 md:py-8"
        aria-label={`Enlarge ${cemeteryName} section map`}
      >
        <img
          src={map.src}
          alt={map.alt}
          loading="lazy"
          className={`w-full h-auto block mix-blend-multiply ${map.tone}`}
        />
      </button>

      <div className="-mt-2 pb-6 px-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <p className="text-[11px] text-muted-foreground">Tap the plan to enlarge</p>
        <span className="hidden sm:block w-px h-4 bg-border" />
        <a
          href={map.src}
          download={map.downloadName}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-background text-xs font-medium text-foreground hover:border-primary transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-primary" />
          Download full-size map (PNG)
        </a>
      </div>

      <div className="px-6 md:px-8 py-6 border-t border-border/60 flex flex-col lg:flex-row gap-5 justify-between lg:items-center">
        <p className="text-[11px] text-muted-foreground max-w-md leading-relaxed">
          Redrawn by Texas Cemetery Brokers from the cemetery's published plan. Positions are indicative — confirm the
          exact lot and space with the cemetery office before you visit.
        </p>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            to={`/buy?cemetery=${encodeURIComponent(cemeteryName)}`}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <BellRing className="w-4 h-4" /> Alert me here
          </Link>
          <Link
            to={`/sell?cemetery=${encodeURIComponent(cemeteryName)}`}
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
          aria-label={`${cemeteryName} section plan, enlarged`}
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
              src={map.src}
              alt={map.alt}
              className={`max-w-none w-[1600px] h-auto mix-blend-multiply ${map.tone}`}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CemeteryPlanMap;
