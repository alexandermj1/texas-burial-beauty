// Inline "Quote (with pay buttons)" builder that lives inside the composer
// (no dialog, no overlay). Admin enters the cemetery's retail price per plot;
// the quote (guaranteed net proceeds) is auto-calculated at 42% of retail
// rounded to the nearest $100, and the sales price is 67% of retail rounded
// to the nearest $100. Both may be overridden manually. Clicking
// "Generate quote email" inserts the full offer + Starter/Pro/Featured cards
// and persists the retail + quote amount to the submission so the purple
// "quoted (pending)" tag appears on the submission card.

import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { properCase } from "@/lib/properCase";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPaymentsEnvironment } from "@/lib/paymentEnvironment";
import {
  buildListingOptionsBlock,
  parseSpaces,
  type SellerForBlock,
} from "@/lib/buildListingOptionsBlock";

interface Props {
  seller: SellerForBlock;
  onGenerated: (html: string) => void;
  hasGenerated: boolean;
}

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const round100 = (n: number) => Math.round(n / 100) * 100;

export default function ListingOptionsInlinePanel({ seller, onGenerated, hasGenerated }: Props) {
  const { toast } = useToast();
  const defaultSpaces = parseSpaces(seller.spaces);
  const [retail, setRetail] = useState<string>("");
  const [netPerPlot, setNetPerPlot] = useState<string>("");
  const [salesPrice, setSalesPrice] = useState<string>("");
  const [netTouched, setNetTouched] = useState(false);
  const [salesTouched, setSalesTouched] = useState(false);
  const [plotCount, setPlotCount] = useState<string>(String(defaultSpaces));
  const [transferFee, setTransferFee] = useState<string>("395");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPlotCount(String(parseSpaces(seller.spaces)));
    setRetail("");
    setNetPerPlot("");
    setSalesPrice("");
    setNetTouched(false);
    setSalesTouched(false);
  }, [seller.id, seller.spaces]);

  const handleRetailChange = (v: string) => {
    setRetail(v);
    const r = Number(v);
    if (isFinite(r) && r > 0) {
      if (!netTouched) setNetPerPlot(String(round100(r * 0.42)));
      if (!salesTouched) setSalesPrice(String(round100(r * 0.67)));
    }
  };

  const nppNum = Number(netPerPlot) || 0;
  const salesNum = Number(salesPrice) || 0;
  const retailNum = Number(retail) || 0;
  const countNum = Math.max(1, Number(plotCount) || 1);
  const feeNum = Number(transferFee) || 0;
  const total = nppNum * countNum;
  const canGenerate = nppNum > 0 && countNum > 0;

  const generate = async () => {
    if (!canGenerate || busy) return;
    setBusy(true);
    try {
      const html = await buildListingOptionsBlock({
        seller,
        netPerPlot: nppNum,
        plotCount: countNum,
        transferFee: feeNum,
        environment: getPaymentsEnvironment(),
      });
      onGenerated(html);
      // Persist the retail + quote amount so the purple "quoted (pending)"
      // pill can render on the submission card. quote_sent_at is stamped
      // separately by the composer once the email actually sends.
      try {
        if (seller.id) {
          await supabase
            .from("contact_submissions")
            .update({
              cemetery_retail: retailNum > 0 ? retailNum : null,
              quote_amount: nppNum > 0 ? nppNum : null,
            } as any)
            .eq("id", seller.id);
        }
      } catch (err) {
        console.warn("Could not save quote fields to submission", err);
      }
      toast({
        title: hasGenerated ? "Quote regenerated" : "Quote inserted",
        description: "Offer + Starter/Pro/Featured pay buttons added to the email.",
      });
    } catch (e: any) {
      toast({ title: "Couldn't generate", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <p className="text-[10px] uppercase tracking-[0.18em] text-primary font-semibold">
          Quote details for {properCase(seller.name || "Seller")}
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div>
          <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
            Retail / plot (USD)
          </label>
          <input
            type="number"
            min="0"
            step="50"
            value={retail}
            onChange={(e) => handleRetailChange(e.target.value)}
            placeholder="e.g. 6000"
            className="w-full h-9 px-2 rounded-md bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-[9px] text-muted-foreground mt-1">Cemetery retail. Auto-fills the two below.</p>
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
            Quote (net) / plot
          </label>
          <input
            type="number"
            min="0"
            step="50"
            value={netPerPlot}
            onChange={(e) => { setNetPerPlot(e.target.value); setNetTouched(true); }}
            placeholder="42% of retail"
            className="w-full h-9 px-2 rounded-md bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-[9px] text-muted-foreground mt-1">42% of retail, rounded to $100.</p>
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
            Sales price / plot
          </label>
          <input
            type="number"
            min="0"
            step="50"
            value={salesPrice}
            onChange={(e) => { setSalesPrice(e.target.value); setSalesTouched(true); }}
            placeholder="67% of retail"
            className="w-full h-9 px-2 rounded-md bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-[9px] text-muted-foreground mt-1">67% of retail, rounded to $100.</p>
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
            # of plots
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
            Transfer fee (USD)
          </label>
          <input
            type="number"
            min="0"
            step="5"
            value={transferFee}
            onChange={(e) => setTransferFee(e.target.value)}
            className="w-full h-9 px-2 rounded-md bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11px] text-muted-foreground">
          {canGenerate ? (
            <>
              {fmtUsd(nppNum)} × {countNum} plot{countNum === 1 ? "" : "s"} ={" "}
              <span className="text-foreground font-semibold">{fmtUsd(total)}</span> guaranteed net
              {salesNum > 0 ? <> · list at {fmtUsd(salesNum)}/plot</> : null}
              {feeNum > 0 ? <> · {fmtUsd(feeNum)} buyer-paid transfer fee</> : null}
            </>
          ) : (
            "Enter the retail price per plot — the quote and sales price will auto-calculate."
          )}
        </p>
        <button
          type="button"
          onClick={generate}
          disabled={!canGenerate || busy}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : hasGenerated ? (
            <RefreshCw className="w-3 h-3" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          {busy ? "Generating…" : hasGenerated ? "Regenerate quote" : "Generate quote email"}
        </button>
      </div>
    </div>
  );
}
