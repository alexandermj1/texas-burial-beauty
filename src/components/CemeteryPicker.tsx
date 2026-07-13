// Searchable cemetery picker used in the seller forms. Customer MUST pick from
// the list (or explicitly choose "not listed" and type it) so we stop getting
// 30 spellings of the same place.
//
// The dropdown is search-first: as the customer types, results appear as
// rich cards showing the cemetery name, city and street address so it's
// easy to recognize the right one visually.
//
// Menu is rendered inline (embedded in the form flow) so it feels like part
// of the surrounding form rather than a floating popover.
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, Search, X, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";


interface Cemetery {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
}

interface Props {
  value: string;
  isCustom: boolean;
  onChange: (name: string, isCustom: boolean) => void;
  variant?: "standard" | "editorial";
  autoFocus?: boolean;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

// Deterministic soft accent color per cemetery so each card is recognizable
// at a glance without needing real photography.
const ACCENTS = [
  { bg: "bg-[hsl(var(--primary)/0.08)]", ring: "ring-[hsl(var(--primary)/0.2)]", fg: "text-primary" },
  { bg: "bg-amber-500/10", ring: "ring-amber-500/25", fg: "text-amber-700" },
  { bg: "bg-emerald-600/10", ring: "ring-emerald-600/25", fg: "text-emerald-700" },
  { bg: "bg-rose-500/10", ring: "ring-rose-500/25", fg: "text-rose-700" },
  { bg: "bg-sky-600/10", ring: "ring-sky-600/25", fg: "text-sky-700" },
  { bg: "bg-violet-500/10", ring: "ring-violet-500/25", fg: "text-violet-700" },
];
const accentFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
};
const initials = (name: string) =>
  name
    .replace(/\b(the|of|and|at|memorial|park|cemetery|gardens?|garden)\b/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || name.slice(0, 2).toUpperCase();

const CemeteryPicker = ({ value, isCustom, onChange, variant = "standard", autoFocus }: Props) => {
  const [rows, setRows] = useState<Cemetery[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("texas_cemeteries" as any)
        .select("id,name,city,address")
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

  // Focus search when menu opens
  useEffect(() => {
    if (open) requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]);


  // Search-first: with no query, show a compact prompt + a few popular cities'
  // top entries so it isn't a wall of names. With a query, show flat ranked results.
  const results = useMemo(() => {
    const q = norm(query);
    if (!q) return rows.slice(0, 40);
    const scored = rows
      .map((r) => {
        const n = norm(r.name);
        const c = norm(r.city || "");
        const hay = `${n} ${c}`;
        if (!hay.includes(q)) return null;
        // rank: starts-with name > name contains > city contains
        let score = 0;
        if (n.startsWith(q)) score += 100;
        if (n.includes(q)) score += 50;
        if (c.startsWith(q)) score += 20;
        if (c.includes(q)) score += 10;
        return { r, score };
      })
      .filter(Boolean) as { r: Cemetery; score: number }[];
    scored.sort((a, b) => b.score - a.score || a.r.name.localeCompare(b.r.name));
    return scored.slice(0, 60).map((s) => s.r);
  }, [rows, query]);

  const selected = rows.find((r) => r.name === value && !isCustom);
  const isEditorial = variant === "editorial";

  // Shared inline dropdown menu (embedded in form flow, not floating)
  const menu = open ? (
    <div
      ref={menuRef}
      className="mt-2 bg-background border border-border/70 rounded-2xl overflow-hidden flex flex-col animate-in fade-in-0 slide-in-from-top-1"
    >
      {/* Search header */}
      <div className="relative border-b border-border/50 shrink-0 bg-muted/30">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by cemetery name or city…"
          className="w-full pl-11 pr-10 py-3.5 bg-transparent text-[15px] placeholder:text-muted-foreground focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); searchRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results */}
      <div className="overflow-y-auto flex-1 min-h-0 p-2 max-h-[420px]">
        {results.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <MapPin className="w-6 h-6 mx-auto mb-2 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              No cemeteries match "{query}".
            </p>
            <button
              type="button"
              onClick={() => { onChange(query, true); setOpen(false); setQuery(""); }}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Add "{query}" as a new cemetery →
            </button>
          </div>
        ) : (
          <ul className="space-y-1">
            {results.map((r) => {
              const isSel = value === r.name && !isCustom;
              const a = accentFor(r.id);
              const addressLine = [r.address, r.city && (!r.address || !r.address.toLowerCase().includes(r.city.toLowerCase())) ? r.city : null]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => { onChange(r.name, false); setOpen(false); setQuery(""); }}
                    className={`w-full text-left px-2.5 py-2.5 rounded-xl flex items-center gap-3 transition-all group ${
                      isSel
                        ? "bg-primary/8 ring-1 ring-primary/25"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    <div className={`shrink-0 w-11 h-11 rounded-lg ${a.bg} ring-1 ${a.ring} flex items-center justify-center ${a.fg} font-serif text-sm font-semibold tracking-wide`}>
                      {initials(r.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[14.5px] font-medium text-foreground truncate">{r.name}</p>
                        {isSel && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0 opacity-70" />
                        <span className="truncate">{addressLine || "Texas"}</span>
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <button
        type="button"
        onClick={() => { onChange("", true); setOpen(false); setQuery(""); }}
        className="w-full px-4 py-3 border-t border-border/60 text-left text-sm text-primary hover:bg-primary/5 flex items-center gap-2 shrink-0 bg-muted/20"
      >
        <Building2 className="w-4 h-4" /> My cemetery isn't listed — I'll type it
      </button>
    </div>
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
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-4 bg-transparent border-0 border-b border-foreground/25 focus:border-primary focus:outline-none font-display text-2xl md:text-4xl text-left py-3"
        >
          <span className={selected ? "text-foreground truncate" : "text-foreground/25 italic"}>
            {selected ? selected.name : "Search your cemetery…"}
          </span>
          <ChevronDown className={`w-6 h-6 text-foreground/40 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
        </button>
        {selected && (selected.city || selected.address) && (
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-foreground/50 flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            {selected.address || selected.city}
          </p>
        )}
        {menu}
      </div>
    );
  }

  // ────────── Standard variant (matches inputCls in seller form) ──────────
  const btnCls =
    "w-full min-h-12 px-3 py-2 rounded-xl bg-background border border-border/60 text-left text-[15px] " +
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
      <button ref={triggerRef} type="button" onClick={() => setOpen((v) => !v)} className={btnCls}>
        {selected ? (
          <span className="flex items-center gap-3 min-w-0 flex-1">
            {(() => {
              const a = accentFor(selected.id);
              return (
                <span className={`shrink-0 w-8 h-8 rounded-md ${a.bg} ring-1 ${a.ring} flex items-center justify-center ${a.fg} font-serif text-xs font-semibold`}>
                  {initials(selected.name)}
                </span>
              );
            })()}
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] text-foreground truncate">{selected.name}</span>
              {(selected.address || selected.city) && (
                <span className="block text-[11px] text-muted-foreground truncate flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  {selected.address || selected.city}
                </span>
              )}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Search className="w-4 h-4" />
            Search your cemetery…
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {menu}
    </div>
  );
};

export default CemeteryPicker;
