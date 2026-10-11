// Buyer workspace: every live listing and every seller at the buyer's cemetery,
// expandable in place so staff never leave the buyer record. Sellers are
// colour-coded by their pipeline stage.
import { useState } from "react";
import { ChevronDown, ExternalLink, Globe, Users, X } from "lucide-react";
import type { AdminListing } from "@/hooks/useActiveListings";
import type { Submission } from "./SubmissionsPanel";
import { deriveBayerStage, BAYER_STAGE_META, BAYER_STAGE_ORDER } from "./BayerPipelinePanel";

const money = (v: any) => (v != null && v !== "" && !isNaN(Number(v)) ? `$${Number(v).toLocaleString()}` : null);
const spacesLabel = (n: any) => (n ? `${n} space${Number(n) > 1 ? "s" : ""}` : null);
const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString() : null);

interface Props {
  cemetery: string | null;
  listings: AdminListing[];
  sellers: Submission[];
  manualIds: string[];
  onRemoveManual: (id: string) => void;
}

const Detail = ({ k, v }: { k: string; v: any }) =>
  v ? (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{k}</p>
      <p className="text-xs text-foreground font-medium break-words">{v}</p>
    </div>
  ) : null;

const BuyerCemeteryInventory = ({ cemetery, listings, sellers, manualIds, onRemoveManual }: Props) => {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (id: string) => setOpen((o) => (o === id ? null : id));

  const sorted = [...sellers].sort(
    (a, b) => BAYER_STAGE_ORDER.indexOf(deriveBayerStage(b)) - BAYER_STAGE_ORDER.indexOf(deriveBayerStage(a)),
  );
  const stagesPresent = BAYER_STAGE_ORDER.filter((st) => sellers.some((s) => deriveBayerStage(s) === st));

  return (
    <div className="space-y-4">
      {/* Live listings */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 inline-flex items-center gap-1.5">
          <Globe className="w-3 h-3" /> Live listings at {cemetery || "this cemetery"} ({listings.length})
        </p>
        {listings.length === 0 ? (
          <p className="text-xs text-muted-foreground">No live listings here right now.</p>
        ) : (
          <ul className="space-y-1.5">
            {listings.map((l) => {
              const isOpen = open === `l-${l.id}`;
              return (
                <li key={l.id} className="rounded-lg bg-card border border-border/60 overflow-hidden">
                  <button
                    onClick={() => toggle(`l-${l.id}`)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-foreground truncate">
                        {l.plot_type || "Plot"}{l.section ? ` · ${l.section}` : ""}
                      </span>
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {[spacesLabel(l.spaces), l.city].filter(Boolean).join(" · ") || "Details on file"}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 shrink-0">
                      {money(l.asking_price) || "Price on request"}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-3">
                      {l.photos && l.photos.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {l.photos.slice(0, 6).map((p) => (
                            <img key={p} src={p} alt="" className="h-20 w-28 object-cover rounded-md border border-border/50 shrink-0" />
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Detail k="Type" v={l.plot_type} />
                        <Detail k="Section" v={l.section} />
                        <Detail k="Spaces" v={l.spaces} />
                        <Detail k="Asking" v={money(l.asking_price)} />
                      </div>
                      {l.description && <p className="text-xs text-muted-foreground whitespace-pre-line">{l.description}</p>}
                      <a
                        href={`/properties?listing=${l.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> Public listing page (new tab)
                      </a>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Sellers in the pipeline */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 inline-flex items-center gap-1.5">
          <Users className="w-3 h-3" /> Sellers at {cemetery || "this cemetery"} ({sellers.length})
        </p>
        {stagesPresent.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {stagesPresent.map((st) => {
              const m = BAYER_STAGE_META[st];
              const n = sellers.filter((s) => deriveBayerStage(s) === st).length;
              return (
                <span key={st} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${m.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} /> {m.short} · {n}
                </span>
              );
            })}
          </div>
        )}
        {sellers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No sellers at this cemetery yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {sorted.map((s) => {
              const x = s as any;
              const st = deriveBayerStage(s);
              const m = BAYER_STAGE_META[st];
              const isOpen = open === `s-${s.id}`;
              const isManual = manualIds.includes(s.id);
              const has = [s.property_type, x.section, spacesLabel(s.spaces)].filter(Boolean).join(" · ");
              const price = money(x.list_price) || money(x.quote_amount);
              return (
                <li key={s.id} className="rounded-lg bg-card border border-border/60 overflow-hidden">
                  <div className="flex items-center">
                    <span className={`self-stretch w-1 shrink-0 ${m.dot}`} />
                    <button
                      onClick={() => toggle(`s-${s.id}`)}
                      className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-medium text-foreground truncate">
                          {s.name || s.email || "Seller"}
                          {isManual && <span className="ml-2 text-[9px] uppercase tracking-wide text-muted-foreground">matched by you</span>}
                        </span>
                        <span className="block text-[11px] text-muted-foreground truncate">
                          Has: {has || "plot details not yet given"}
                        </span>
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${m.cls}`}>
                        <m.Icon className="w-3 h-3" /> {m.short}
                      </span>
                      {price && <span className="text-xs font-semibold text-foreground shrink-0 hidden sm:inline">{price}</span>}
                      <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isManual && (
                      <button
                        onClick={() => onRemoveManual(s.id)}
                        className="p-2 text-muted-foreground hover:text-destructive"
                        title="Remove this match"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <div className="px-4 pb-3 pt-2 border-t border-border/50 space-y-3">
                      <p className="text-[11px] text-muted-foreground">
                        Stage: <span className="font-medium text-foreground">{m.label}</span> · with {m.owner}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Detail k="Plot type" v={s.property_type} />
                        <Detail k="Section" v={x.section} />
                        <Detail k="Spaces" v={s.spaces} />
                        <Detail k="Locations" v={x.locations_being_sold || x.plot_locations} />
                        <Detail k="Quote" v={money(x.quote_amount)} />
                        <Detail k="List price" v={money(x.list_price)} />
                        <Detail k="Quote sent" v={fmtDate(s.quote_sent_at)} />
                        <Detail k="Quote reply" v={x.quote_response} />
                        <Detail k="Agreement signed" v={fmtDate(x.la_signed_at)} />
                        <Detail k="Listing no." v={x.listing_number} />
                        <Detail k="Live since" v={fmtDate(x.listing_live_at)} />
                        <Detail k="Phone" v={s.phone} />
                        <Detail k="Email" v={s.email} />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default BuyerCemeteryInventory;
