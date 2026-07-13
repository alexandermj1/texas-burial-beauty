// Searchable cemetery picker used in the seller forms. The customer MUST pick
// from the list (or explicitly choose "My cemetery isn't listed" and type it)
// so we stop getting 30 spellings of the same place.
//
// The dropdown is rendered in a portal (position: fixed) so it never gets
// clipped by parent overflow-hidden / rounded containers — the form panels
// crop it otherwise. Position is recomputed on scroll/resize.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, MapPin, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Cemetery { id: string; name: string; city: string | null }

interface Props {
  value: string;
  isCustom: boolean;
  onChange: (name: string, isCustom: boolean) => void;
  variant?: "standard" | "editorial";
  autoFocus?: boolean;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const CemeteryPicker = ({ value, isCustom, onChange, variant = "standard", autoFocus }: Props) => {
  const [rows, setRows] = useState<Cemetery[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; placeAbove: boolean } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("texas_cemeteries" as any)
        .select("id,name,city")
        .order("name");
      setRows(((data as any[]) || []) as Cemetery[]);
    })();
  }, []);

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Recompute portal position (below trigger, or above if not enough room)
  const updateRect = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const desiredHeight = 460;
    const spaceBelow = window.innerHeight - r.bottom;
    const placeAbove = spaceBelow < 260 && r.top > spaceBelow;
    setRect({
      top: placeAbove ? Math.max(8, r.top - 8) : r.bottom + 8,
      left: r.left,
      width: r.width,
      placeAbove,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateRect();
    const onScroll = () => updateRect();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const grouped = useMemo(() => {
    const q = norm(query);
    const filtered = q
      ? rows.filter(r => norm(`${r.name} ${r.city || ""}`).includes(q))
      : rows;
    const map = new Map<string, Cemetery[]>();
    for (const r of filtered) {
      const city = r.city?.trim() || "Other";
      const arr = map.get(city) || [];
      arr.push(r);
      map.set(city, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows, query]);

  const selected = rows.find(r => r.name === value && !isCustom);
  const isEditorial = variant === "editorial";

  // Shared portal-rendered dropdown menu
  const menu = open && rect ? createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: rect.placeAbove ? undefined : rect.top,
        bottom: rect.placeAbove ? window.innerHeight - rect.top : undefined,
        left: rect.left,
        width: rect.width,
        maxHeight: "min(460px, 70vh)",
        zIndex: 9999,
      }}
      className="bg-background border border-border/70 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in-0 zoom-in-95"
    >
      <div className="relative border-b border-border/50 shrink-0">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cemeteries or cities…"
          className="w-full pl-10 pr-3 py-3 bg-transparent text-sm focus:outline-none"
        />
      </div>
      <div className="overflow-y-auto flex-1 min-h-0">
        {grouped.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground text-center">No matches.</p>
        ) : (
          grouped.map(([city, items]) => (
            <div key={city}>
              <p className="px-3.5 pt-2.5 pb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground bg-muted/50 sticky top-0">{city}</p>
              {items.map(r => {
                const isSel = value === r.name && !isCustom;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { onChange(r.name, false); setOpen(false); setQuery(""); }}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                      isSel ? "bg-primary/10 text-primary" : "hover:bg-primary/5 text-foreground"
                    }`}
                  >
                    <span className="text-sm truncate">{r.name}</span>
                    {isSel && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
      <button
        type="button"
        onClick={() => { onChange("", true); setOpen(false); setQuery(""); }}
        className="w-full px-3.5 py-3 border-t border-border/60 text-left text-sm text-primary hover:bg-primary/5 flex items-center gap-2 shrink-0"
      >
        <MapPin className="w-4 h-4" /> My cemetery isn't listed
      </button>
    </div>,
    document.body,
  ) : null;

  // ────────── Editorial variant (large, underlined, magazine style) ──────────
  if (isEditorial) {
    if (isCustom) {
      return (
        <div className="space-y-3">
          <input
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value, true)}
            placeholder="Type the cemetery name and city"
            maxLength={200}
            className="w-full bg-transparent border-0 border-b border-foreground/25 focus:border-primary focus:ring-0 focus:outline-none font-display text-2xl md:text-4xl text-foreground placeholder:text-foreground/25 placeholder:italic py-3"
          />
          <button
            type="button"
            onClick={() => { onChange("", false); setOpen(true); }}
            className="text-xs uppercase tracking-[0.2em] text-primary hover:text-primary/80"
          >
            ← Pick from the list instead
          </button>
        </div>
      );
    }
    return (
      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          autoFocus={autoFocus}
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between gap-4 bg-transparent border-0 border-b border-foreground/25 focus:border-primary focus:outline-none font-display text-2xl md:text-4xl text-left py-3"
        >
          <span className={selected ? "text-foreground truncate" : "text-foreground/25 italic"}>
            {selected ? selected.name : "Choose your cemetery…"}
          </span>
          <ChevronDown className={`w-6 h-6 text-foreground/40 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
        </button>
        {selected?.city && (
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-foreground/50">{selected.city}</p>
        )}
        {menu}
      </div>
    );
  }

  // ────────── Standard variant (matches inputCls in seller form) ──────────
  const btnCls =
    "w-full h-12 px-4 rounded-xl bg-background border border-border/60 text-left text-[15px] " +
    "text-foreground transition-all flex items-center justify-between gap-2 " +
    "hover:border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40";

  if (isCustom) {
    return (
      <div className="space-y-2">
        <div className="relative">
          <input
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value, true)}
            placeholder="Type the cemetery name and city"
            maxLength={200}
            className="w-full h-12 pl-4 pr-10 rounded-xl bg-background border border-primary/40 text-foreground text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="button"
            onClick={() => onChange("", false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear and choose from list"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground pl-1">
          We couldn't find yours — we'll add it once we receive your submission.{" "}
          <button type="button" onClick={() => onChange("", false)} className="text-primary hover:underline">
            Pick from list instead
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <button ref={triggerRef} type="button" onClick={() => setOpen(v => !v)} className={btnCls}>
        <span className={`truncate ${selected ? "text-foreground" : "text-muted-foreground"}`}>
          {selected ? `${selected.name}${selected.city ? ` — ${selected.city}` : ""}` : "Select your cemetery…"}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {menu}
    </div>
  );
};

export default CemeteryPicker;
