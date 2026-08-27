// Inline "Listing agreement" builder that lives inside the email composer —
// the exact same pattern as the quote (listing options) panel. The admin
// checks the key fields, picks the listing option the seller paid for, clicks
// Generate, and the signing block is inserted into the email so it can be
// previewed and sent straight down the Gmail thread.
//
// Every blank the listing-agreement PDF has is editable here. The three
// headline fields stay visible; the rest sit behind "Show all fields". Any
// field left blank falls back to whatever the contract generator derives from
// the submission / questionnaire.

import { useEffect, useState } from "react";
import { Loader2, FileSignature, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { properCase } from "@/lib/properCase";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { buildListingAgreementBlock } from "@/lib/buildListingAgreementBlock";
import { formatPlotDescription } from "@/lib/plotDescription";

interface Seller {
  id: string;
  name: string | null;
  email: string | null;
  cemetery: string | null;
  section: string | null;
  property_type: string | null;
  spaces: string | null;
  space_numbers?: string | null;
}

interface Props {
  seller: Seller;
  hasGenerated: boolean;
  /** Hide the tier picker — used inside the quote wizard, where the tier is
   *  only known once the seller accepts and picks one. */
  hideListingOption?: boolean;
  /** Guaranteed net per space, passed straight from the quote wizard so the
   *  agreement matches the quote without re-typing it. */
  netPerPlot?: number;
  onGenerated: (html: string, meta: { signToken: string; signUrl: string }) => void;
}

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const parseCount = (raw?: string | null) => {
  const n = Number(String(raw ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 1;
};

/** The four packages we sell. The PDF has three checkboxes; "Set your own
 *  price" includes everything in Featured, so it ticks the Featured box. */
const LISTING_OPTIONS = [
  { value: "Starter", label: "Starter", note: "$0" },
  { value: "Pro", label: "Pro", note: "$99" },
  { value: "Featured", label: "Featured", note: "$299" },
  { value: "Set your own price", label: "Set your own price", note: "$499" },
] as const;

const Field = ({
  label,
  hint,
  children,
}: { label: string; hint?: string; children: React.ReactNode }) => (
  <div>
    <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
      {label}
    </label>
    {children}
    {hint ? <p className="text-[9px] text-muted-foreground mt-1">{hint}</p> : null}
  </div>
);

const inputCls =
  "w-full h-9 px-2 rounded-md bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function ListingAgreementInlinePanel({ seller, hasGenerated, hideListingOption, netPerPlot, onGenerated }: Props) {
  const { toast } = useToast();
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Headline fields
  const [sellerName, setSellerName] = useState<string>(seller.name ?? "");
  const [plotCount, setPlotCount] = useState<string>(String(parseCount(seller.spaces)));
  const [listingOption, setListingOption] = useState<string>("Starter");

  // Everything else on the agreement
  const [coOwnerName, setCoOwnerName] = useState("");
  const [address, setAddress] = useState("");
  const [cityStateZip, setCityStateZip] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cemetery, setCemetery] = useState(seller.cemetery ?? "");
  const [countyState, setCountyState] = useState("");
  const [plotDescription, setPlotDescription] = useState("");
  const [perPlot, setPerPlot] = useState("");
  const [signUrl, setSignUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSellerName(seller.name ?? "");
    (async () => {
      const { data } = await supabase
        .from("contact_submissions")
        .select(
          "quote_amount, plot_count, spaces, space_numbers, section, lawn, cemetery, cemetery_city, cemetery_retail, list_price, listing_tier, listing_option, deed_owner_names, phone, email, ownership_answers",
        )
        .eq("id", seller.id)
        .maybeSingle();
      if (cancelled) return;
      const row = (data as any) || {};
      const plots = parseCount(row.plot_count ?? row.spaces ?? seller.spaces);
      setPlotCount(String(plots));
      const quote = Number(row.quote_amount) || 0;
      const listTotal = Number(row.list_price) || 0;
      const per = Number(netPerPlot) > 0
        ? Number(netPerPlot)
        : quote > 0 ? quote : listTotal > 0 ? Math.round(listTotal / plots) : 0;
      setPerPlot(per > 0 ? String(per) : "");

      const tier = String(row.listing_tier ?? row.listing_option ?? "").toLowerCase();
      const match = LISTING_OPTIONS.find(
        (o) => tier.includes(o.value.toLowerCase()) || (o.value === "Set your own price" && tier.includes("own")),
      );
      setListingOption(match?.value ?? "Starter");

      setCoOwnerName(row.deed_owner_names ?? "");
      setPhone(row.phone ?? "");
      setEmail(row.email ?? seller.email ?? "");
      setCemetery(row.cemetery ?? seller.cemetery ?? "");
      setCountyState(row.cemetery_city ? `${row.cemetery_city}, TX` : "");
      setPlotDescription(
        formatPlotDescription({
          section: row.section,
          lawn: row.lawn,
          spaces: row.spaces,
          space_numbers: row.space_numbers,
        }),
      );

      // Mailing address from the family-tree questionnaire, when the seller gave one.
      const oa = (row.ownership_answers ?? {}) as any;
      const people: any[] = Array.isArray(oa?.people) ? oa.people : [];
      const me =
        people.find((p) => String(p?.name ?? "").toLowerCase() === String(seller.name ?? "").toLowerCase()) ??
        people[0];
      if (me?.address) setAddress(String(me.address));
      if (me?.city_state_zip) setCityStateZip(String(me.city_state_zip));

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [seller.id, seller.name, seller.spaces, seller.email, seller.cemetery, netPerPlot]);

  // Keep in step with the quote above while the broker edits it.
  useEffect(() => {
    if (Number(netPerPlot) > 0) setPerPlot(String(Math.round(Number(netPerPlot))));
  }, [netPerPlot]);

  const plots = Math.max(1, Number(plotCount) || 1);
  // Per-space price is the source of truth; the contract total is derived from it.
  const effectivePerPlot = Number(perPlot) || 0;
  const total = effectivePerPlot > 0 ? effectivePerPlot * plots : 0;
  const canGenerate = total > 0 && !busy && !loading;

  const generate = async () => {
    if (!canGenerate) return;
    setBusy(true);
    try {
      const clean = (v: string) => (v.trim() ? v.trim() : undefined);
      const res = await buildListingAgreementBlock({
        submissionId: seller.id,
        cemetery: cemetery || seller.cemetery,
        authorizedMinTotal: total,
        plotCount: plots,
        overrides: {
          seller_name: clean(sellerName),
          co_owner_name: clean(coOwnerName),
          address: clean(address),
          city_state_zip: clean(cityStateZip),
          phone: clean(phone),
          email: clean(email),
          cemetery: clean(cemetery),
          county_state: clean(countyState),
          plot_count: plots,
          plot_description: clean(plotDescription),
          authorized_min_total: total,
          authorized_min_per_plot: effectivePerPlot || undefined,
          ...(hideListingOption ? {} : { listing_option: listingOption }),
        },
      });
      // Keep the submission's deed owner names in sync so the family tree
      // (sent automatically once this agreement is signed) starts from the
      // same names we just put on the contract.
      const deedNames = clean(coOwnerName);
      if (deedNames) {
        await supabase
          .from("contact_submissions")
          .update({ deed_owner_names: deedNames })
          .eq("id", seller.id);
      }
      setSignUrl(res.signUrl ?? null);
      onGenerated(res.html, { signToken: res.signToken, signUrl: res.signUrl });

      toast({
        title: hasGenerated ? "Agreement regenerated" : "Listing agreement inserted",
        description: "Preview the email, then send it down the thread.",
      });
    } catch (e: any) {
      toast({ title: "Couldn't generate agreement", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-[#1f2a37]/25 bg-[#1f2a37]/5 p-3 space-y-3">
      <div className="flex items-center gap-1.5">
        <FileSignature className="w-3.5 h-3.5 text-foreground" />
        <p className="text-[10px] uppercase tracking-[0.18em] text-foreground font-semibold">
          Listing agreement for {properCase(seller.name || "Seller")}
        </p>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-border/60 bg-background hover:bg-muted"
        >
          {showAll ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
          {showAll ? "Hide extra fields" : "Show all fields"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Field label="Seller name on contract">
          <input type="text" value={sellerName} onChange={(e) => setSellerName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="# of spaces">
          <input
            type="number"
            min="1"
            step="1"
            value={plotCount}
            onChange={(e) => setPlotCount(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Guaranteed net per space" hint={`× ${plots} space${plots === 1 ? "" : "s"} = ${total > 0 ? fmtUsd(total) : "—"} total`}>
          <input
            type="number"
            min="0"
            step="50"
            value={perPlot}
            onChange={(e) => setPerPlot(e.target.value)}
            placeholder={loading ? "Loading…" : "e.g. 2650"}
            className={inputCls}
          />
        </Field>
      </div>

      {/* Listing option the seller paid for — ticks the matching box on page 2. */}
      {!hideListingOption && (
      <div>
        <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
          Listing option the seller selected
        </label>
        <div className="flex flex-wrap gap-1.5">
          {LISTING_OPTIONS.map((o) => {
            const active = listingOption === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setListingOption(o.value)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? "bg-[#1f2a37] text-white border-[#1f2a37]"
                    : "bg-background text-foreground border-border/60 hover:bg-muted"
                }`}
              >
                {o.label}
                <span className={active ? "text-white/60" : "text-muted-foreground"}>{o.note}</span>
              </button>
            );
          })}
        </div>
        {listingOption === "Set your own price" && (
          <p className="text-[9px] text-muted-foreground mt-1">
            Ticks the Featured box on the contract (this tier includes everything in Featured).
          </p>
        )}
      </div>
      )}

      {showAll && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1 border-t border-border/50">
          <Field label="Co-owner / deed owner names">
            <input type="text" value={coOwnerName} onChange={(e) => setCoOwnerName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Mailing address">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="From questionnaire"
              className={inputCls}
            />
          </Field>
          <Field label="City, State ZIP">
            <input
              type="text"
              value={cityStateZip}
              onChange={(e) => setCityStateZip(e.target.value)}
              placeholder="From questionnaire"
              className={inputCls}
            />
          </Field>
          <Field label="Phone">
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Email">
            <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Cemetery">
            <input type="text" value={cemetery} onChange={(e) => setCemetery(e.target.value)} className={inputCls} />
          </Field>
          <Field label="County / State" hint="Where the property sits.">
            <input
              type="text"
              value={countyState}
              onChange={(e) => setCountyState(e.target.value)}
              placeholder="e.g. Dallas, TX"
              className={inputCls}
            />
          </Field>
          <Field label="Authorized minimum total" hint="Per space × spaces — printed on the agreement.">
            <input type="text" readOnly value={total > 0 ? fmtUsd(total) : "—"} className={`${inputCls} bg-muted/50`} />
          </Field>
          <div className="col-span-2 md:col-span-3">
            <Field label="Property description" hint="Section / lawn / space numbers printed on page 1.">
              <input
                type="text"
                value={plotDescription}
                onChange={(e) => setPlotDescription(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11px] text-muted-foreground">
          {total > 0 ? (
            <>
              {hideListingOption ? "Tier set on acceptance" : listingOption} · authorized minimum {fmtUsd(total)} across {plots} space{plots === 1 ? "" : "s"}
              {effectivePerPlot ? <> ({fmtUsd(effectivePerPlot)} each)</> : null} · {cemetery || "cemetery"}
            </>
          ) : (
            "Enter the guaranteed net total the seller accepted."
          )}
        </p>
        <div className="flex items-center gap-2">
        {signUrl ? (
          <a
            href={signUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted"
          >
            <ExternalLink className="w-3 h-3" />
            Open seller page
          </a>
        ) : null}
        <button
          type="button"
          onClick={generate}
          disabled={!canGenerate}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-[#1f2a37] text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : hasGenerated ? <RefreshCw className="w-3 h-3" /> : <FileSignature className="w-3 h-3" />}
          {busy ? "Generating…" : hasGenerated ? "Regenerate agreement" : "Generate agreement"}
        </button>
        </div>
      </div>
    </div>
  );
}
