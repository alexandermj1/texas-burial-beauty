import { fetchDeedSellingLocation } from "@/lib/deedSellingLocation";
// Inline "Seller pack" builder that lives inside the composer.
//
// It is a single page: pricing, the deed viewer with the AI-read owner names,
// the roster the family tree is built from, and the agreement wording all sit
// together. Each downstream document can be viewed individually from the top
// of the panel before anything is sent.

import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, RefreshCw, FileSignature, Network, Plus, X, Send, Phone, ChevronDown } from "lucide-react";
import { cemeteryCanon, pickBestCemeteryProfile } from "@/lib/cemeteryCanon";
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
import {
  suggestedNetPerSpace,
  exceedsBuyerCeiling,
  buyerPriceFromNet,
  MAX_BUYER_PCT_OF_RETAIL,
} from "@/lib/quoteFigures";

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

const normKey = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, "").trim();

/** One box per owner: split a stored "A & B, C" string back into people. */
const splitNames = (raw: string): string[] => {
  const parts = String(raw || "")
    .split(/\s*(?:&|,|;|\band\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : [""];
};

/** Split deed names into one roster entry per person, carrying over any
    deceased flag already recorded against that name so a re-save from this
    panel never downgrades what the questionnaire established. */

const rosterFromNames = (raw: string, existing?: unknown): RosterEntry[] => {
  const prev = new Map<string, boolean>();
  if (Array.isArray(existing)) {
    for (const p of existing as Record<string, unknown>[]) {
      const n = String(p?.name ?? "").trim();
      if (n && (p?.deceased === true || p?.role === "decedent")) prev.set(normKey(n), true);
    }
  }
  return String(raw || "")
    .split(/\s*(?:&|,|;|\band\b)\s*/i)
    .filter(Boolean)
    .map((name) => (prev.get(normKey(name)) ? { name, deceased: true } : { name }));
};

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
  // One box per person on the deed — a deed often carries two or more owners,
  // and the family tree starts from every one of them.
  const [ownerNames, setOwnerNames] = useState<string[]>([""]);

  const [plotDescription, setPlotDescription] = useState<string>("");
  const [countyState, setCountyState] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  // The cemetery's profile (phone number above all) — quoting usually needs a
  // call to the cemetery first, so their details sit at the top of the pack.
  const [cemProfile, setCemProfile] = useState<any>(null);
  const [cemOpen, setCemOpen] = useState(true);
  // A price the broker was just quoted on the phone, saved straight onto the
  // cemetery profile so the next quote already has it.
  const [sectionDraft, setSectionDraft] = useState<{ name: string; property_type: string; price: string }>({
    name: "", property_type: "", price: "",
  });
  const [savingSection, setSavingSection] = useState(false);
  // The exact emails the seller will receive after they accept — prepared with
  // the very same builders the standalone buttons use, so nothing differs.
  const [agreementEmailHtml, setAgreementEmailHtml] = useState<string>("");
  const [familyTreeEmailHtml, setFamilyTreeEmailHtml] = useState<string>("");

  // Pre-fill everything we already hold on the submission.
  useEffect(() => {
    let cancelled = false;
    setOwnerNames([""]);
    (async () => {
      const { data } = await supabase
        .from("contact_submissions")
        .select("deed_owner_names, name, email, section, lawn, spaces, space_numbers, plot_description, cemetery_city, ownership_roster, seller_attachments")
        .eq("id", seller.id)
        .maybeSingle();
      if (cancelled) return;
      const row = (data as any) || {};
      const names = String(row.deed_owner_names || row.name || seller.name || "").trim();
      setOwnerNames(splitNames(names));
      // Whatever the broker typed before wins — that exact wording carries all
      // the way through to the agreement, POA and document request.
      const saved = String(row.plot_description ?? "").trim();
      setPlotDescription(saved);
      if (!saved) {
        // Fall back to the deed reading — the same wording shown as "Locations
        // being sold" at the top of the profile — before the seller's own words.
        const deedLoc = await fetchDeedSellingLocation(row.email ?? seller.email);
        if (cancelled) return;
        setPlotDescription(
          deedLoc ||
          formatPlotDescription({
            section: row.section ?? seller.section,
            lawn: row.lawn ?? seller.lawn,
            spaces: row.spaces ?? seller.spaces,
            space_numbers: row.space_numbers ?? seller.space_numbers,
          }),
        );
      }
      setCountyState(row.cemetery_city ? `${row.cemetery_city}, TX` : "");
      // No separate roster to maintain — the deed names typed here ARE the
      // family-tree seed. The tree view derives from deedOwnerNames below.

    })();
    return () => { cancelled = true; };
  }, [seller.id, seller.name, seller.section, seller.lawn, seller.spaces, seller.space_numbers]);

  useEffect(() => {
    const name = (seller.cemetery || "").trim();
    if (!name) { setCemProfile(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("texas_cemeteries" as any)
        .select("id, name, city, address, contact_name, contact_phone, contact_email, transfer_fee, typical_prices, process_info, website, description, sections");
      if (cancelled) return;
      // Two rows can share one canonical name ("Restland Memorial Park" and
      // "Restland Funeral Home & Cemetery") — always take the maintained one.
      setCemProfile(pickBestCemeteryProfile((data as any[]) || [], name));
    })();
    return () => { cancelled = true; };
  }, [seller.cemetery]);

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

  const applyRetail = (v: string, fee: number) => {
    const r = Number(v);
    if (!isFinite(r) || r <= 0) return;
    // 55% of retail, lowered whenever the transfer fee + 15% buyer's premium
    // would push what the buyer pays past 70% of retail.
    const net = suggestedNetPerSpace(r, fee);
    if (!netTouched) setNetPerPlot(String(net));
    if (!salesTouched) {
      const cap = Math.floor((MAX_BUYER_PCT_OF_RETAIL * r) / 100) * 100;
      setSalesPrice(String(Math.min(round100(r * 0.67), cap)));
    }
  };

  const handleRetailChange = (v: string) => {
    setRetail(v);
    applyRetail(v, Number(transferFee) || 0);
  };

  const handleTransferFeeChange = (v: string) => {
    setTransferFee(v);
    applyRetail(retail, Number(v) || 0);
  };

  const nppNum = Number(netPerPlot) || 0;
  const salesNum = Number(salesPrice) || 0;
  const retailNum = Number(retail) || 0;
  const countNum = Math.max(1, Number(plotCount) || 1);
  const feeNum = Number(transferFee) || 0;
  const total = nppNum * countNum;
  const ownerList = ownerNames.map((n) => n.trim()).filter(Boolean);
  const deedOwnersClean = ownerList.join(" & ");

  // The agreement, POAs and family tree are generated straight after the quote
  // is accepted, so the quote cannot go out without the wording they need.
  const canGenerate =
    nppNum > 0 && countNum > 0 && deedOwnersClean.length > 1 && plotDescription.trim().length > 2;

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
      .select("ownership_answers, ownership_roster")
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
        ownership_roster: rosterFromNames(deedOwnersClean, (current as any)?.ownership_roster),
        ownership_answers: {
          ...answers,
          autopilot: { ...((answers as any).autopilot ?? {}), ...prepBlock },
        },
      } as any)
      .eq("id", seller.id);
  };

  /** Save prep plus an immediate patch (state updates are async). */
  const savePrepWith = async (patch: Record<string, unknown>) => {
    // Persist the typed fields too (plot description above all) so anything
    // generated afterwards reads the corrected wording, not the stale row.
    await savePrep();
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
    setOwnerNames((prev) => {
      const have = prev.map((s) => s.trim().toLowerCase()).filter(Boolean);
      const add = clean.filter((n) => !have.includes(n.toLowerCase()));
      if (!add.length) return prev;
      return [...prev.filter((s) => s.trim()), ...add];
    });

  };

  const cemPhone = String(cemProfile?.contact_phone || "").trim();
  const needsRetail = !(Number(retail) > 0);

  /** Section prices already recorded on this cemetery's profile, newest first. */
  const cemSections: any[] = useMemo(() => {
    const src = Array.isArray(cemProfile?.sections) ? cemProfile.sections : [];
    return [...src].sort((a: any, b: any) => String(b?.date || "").localeCompare(String(a?.date || "")));
  }, [cemProfile]);

  /** Save a price just given over the phone onto the cemetery profile. */
  const saveSectionPrice = async () => {
    const price = Number(sectionDraft.price);
    if (!cemProfile?.id || !(price > 0)) return;
    setSavingSection(true);
    try {
      const entry = {
        id: crypto.randomUUID(),
        name: sectionDraft.name.trim() || plotDescription.trim() || "Section",
        property_type: sectionDraft.property_type.trim() || (seller.property_type ?? ""),
        price,
        date: new Date().toISOString().slice(0, 10),
        notes: "",
      };
      const next = [...(Array.isArray(cemProfile.sections) ? cemProfile.sections : []), entry];
      const { error } = await supabase
        .from("texas_cemeteries" as any)
        .update({ sections: next })
        .eq("id", cemProfile.id);
      if (error) throw error;
      setCemProfile((p: any) => ({ ...p, sections: next }));
      setSectionDraft({ name: "", property_type: "", price: "" });
      if (!(Number(retail) > 0)) handleRetailChange(String(price));
      toast({ title: "Price saved to the cemetery profile" });
    } catch (e: any) {
      toast({ title: "Couldn't save the price", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setSavingSection(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border/40 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <p className="text-sm font-semibold truncate">
            Seller pack — {properCase(seller.name || "Seller")}
          </p>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">quote · agreement · family tree</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button" onClick={previewAgreement} disabled={previewing}
            className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted text-foreground/80 transition-colors disabled:opacity-50"
          >
            {previewing ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSignature className="w-3 h-3" />}
            {previewing ? "Building…" : "Signing page"}
          </button>
          <button
            type="button" onClick={previewFamilyTree}
            className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full bg-muted/60 hover:bg-muted text-foreground/80 transition-colors"
          >
            <Network className="w-3 h-3" /> Family tree page
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* 1 — The cemetery: everything we already know, plus room to add what they tell you */}
        <div className="rounded-xl border border-border/50 bg-muted/30">
          <button
            type="button"
            onClick={() => setCemOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Step 1 — the cemetery
              </p>
              <p className="text-sm font-medium truncate">{properCase(seller.cemetery || "Cemetery")}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {cemSections.length > 0
                  ? `${cemSections.length} section price${cemSections.length === 1 ? "" : "s"} on file`
                  : cemProfile?.typical_prices
                    ? "Pricing notes on file"
                    : "No pricing recorded yet — add what they quote you below."}
              </p>
            </div>
            {cemPhone ? (
              <a
                href={`tel:${cemPhone.replace(/[^0-9+]/g, "")}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 shrink-0"
              >
                <Phone className="w-3 h-3" /> {cemPhone}
              </a>
            ) : (
              <span className="text-[11px] text-muted-foreground shrink-0">No number on file</span>
            )}
            <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${cemOpen ? "rotate-180" : ""}`} />
          </button>

          {cemOpen && (
            <div className="px-4 pb-4 pt-3 border-t border-border/40 space-y-3">
              {/* What we already have on this cemetery's profile */}
              {cemSections.length > 0 && (
                <div className="rounded-lg border border-border/50 bg-background/70 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="text-left font-medium px-2.5 py-1.5">Section</th>
                        <th className="text-left font-medium px-2.5 py-1.5">Type</th>
                        <th className="text-right font-medium px-2.5 py-1.5">Retail</th>
                        <th className="text-right font-medium px-2.5 py-1.5">As of</th>
                        <th className="px-2.5 py-1.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {cemSections.map((s: any, i: number) => (
                        <tr key={s?.id || i} className="border-t border-border/50">
                          <td className="px-2.5 py-1.5 text-foreground">{s?.name || "—"}</td>
                          <td className="px-2.5 py-1.5 text-muted-foreground">{s?.property_type || "—"}</td>
                          <td className="px-2.5 py-1.5 text-right font-medium">
                            {s?.price != null ? fmtUsd(Number(s.price)) : "—"}
                          </td>
                          <td className="px-2.5 py-1.5 text-right text-muted-foreground">{s?.date || "—"}</td>
                          <td className="px-2.5 py-1.5 text-right">
                            {s?.price != null && (
                              <button
                                type="button"
                                onClick={() => handleRetailChange(String(Number(s.price)))}
                                className="text-[11px] text-primary hover:underline"
                              >
                                Use
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {(cemProfile?.typical_prices || cemProfile?.description) && (
                <p className="text-xs text-foreground/90 whitespace-pre-wrap">
                  {cemProfile?.typical_prices || cemProfile?.description}
                </p>
              )}

              {/* Add the price you were just given on the phone */}
              <div className="rounded-lg border border-border/50 bg-background/70 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  Add a price they just quoted you
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>Section</label>
                    <input
                      type="text" value={sectionDraft.name}
                      onChange={(e) => setSectionDraft((d) => ({ ...d, name: e.target.value }))}
                      placeholder="e.g. Garden of Peace" className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Type</label>
                    <input
                      type="text" value={sectionDraft.property_type}
                      onChange={(e) => setSectionDraft((d) => ({ ...d, property_type: e.target.value }))}
                      placeholder="Plot, crypt…" className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Retail ($)</label>
                    <input
                      type="number" min="0" step="50" value={sectionDraft.price}
                      onChange={(e) => setSectionDraft((d) => ({ ...d, price: e.target.value }))}
                      placeholder="6000" className={inputCls}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={saveSectionPrice}
                    disabled={savingSection || !cemProfile?.id || !(Number(sectionDraft.price) > 0)}
                    className="h-9 inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
                  >
                    {savingSection ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Save price
                  </button>
                </div>
                {!cemProfile?.id && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    This cemetery has no profile yet — create it on the cemetery page to store prices.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                <p><span className="text-muted-foreground">Contact:</span> {cemProfile?.contact_name || "—"}</p>
                <p><span className="text-muted-foreground">Email:</span> {cemProfile?.contact_email || "—"}</p>
                <p><span className="text-muted-foreground">Address:</span> {cemProfile?.address || cemProfile?.city || "—"}</p>
                <p><span className="text-muted-foreground">Transfer fee:</span> {cemProfile?.transfer_fee != null ? `$${cemProfile.transfer_fee}` : "—"}</p>
                {cemProfile?.process_info && (
                  <p className="sm:col-span-2"><span className="text-muted-foreground">Process:</span> {cemProfile.process_info}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2 — The property being sold: the single most important line */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3.5">
          <label className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1.5 block">
            Step 2 — the plots being sold, exact wording
          </label>
          <input
            type="text" value={plotDescription}
            onChange={(e) => setPlotDescription(e.target.value)}
            placeholder="e.g. Section 3, Block 14, Lot 491, Space 3"
            className="w-full h-11 px-3 rounded-lg bg-background border border-primary/30 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <p className="text-[10px] text-muted-foreground mt-1.5">
            This wording goes word-for-word into the quote email, the listing agreement, the family tree and every document we request.
          </p>
        </div>

        {/* 3 — Pricing */}
        <div className="rounded-xl border border-border/50 px-4 py-3.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2.5">
            Step 3 — pricing
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Retail / plot (USD)</label>
              <input
                type="number" min="0" step="50" value={retail}
                onChange={(e) => handleRetailChange(e.target.value)}
                placeholder="e.g. 6000" className={inputCls}
              />
              <p className="text-[9px] text-muted-foreground mt-1">Cemetery retail. Sets the quote below.</p>
            </div>
            <div>
              <label className={labelCls}>Quote (net) / plot</label>
              <input
                type="number" min="0" step="50" value={netPerPlot}
                onChange={(e) => { setNetPerPlot(e.target.value); setNetTouched(true); }}
                placeholder="55% of retail" className={inputCls}
              />
              {exceedsBuyerCeiling(nppNum, retailNum, feeNum) ? (
                <p className="text-[9px] text-destructive mt-1">
                  Too high — with the {fmtUsd(feeNum)} transfer fee and the 15% buyer's fee the buyer pays{" "}
                  {fmtUsd(buyerPriceFromNet(nppNum, feeNum))}, which is{" "}
                  {Math.round((buyerPriceFromNet(nppNum, feeNum) / retailNum) * 100)}% of retail. Max{" "}
                  {fmtUsd(suggestedNetPerSpace(retailNum, feeNum))}.
                </p>
              ) : (
                <p className="text-[9px] text-muted-foreground mt-1">
                  55% of retail, capped so the buyer never pays over {Math.round(MAX_BUYER_PCT_OF_RETAIL * 100)}% of retail.
                </p>
              )}
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
        </div>

        {/* 4 — Owners */}
        <div className="rounded-xl border border-border/50 px-4 py-3.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2.5">
            Step 4 — who owns the plot
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground">The deed they sent — check the names against it.</p>
              <DeedNameChecker submissionId={seller.id} onUseNames={addNames} />
            </div>

            <div className="space-y-2">
              <div>
                <label className={labelCls}>One box per owner on the deed</label>
                <div className="space-y-1.5">
                  {ownerNames.map((n, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={n}
                        onChange={(e) =>
                          setOwnerNames((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                        }
                        placeholder={i === 0 ? "e.g. John A. Smith" : "Second owner on the deed"}
                        className={inputCls}
                      />
                      {ownerNames.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setOwnerNames((prev) => prev.filter((_, idx) => idx !== i))}
                          className="shrink-0 h-9 w-9 rounded-md border border-border/60 text-muted-foreground hover:text-destructive hover:border-destructive/50 text-sm"
                          aria-label={`Remove owner ${i + 1}`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setOwnerNames((prev) => [...prev, ""])}
                  className="mt-1.5 text-[11px] text-primary hover:underline"
                >
                  + Add another owner
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                These exact names go on the listing agreement, the family tree and every power of attorney.
              </p>
            </div>
          </div>
        </div>

        <details className="rounded-xl border border-border/50 px-4 py-3">
          <summary className="text-[11px] font-medium text-muted-foreground cursor-pointer select-none">
            The agreement email they receive on acceptance
          </summary>
          <div className="mt-3">
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
              plotDescriptionOverride={plotDescription}
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
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-border/40 bg-muted/20 flex items-center justify-between gap-3 flex-wrap">
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
          ) : nppNum > 0 && plotDescription.trim().length <= 2 ? (
            "Write the exact plots being sold — the agreement and family tree are built from it."
          ) : (
            "Enter the retail price per plot — the quote and sales price will auto-calculate."
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button" onClick={() => generate(false)} disabled={!canGenerate || busy}
            className="inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full bg-muted/60 hover:bg-muted text-foreground/80 transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : hasGenerated ? <RefreshCw className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
            {busy ? "Preparing…" : hasGenerated ? "Regenerate email" : "Insert email"}
          </button>
          {onGeneratedAndSend && (
            <button
              type="button" onClick={() => generate(true)} disabled={!canGenerate || busy || !!sending}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
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
