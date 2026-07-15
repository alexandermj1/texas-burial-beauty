// Inline "Quote (with pay buttons)" builder that lives inside the composer
// (no dialog, no overlay). Admin enters price + transfer fee, clicks
// "Generate quote email", and the full offer + Starter/Pro/Featured cards
// are inserted into the message body before the signature.

import { useEffect, useState } from "react";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { properCase } from "@/lib/properCase";
import { useToast } from "@/hooks/use-toast";
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

export default function ListingOptionsInlinePanel({ seller, onGenerated, hasGenerated }: Props) {
  const { toast } = useToast();
  const defaultSpaces = parseSpaces(seller.spaces);
  const [netPerPlot, setNetPerPlot] = useState<string>("");
  const [plotCount, setPlotCount] = useState<string>(String(defaultSpaces));
  const [transferFee, setTransferFee] = useState<string>("395");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPlotCount(String(parseSpaces(seller.spaces)));
  }, [seller.id, seller.spaces]);

  const nppNum = Number(netPerPlot) || 0;
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
      });
      onGenerated(html);
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
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block">
            Authorized sale / plot (USD)
          </label>
          <input
            type="number"
            min="0"
            step="50"
            value={netPerPlot}
            onChange={(e) => setNetPerPlot(e.target.value)}
            placeholder="2000"
            className="w-full h-9 px-2 rounded-md bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
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
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          {canGenerate ? (
            <>
              {fmtUsd(nppNum)} × {countNum} plot{countNum === 1 ? "" : "s"} ={" "}
              <span className="text-foreground font-semibold">{fmtUsd(total)}</span>{" "}
              authorized sale · seller nets {fmtUsd(Math.round(nppNum * 0.85))}/plot after 15% commission
              {feeNum > 0 ? <> · {fmtUsd(feeNum)} buyer-paid transfer fee</> : null}
            </>
          ) : (
            "Enter the authorized sale price per plot to generate the quote email."
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
