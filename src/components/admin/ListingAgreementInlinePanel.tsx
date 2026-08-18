// Inline "Listing agreement" builder that lives inside the email composer —
// the exact same pattern as the quote (listing options) panel. The admin
// checks the key fields, clicks Generate, and the signing block is inserted
// into the email so it can be previewed and sent straight down the Gmail
// thread (which is what actually reaches the seller's inbox).

import { useEffect, useState } from "react";
import { Loader2, FileSignature, RefreshCw } from "lucide-react";
import { properCase } from "@/lib/properCase";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { buildListingAgreementBlock } from "@/lib/buildListingAgreementBlock";

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
  onGenerated: (html: string, meta: { signToken: string; signUrl: string }) => void;
}

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const parseCount = (raw?: string | null) => {
  const n = Number(String(raw ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 1;
};

export default function ListingAgreementInlinePanel({ seller, hasGenerated, onGenerated }: Props) {
  const { toast } = useToast();
  const [plotCount, setPlotCount] = useState<string>(String(parseCount(seller.spaces)));
  const [netTotal, setNetTotal] = useState<string>("");
  const [sellerName, setSellerName] = useState<string>(seller.name ?? "");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSellerName(seller.name ?? "");
    (async () => {
      const { data } = await supabase
        .from("contact_submissions")
        .select("quote_amount, plot_count, spaces, cemetery_retail, list_price")
        .eq("id", seller.id)
        .maybeSingle();
      if (cancelled) return;
      const row = (data as any) || {};
      const plots = parseCount(row.plot_count ?? row.spaces ?? seller.spaces);
      setPlotCount(String(plots));
      const quote = Number(row.quote_amount) || 0;
      const total = quote > 0 ? quote * plots : Number(row.list_price) || 0;
      setNetTotal(total > 0 ? String(total) : "");
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [seller.id, seller.name, seller.spaces]);

  const plots = Math.max(1, Number(plotCount) || 1);
  const total = Number(netTotal) || 0;
  const canGenerate = total > 0 && !busy && !loading;

  const generate = async () => {
    if (!canGenerate) return;
    setBusy(true);
    try {
      const res = await buildListingAgreementBlock({
        submissionId: seller.id,
        cemetery: seller.cemetery,
        authorizedMinTotal: total,
        plotCount: plots,
        overrides: {
          seller_name: sellerName?.trim() || undefined,
          plot_count: plots,
          authorized_min_total: total,
        },
      });
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
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div>
          <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
            Seller name on contract
          </label>
          <input
            type="text"
            value={sellerName}
            onChange={(e) => setSellerName(e.target.value)}
            className="w-full h-9 px-2 rounded-md bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
            # of spaces
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={plotCount}
            onChange={(e) => setPlotCount(e.target.value)}
            className="w-full h-9 px-2 rounded-md bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
            Guaranteed net (total)
          </label>
          <input
            type="number"
            min="0"
            step="100"
            value={netTotal}
            onChange={(e) => setNetTotal(e.target.value)}
            placeholder={loading ? "Loading…" : "e.g. 53000"}
            className="w-full h-9 px-2 rounded-md bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-[9px] text-muted-foreground mt-1">Authorized minimum on the agreement.</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11px] text-muted-foreground">
          {total > 0
            ? <>Authorized minimum {fmtUsd(total)} across {plots} space{plots === 1 ? "" : "s"} · {seller.cemetery || "cemetery"}</>
            : "Enter the guaranteed net total the seller accepted."}
        </p>
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
  );
}
