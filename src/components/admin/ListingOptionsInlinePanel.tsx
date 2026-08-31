// Inline "Seller pack" builder that lives inside the composer.
//
// It is a single page: pricing, the deed viewer with the AI-read owner names,
// the roster the family tree is built from, and the agreement wording all sit
// together. Each downstream document can be viewed individually from the top
// of the panel before anything is sent.

import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, RefreshCw, FileSignature, Network, Plus, X, Send } from "lucide-react";
import { properCase } from "@/lib/properCase";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getPaymentsEnvironment } from "@/lib/paymentEnvironment";
import { formatPlotDescription } from "@/lib/plotDescription";
import ListingAgreementInlinePanel from "./ListingAgreementInlinePanel";
import DeedNameChecker from "./DeedNameChecker";
import {
  buildFamilyTreeBlock,
  defaultFamilyTreeHelpNote,
  defaultFamilyTreeParagraphs,
} from "@/lib/buildFamilyTreeBlock";
import { properFirstName } from "@/lib/properCase";
import { cleanDisplayName } from "@/lib/displayName";
import {
  buildListingOptionsBlock,
  parseSpaces,
  type SellerForBlock,
} from "@/lib/buildListingOptionsBlock";

interface Props {
  seller: SellerForBlock;
  onGenerated: (html: string) => void;
  /** Insert the quote block and send the email in one click. */
  onGeneratedAndSend?: (html: string) => void | Promise<void>;
  hasGenerated: boolean;
  sending?: boolean;
}

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const round100 = (n: number) => Math.round(n / 100) * 100;

const feeString = (raw: number | string | null | undefined) => {
  if (raw === null || raw === undefined || raw === "") return "395";
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? String(n) : "395";
};

const inputCls =
  "w-full h-9 px-2 rounded-md bg-background border border-border/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

const labelCls =
  "text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-1 block";

type RosterEntry = { name: string; deceased?: boolean };

export default function ListingOptionsInlinePanel({ seller, onGenerated, onGeneratedAndSend, hasGenerated, sending }: Props) {
  const { toast } = useToast();
  const defaultSpaces = parseSpaces(seller.spaces);
  const [retail, setRetail] = useState<string>("");
  const [netPerPlot, setNetPerPlot] = useState<string>("");
  const [salesPrice, setSalesPrice] = useState<string>("");
  const [netTouched, setNetTouched] = useState(false);
  const [salesTouched, setSalesTouched] = useState(false);
  const [plotCount, setPlotCount] = useState<string>(String(defaultSpaces));
  const [transferFee, setTransferFee] = useState<string>(() => feeString(seller.transfer_fee_amount));
  // Names exactly as they appear on the deed. Confirmed here, at quote time,
  // because acceptance now automatically produces the listing agreement (and
  // then the family tree) with no chance to correct them in between.
  const [deedOwners, setDeedOwners] = useState<string>("");
  const [plotDescription, setPlotDescription] = useState<string>("");
  const [countyState, setCountyState] = useState<string>("");
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  // The exact emails the seller will receive after they accept — prepared with
  // the very same builders the standalone buttons use, so nothing differs.
  const [agreementEmailHtml, setAgreementEmailHtml] = useState<string>("");
  const [familyTreeEmailHtml, setFamilyTreeEmailHtml] = useState<string>("");

  // Pre-fill everything we already hold on the submission.
  useEffect(() => {
    let cancelled = false;
    setDeedOwners("");
    setRoster([]);
    (async () => {
      const { data } = await supabase
        .from("contact_submissions")
        .select("deed_owner_names, name, section, lawn, spaces, space_numbers, plot_description, cemetery_city, ownership_roster, seller_attachments")
        .eq("id", seller.id)
        .maybeSingle();
      if (cancelled) return;
      const row = (data as any) || {};
      const names = String(row.deed_owner_names || row.name || seller.name || "").trim();
      setDeedOwners(names);
      // Whatever the broker typed before wins — that exact wording carries all
      // the way through to the agreement, POA and document request.
      setPlotDescription(
        String(row.plot_description ?? "").trim() ||
        formatPlotDescription({
          section: row.section ?? seller.section,
          lawn: row.lawn ?? seller.lawn,
          spaces: row.spaces ?? seller.spaces,
          space_numbers: row.space_numbers ?? seller.space_numbers,
        }),
      );
      setCountyState(row.cemetery_city ? `${row.cemetery_city}, TX` : "");
      const existing = Array.isArray(row.ownership_roster) ? (row.ownership_roster as RosterEntry[]) : [];
      setRoster(
        existing.length
          ? existing.map((p) => ({ name: String(p.name ?? ""), deceased: !!p.deceased }))
          : names
            ? names.split(/\s*(?:&|and|,)\s*/i).filter(Boolean).map((n) => ({ name: n, deceased: false }))
            : [],
      );

    })();
    return () => { cancelled = true; };
  }, [seller.id, seller.name, seller.section, seller.lawn, seller.spaces, seller.space_numbers]);

  useEffect(() => {
    setPlotCount(String(parseSpaces(seller.spaces)));
    setRetail("");
    setNetPerPlot("");
    setSalesPrice("");
    setNetTouched(false);
    setSalesTouched(false);
    setTransferFee(feeString(seller.transfer_fee_amount));

    // If the submission doesn't already have a saved transfer_fee_amount,
    // look it up from the cemetery record so admins always see the current
    // per-cemetery rate rather than the generic $395 default.
    if (seller.transfer_fee_amount != null && seller.transfer_fee_amount !== "") return;
    const name = (seller.cemetery || "").trim();
    if (!name) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: canonData } = await supabase.rpc("canonical_cemetery" as any, { name });
        const canon = (canonData as any) || null;
        let row: any = null;
        if (canon) {
          const { data: rows } = await supabase
            .from("texas_cemeteries" as any)
            .select("transfer_fee")
            .eq("canonical_name", canon)
            .not("transfer_fee", "is", null)
            .limit(1);
          row = rows?.[0] ?? null;
        }
        if (!row) {
          const { data: rows } = await supabase
            .from("texas_cemeteries" as any)
            .select("transfer_fee")
            .ilike("name", `%${name}%`)
            .not("transfer_fee", "is", null)
            .limit(1);
          row = rows?.[0] ?? null;
        }
        if (cancelled) return;
        const fee = row?.transfer_fee;
        if (fee != null && fee !== "") setTransferFee(String(fee));
      } catch (e) {
        console.warn("transfer fee autofill failed", e);
      }
    })();
    return () => { cancelled = true; };
  }, [seller.id, seller.spaces, seller.cemetery, seller.transfer_fee_amount]);

  const handleRetailChange = (v: string) => {
    setRetail(v);
    const r = Number(v);
    if (isFinite(r) && r > 0) {
      if (!netTouched) setNetPerPlot(String(round100(r * 0.55)));
      if (!salesTouched) setSalesPrice(String(round100(r * 0.67)));
    }
  };

  const nppNum = Number(netPerPlot) || 0;
  const salesNum = Number(salesPrice) || 0;
  const retailNum = Number(retail) || 0;
  const countNum = Math.max(1, Number(plotCount) || 1);
  const feeNum = Number(transferFee) || 0;
  const total = nppNum * countNum;
  const deedOwnersClean = deedOwners.trim();
  const canGenerate = nppNum > 0 && countNum > 0 && deedOwnersClean.length > 1;

  const prepBlock = useMemo(
    () => ({
      preparedAt: new Date().toISOString(),
      netPerPlot: nppNum,
      plotCount: countNum,
      authorizedMinTotal: total,
      salesPricePerPlot: salesNum || null,
      transferFee: feeNum || null,
      deedOwnerNames: deedOwnersClean,
      plotDescription: plotDescription.trim() || null,
      countyState: countyState.trim() || null,
      agreementEmailHtml: agreementEmailHtml || null,
      familyTreeEmailHtml: familyTreeEmailHtml || null,
    }),
    [nppNum, countNum, total, salesNum, feeNum, deedOwnersClean, plotDescription, countyState, agreementEmailHtml, familyTreeEmailHtml],
  );

  /** Save everything the later automated steps depend on. */
  const savePrep = async () => {
    const { data: current } = await supabase
      .from("contact_submissions")
      .select("ownership_answers")
      .eq("id", seller.id)
      .maybeSingle();
    const answers = ((current as any)?.ownership_answers ?? {}) as Record<string, unknown>;
    await supabase
      .from("contact_submissions")
      .update({
        cemetery_retail: retailNum > 0 ? retailNum : null,
        quote_amount: nppNum > 0 ? nppNum : null,
        transfer_fee_amount: feeNum > 0 ? feeNum : null,
        plot_count: countNum,
        list_price: salesNum > 0 ? salesNum * countNum : null,
        deed_owner_names: deedOwnersClean,
        plot_description: plotDescription.trim() || null,
        ownership_roster: roster.filter((r) => r.name.trim()) as never,
        ownership_answers: {
          ...answers,
          autopilot: { ...((answers as any).autopilot ?? {}), ...prepBlock },
        },
      } as any)
      .eq("id", seller.id);
  };

  /** Save prep plus an immediate patch (state updates are async). */
  const savePrepWith = async (patch: Record<string, unknown>) => {
    const { data: current } = await supabase
      .from("contact_submissions")
      .select("ownership_answers")
      .eq("id", seller.id)
      .maybeSingle();
    const answers = ((current as any)?.ownership_answers ?? {}) as Record<string, unknown>;
    await supabase
      .from("contact_submissions")
      .update({
        ownership_answers: {
          ...answers,
          autopilot: { ...((answers as any).autopilot ?? {}), ...prepBlock, ...patch },
        },
      } as any)
      .eq("id", seller.id);
  };

  /**
   * Build a real draft of the listing agreement and open the seller's signing
   * page (/sign/:token) — the exact screen they'll land on once they accept.
   * The listing option is deliberately left unset here, so the page shows the
   * package choice open (it only locks once they pick a package in the quote).
   */
  const previewAgreement = async () => {
    if (previewing) return;
    setPreviewing(true);
    try {
      await savePrep();
      const { data, error } = await supabase.functions.invoke("generate-contract", {
        body: {
          submission_id: seller.id,
          kind: "listing_agreement",
          overrides: {
            plot_count: countNum,
            authorized_min_total: total,
            authorized_min_per_plot: nppNum,
            co_owner_name: deedOwnersClean,
            plot_description: plotDescription.trim() || undefined,
            county_state: countyState.trim() || undefined,
            listing_option: "",
          },
        },
      });
      if (error) throw error;
      const token = (data as any)?.sign_token;
      if (!token) throw new Error("No signing link returned");
      window.open(`/sign/${token}`, "_blank", "noopener");
      toast({
        title: "Signing page opened",
        description: "This is exactly what the seller sees — nothing has been sent, and no package is selected yet.",
      });
    } catch (e: any) {
      toast({ title: "Couldn't open the signing page", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  const previewFamilyTree = async () => {
    await savePrep();
    window.open(`/confirm?s=${seller.id}`, "_blank", "noopener");
  };

  const generate = async (sendNow = false) => {
    if (!canGenerate || busy) return;
    setBusy(true);
    try {
      // The family-tree email is standard copy — build it from the roster we
      // just confirmed so the broker never has to write it.
      const firstName = properFirstName(cleanDisplayName(seller.name || "")) || "there";
      const treeHtml = buildFamilyTreeBlock({
        submissionId: seller.id,
        cemetery: properCase(seller.cemetery || ""),
        paragraphs: defaultFamilyTreeParagraphs(firstName, properCase(seller.cemetery || "")),
        ctaLabel: "Confirm your details →",
        helpNote: defaultFamilyTreeHelpNote,
      });
      setFamilyTreeEmailHtml(treeHtml);
      const html = await buildListingOptionsBlock({
        seller,
        netPerPlot: nppNum,
        plotCount: countNum,
        transferFee: feeNum,
        environment: getPaymentsEnvironment(),
        // The broker-typed description is the single source of truth — it also
        // lands on the listing agreement, POAs and family tree.
        plotDescription: plotDescription.trim() || null,
      });
      // Persist the retail + quote amount (and the prepared family-tree email)
      // before anything goes out, so the automated chain has it all.
      try {
        if (seller.id) {
          await savePrep();
          await savePrepWith({ familyTreeEmailHtml: treeHtml });
        }
      } catch (err) {
        console.warn("Could not save quote fields to submission", err);
      }
      if (sendNow && onGeneratedAndSend) await onGeneratedAndSend(html);
      else onGenerated(html);
      toast({
        title: sendNow ? "Quote sent" : hasGenerated ? "Quote regenerated" : "Quote inserted",
        description: "Accepting takes them straight to the agreement, then to the family tree.",
      });
    } catch (e: any) {
      toast({ title: "Couldn't generate", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  /** Add names read off the deed to both the agreement line and the roster. */
  const addNames = (names: string[]) => {
    const clean = names.map((n) => n.trim()).filter(Boolean);
    if (!clean.length) return;
    setDeedOwners((prev) => {
      const have = prev.split(/\s*(?:&|and|,)\s*/i).map((s) => s.trim().toLowerCase()).filter(Boolean);
      const add = clean.filter((n) => !have.includes(n.toLowerCase()));
      if (!add.length) return prev;
      return [prev.trim(), ...add].filter(Boolean).join(" & ");
    });
    setRoster((prev) => {
      const have = prev.map((p) => p.name.trim().toLowerCase());
      const add = clean.filter((n) => !have.includes(n.toLowerCase())).map((n) => ({ name: n, deceased: false }));
      return add.length ? [...prev, ...add] : prev;
    });
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <p className="text-[10px] uppercase tracking-[0.18em] text-primary font-semibold">
            Seller pack for {properCase(seller.name || "Seller")} — quote, listing agreement & family tree
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button" onClick={previewAgreement} disabled={previewing}
            className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            {previewing ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSignature className="w-3 h-3" />}
            {previewing ? "Building…" : "View signing page"}
          </button>
          <button
            type="button" onClick={previewFamilyTree}
            className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-primary/40 text-primary hover:bg-primary/10"
          >
            <Network className="w-3 h-3" /> View family tree page
          </button>
        </div>
      </div>

      {/* ── Everything the pack needs, on one page ─────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div>
          <label className={labelCls}>Retail / plot (USD)</label>
          <input
            type="number" min="0" step="50" value={retail}
            onChange={(e) => handleRetailChange(e.target.value)}
            placeholder="e.g. 6000" className={inputCls}
          />
          <p className="text-[9px] text-muted-foreground mt-1">Cemetery retail. Auto-fills the two below.</p>
        </div>
        <div>
          <label className={labelCls}>Quote (net) / plot</label>
          <input
            type="number" min="0" step="50" value={netPerPlot}
            onChange={(e) => { setNetPerPlot(e.target.value); setNetTouched(true); }}
            placeholder="55% of retail" className={inputCls}
          />
          <p className="text-[9px] text-muted-foreground mt-1">55% of retail, rounded to $100.</p>
        </div>
        <div>
          <label className={labelCls}>Sales price / plot</label>
          <input
            type="number" min="0" step="50" value={salesPrice}
            onChange={(e) => { setSalesPrice(e.target.value); setSalesTouched(true); }}
            placeholder="67% of retail" className={inputCls}
          />
          <p className="text-[9px] text-muted-foreground mt-1">67% of retail, rounded to $100.</p>
        </div>
        <div>
          <label className={labelCls}># of plots</label>
          <input
            type="number" min="1" step="1" value={plotCount}
            onChange={(e) => setPlotCount(e.target.value)} className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Transfer fee (USD)</label>
          <input
            type="number" min="0" step="5" value={transferFee}
            onChange={(e) => setTransferFee(e.target.value)} className={inputCls}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            The deed they sent — check the names
          </p>
          <DeedNameChecker submissionId={seller.id} onUseNames={addNames} />
        </div>

        <div className="space-y-2">
          <div>
            <label className={labelCls}>Names on the deed (required — used by the agreement)</label>
            <input
              type="text" value={deedOwners}
              onChange={(e) => setDeedOwners(e.target.value)}
              placeholder="e.g. John A. Smith & Mary Smith" className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Family-tree roster (one per owner)</label>
            {roster.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text" value={r.name}
                  onChange={(e) =>
                    setRoster((prev) => prev.map((p, j) => (j === i ? { ...p, name: e.target.value } : p)))
                  }
                  placeholder="Name as it appears on the deed" className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setRoster((prev) => prev.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRoster((prev) => [...prev, { name: "", deceased: false }])}
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              <Plus className="w-3 h-3" /> Add a name from the deed
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className={labelCls}>Plot description</label>
              <input
                type="text" value={plotDescription}
                onChange={(e) => setPlotDescription(e.target.value)}
                placeholder="Section / lawn / spaces" className={inputCls}
              />
            </div>
          </div>
        </div>
      </div>

      <details className="rounded-md border border-border/60 bg-background/60 p-2">
        <summary className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold cursor-pointer">
          The agreement email they receive on acceptance
        </summary>
        <div className="mt-2">
          <ListingAgreementInlinePanel
            seller={{
              id: seller.id,
              name: seller.name,
              email: seller.email,
              cemetery: seller.cemetery,
              section: seller.section,
              property_type: seller.property_type,
              spaces: String(countNum),
              space_numbers: seller.space_numbers ?? null,
            }}
            hideListingOption
            netPerPlot={nppNum}
            hasGenerated={!!agreementEmailHtml}
            onGenerated={async (html) => {
              setAgreementEmailHtml(html);
              await savePrepWith({ agreementEmailHtml: html });
              toast({
                title: "Agreement email prepared",
                description: "This exact email is sent automatically the moment they accept.",
              });
            }}
          />
        </div>
      </details>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11px] text-muted-foreground">
          {canGenerate ? (
            <>
              {fmtUsd(nppNum)} × {countNum} plot{countNum === 1 ? "" : "s"} ={" "}
              <span className="text-foreground font-semibold">{fmtUsd(total)}</span> guaranteed net
              {salesNum > 0 ? <> · list at {fmtUsd(salesNum)}/plot</> : null}
              {feeNum > 0 ? <> · {fmtUsd(feeNum)} buyer-paid transfer fee</> : null}
            </>
          ) : nppNum > 0 && !deedOwnersClean ? (
            "Add the names exactly as they appear on the deed before sending."
          ) : (
            "Enter the retail price per plot — the quote and sales price will auto-calculate."
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button" onClick={() => generate(false)} disabled={!canGenerate || busy}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : hasGenerated ? <RefreshCw className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
            {busy ? "Preparing…" : hasGenerated ? "Regenerate email" : "Insert email"}
          </button>
          {onGeneratedAndSend && (
            <button
              type="button" onClick={() => generate(true)} disabled={!canGenerate || busy || !!sending}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy || sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              {sending ? "Sending…" : "Send seller pack"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
