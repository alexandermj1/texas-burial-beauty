// Send a selection of available seller plots (Texas submissions) to a buyer
// as branded cards in an HTML email. Each card has a "Buy this plot" button
// that links to a Stripe Checkout session created on the fly via the
// `create-payment-link` edge function. Admin can fill in or override the
// list_price inline for any submission that doesn't have one yet.

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Search, Loader2, Check, DollarSign, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { properCase } from "@/lib/properCase";

interface Props {
  open: boolean;
  onClose: () => void;
  buyer: {
    id: string;
    name: string | null;
    email: string | null;
    cemetery: string | null;
    property_type?: string | null;
  };
  adminName?: string;
  /** "send" = compose & send a standalone email; "attach" = return HTML cards block to caller for insertion into an existing composer. */
  mode?: "send" | "attach";
  /** Called in attach mode with the rendered cards HTML after Stripe links are created. */
  onAttach?: (html: string) => void;
}

interface PlotRow {
  id: string;
  name: string | null;
  cemetery: string | null;
  section: string | null;
  property_type: string | null;
  spaces: string | null;
  list_price: number | null;
  accepted_quote_amount: number | null;
  sold_at: string | null;
  deleted_at: string | null;
  state?: string | null;
  region?: string | null;
  inquiry_channel?: string | null;
}

const norm = (s: string | null | undefined) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
const fmt = (v: number | null | undefined) =>
  v == null ? "Price on request" : Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const spacesNum = (s: string | null | undefined): number => {
  if (!s) return 1;
  const n = parseInt(String(s).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

export default function SendBuyerPlotCardsDialog({ open, onClose, buyer, adminName, mode = "send", onAttach }: Props) {
  const [rows, setRows] = useState<PlotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, { selected: boolean; price: string; description: string }>>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSearch(buyer.cemetery || "");
    setSelected({});
    void load();
  }, [open, buyer.id]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_submissions")
      .select("id, name, cemetery, section, property_type, spaces, list_price, accepted_quote_amount, sold_at, deleted_at, customer_kind, source, state, region, inquiry_channel")
      .is("deleted_at", null)
      .is("sold_at", null)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast({ title: "Couldn't load plots", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      const sellers = (data || []).filter((r: any) => {
        const k = (r.customer_kind || "").toLowerCase();
        const src = (r.source || "").toLowerCase();
        const isSeller = k === "seller" || k.includes("sell") || src === "seller_quote" || src.includes("sell");
        if (!isSeller) return false;
        // "Texas" here mirrors SubmissionsPanel.subRegion: everything that isn't a
        // Bayer sell-a-plot submission counts as Texas. This keeps the buyer
        // picker in sync with the admin's Texas pipeline view.
        const isBayer = (r.inquiry_channel || "").toLowerCase() === "bayer_sell_a_plot";
        return !isBayer;
      }) as PlotRow[];
      setRows(sellers);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const q = norm(search);
    if (!q) return rows;
    return rows.filter((r) =>
      // Intentionally exclude seller's name from the searchable fields —
      // we never expose the seller identity to a buyer.
      [r.cemetery, r.section, r.property_type].some((v) => norm(v).includes(q)),
    );
  }, [rows, search]);

  // Suggest cemetery match first
  const sorted = useMemo(() => {
    const target = norm(buyer.cemetery);
    if (!target) return filtered;
    return [...filtered].sort((a, b) => {
      const ma = norm(a.cemetery) === target ? 0 : 1;
      const mb = norm(b.cemetery) === target ? 0 : 1;
      return ma - mb;
    });
  }, [filtered, buyer.cemetery]);

  const toggle = (r: PlotRow) =>
    setSelected((cur) => {
      const next = { ...cur };
      if (next[r.id]?.selected) {
        next[r.id] = { ...next[r.id], selected: false };
      } else {
        next[r.id] = {
          selected: true,
          price: cur[r.id]?.price ?? (r.list_price ? String(r.list_price) : r.accepted_quote_amount ? String(r.accepted_quote_amount) : ""),
          description: cur[r.id]?.description ?? "",
        };
      }
      return next;
    });

  const setPrice = (id: string, price: string) =>
    setSelected((cur) => ({
      ...cur,
      [id]: { selected: cur[id]?.selected ?? true, price, description: cur[id]?.description ?? "" },
    }));

  const setDescription = (id: string, description: string) =>
    setSelected((cur) => ({
      ...cur,
      [id]: { selected: cur[id]?.selected ?? true, price: cur[id]?.price ?? "", description },
    }));

  const chosen = useMemo(
    () =>
      rows
        .filter((r) => selected[r.id]?.selected)
        .map((r) => ({
          row: r,
          priceNum: Number(selected[r.id]?.price) || 0,
          description: selected[r.id]?.description ?? "",
        })),
    [rows, selected],
  );

  const canSend =
    chosen.length > 0 &&
    chosen.every((c) => c.priceNum > 0) &&
    (mode === "attach" || !!buyer.email);

  const handleSend = async () => {
    if (!canSend) return;
    if (mode === "send" && !buyer.email) return;
    setSending(true);
    try {
      // 1. Persist list_price for each (so admin doesn't lose the number).
      await Promise.all(
        chosen.map(({ row, priceNum }) =>
          row.list_price === priceNum
            ? Promise.resolve()
            : supabase.from("contact_submissions").update({ list_price: priceNum }).eq("id", row.id),
        ),
      );

      // 2. Create a Stripe Checkout link for each selected plot. If Stripe isn't
      // set up yet (edge function fails / payments not configured), fall back to
      // a mailto: link so the buyer can still respond and we don't block sending.
      const links = await Promise.all(
        chosen.map(async ({ row, priceNum }) => {
          const desc = `Cemetery plot — ${row.cemetery || "Texas"}${row.section ? `, Section ${row.section}` : ""}`;
          try {
            const { data, error } = await supabase.functions.invoke("create-payment-link", {
              body: {
                submissionId: row.id,
                kind: "plot_sale",
                amountCents: Math.round(priceNum * 100),
                description: desc,
                recipientEmail: buyer.email || undefined,
                recipientName: properCase(buyer.name || ""),
              },
            });
            if (error || !data?.url) throw new Error(error?.message || "no url");
            return { row, priceNum, url: data.url as string, fallback: false };
          } catch (e) {
            console.warn("payment link unavailable, using mailto fallback", e);
            const subj = encodeURIComponent(`Interested in ${row.cemetery || "this plot"}${row.section ? ` (Section ${row.section})` : ""}`);
            const body = encodeURIComponent(`Hi,\n\nI'd like to reserve this plot listed at $${priceNum.toLocaleString()}.\n\nThank you,\n${properCase(buyer.name || "")}`);
            const url = `mailto:info@texascemeterybrokers.com?subject=${subj}&body=${body}`;
            return { row, priceNum, url, fallback: true };
          }
        }),
      );

      // 3. Build branded card HTML — no seller identity is ever included.
      const cards = links.map(({ row, priceNum, url }) => buildCard(row, priceNum, url)).join("\n");

      // 4. Log recommendations for the buyer journey panel (both modes).
      await supabase.from("buyer_recommendations" as any).insert(
        links.map(({ row, priceNum }) => ({
          submission_id: buyer.id,
          listing_id: row.id,
          cemetery: row.cemetery,
          plot_type: row.property_type,
          asking_price: priceNum,
        })),
      );
      window.dispatchEvent(new Event("buyer-rec-saved"));

      if (mode === "attach") {
        // Wrap in a labelled block so the admin can see/remove it in the editor.
        const block = `<div data-plot-cards="1" style="margin:18px 0;">${cards}</div><p><br></p>`;
        onAttach?.(block);
        const fellBack = links.some(l => l.fallback);
        toast({ title: "Plot cards attached", description: `${links.length} card${links.length === 1 ? "" : "s"} added.${fellBack ? " (Payment links unavailable — buttons will email you instead.)" : ""}` });
        onClose();
        return;
      }

      // Standalone send mode: build the full branded email and send it.
      const buyerFirst = properCase(buyer.name || "").split(" ")[0] || "there";
      const html = `
<div style="font-family:Georgia,serif;max-width:640px;margin:0 auto;color:#1f2937;padding:8px;">
  <p style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#7c3a2e;margin:0 0 4px;">Texas Cemetery Brokers</p>
  <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:500;color:#1f2937;margin:0 0 14px;">Available plots for you</h1>
  <p style="font-size:15px;line-height:1.55;margin:0 0 18px;">Dear ${escapeHtml(buyerFirst)},</p>
  <p style="font-size:15px;line-height:1.55;margin:0 0 22px;">Thank you for reaching out${buyer.cemetery ? ` about ${escapeHtml(properCase(buyer.cemetery))}` : ""}. ${links.length === 1 ? "Here is a property" : `Here are ${links.length} properties`} from our current inventory that may suit you. Each plot can be reserved and paid for securely below.</p>
  ${cards}
  <p style="font-size:14px;line-height:1.6;color:#4b5563;margin:26px 0 6px;">If you'd prefer to discuss any of these by phone, simply reply to this email and we'll set up a call. Plots can move quickly &mdash; if one catches your eye we recommend securing it directly through the link.</p>
  <p style="font-size:14px;line-height:1.6;margin:20px 0 4px;">Warm regards,</p>
  <p style="font-size:14px;line-height:1.5;margin:0;">
    <strong>${escapeHtml(adminName || "Alexander James")}</strong><br>
    Cemetery Salesperson<br>
    Texas Cemetery Brokers<br>
    <a href="https://www.texascemeterybrokers.com" style="color:#7c3a2e;">www.texascemeterybrokers.com</a>
  </p>
</div>`.trim();

      const subject = `Available plots${buyer.cemetery ? ` at ${properCase(buyer.cemetery)}` : ""} — Texas Cemetery Brokers`;
      const { error: sendErr } = await supabase.functions.invoke("gmail-action", {
        body: { action: "send", to: buyer.email, subject, htmlBody: html, body: stripHtml(html) },
      });
      if (sendErr) throw sendErr;

      toast({ title: "Plots sent", description: `${links.length} plot${links.length === 1 ? "" : "s"} sent to ${buyer.email}` });
      onClose();
    } catch (e: any) {
      toast({ title: "Send failed", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };


  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-start justify-center p-4 pt-10 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-2xl shadow-hover border border-border/50 w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col"
          >
            <div className="flex items-start justify-between p-5 border-b border-border/40">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-1">Send Plot Cards</p>
                <h3 className="font-display text-lg text-foreground">{buyer.name || "Buyer"}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{buyer.email || "No email on file"}{buyer.cemetery ? ` · interested in ${buyer.cemetery}` : ""}</p>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="w-5 h-5" /></button>
            </div>

            <div className="px-5 py-3 border-b border-border/40">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search cemetery, section, type…"
                  className="w-full h-9 pl-8 pr-3 rounded-lg bg-background border border-border/60 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading plots…</div>
              ) : sorted.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-10">No seller submissions match your search.</p>
              ) : (
                sorted.map((r) => {
                  const isSel = !!selected[r.id]?.selected;
                  const price = selected[r.id]?.price ?? (r.list_price ? String(r.list_price) : "");
                  const isCemMatch = buyer.cemetery && norm(r.cemetery) === norm(buyer.cemetery);
                  return (
                    <div
                      key={r.id}
                      className={`rounded-xl border p-3 transition-all ${isSel ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border/60 bg-background hover:border-border"}`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggle(r)}
                          className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isSel ? "bg-primary border-primary text-primary-foreground" : "border-border bg-background"}`}
                        >
                          {isSel && <Check className="w-3 h-3" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-foreground truncate">{r.cemetery || "Unknown cemetery"}</p>
                            {isCemMatch && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-[hsl(var(--accent-gold-bg))] text-[hsl(var(--accent-gold-fg))]"><Sparkles className="w-2.5 h-2.5" /> Match</span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {[r.property_type, r.spaces && `${r.spaces} space${r.spaces === "1" ? "" : "s"}`, r.section && `Section ${r.section}`].filter(Boolean).join(" · ") || "—"}
                          </p>
                          {(() => {
                            const n = spacesNum(r.spaces);
                            const p = Number(price) || 0;
                            if (n > 1 && p > 0) {
                              return <p className="text-[10px] text-muted-foreground/80 mt-0.5">{fmt(p)} total · {fmt(Math.round(p / n))} per space</p>;
                            }
                            return null;
                          })()}
                        </div>
                        <div className="shrink-0">
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                            <input
                              type="number"
                              min="0"
                              step="50"
                              placeholder="Price"
                              value={price}
                              onChange={(e) => setPrice(r.id, e.target.value)}
                              onFocus={() => !isSel && toggle(r)}
                              className="w-28 h-8 pl-6 pr-2 rounded-md bg-background border border-border/60 text-xs text-right focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          </div>
                          {!r.list_price && (
                            <p className="text-[9px] text-[hsl(var(--accent-gold-fg))] mt-0.5 text-right">price needed</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-border/40 p-4 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {chosen.length} selected{chosen.length > 0 ? ` · ${fmt(chosen.reduce((s, c) => s + c.priceNum, 0))} total` : ""}
              </p>
              <button
                onClick={handleSend}
                disabled={!canSend || sending}
                className="inline-flex items-center gap-2 px-5 h-10 rounded-full text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {mode === "attach" ? "Attach to email" : "Send plot cards"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function buildCard(row: PlotRow, price: number, url: string) {
  const cem = escapeHtml(properCase(row.cemetery || "Cemetery plot"));
  const n = spacesNum(row.spaces);
  const meta = [
    row.property_type,
    row.spaces && `${row.spaces} space${n === 1 ? "" : "s"}`,
    row.section && `Section ${row.section}`,
  ]
    .filter(Boolean)
    .map((s) => escapeHtml(String(s)))
    .join(" &middot; ") || "Texas plot";
  const perSpaceLine =
    n > 1
      ? `<p style="font-family:Georgia,serif;font-size:13px;color:#6b6354;margin:0 0 14px;">${escapeHtml(fmt(Math.round(price / n)))} per space &middot; ${n} spaces</p>`
      : "";
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 16px;border-collapse:separate;border:1px solid #e7e2d8;border-radius:14px;background:#fbf8f3;overflow:hidden;">
  <tr>
    <td style="padding:18px 20px;">
      <p style="font-family:Georgia,serif;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#7c3a2e;margin:0 0 6px;">Available Plot</p>
      <h2 style="font-family:Georgia,serif;font-size:20px;font-weight:500;color:#1f2937;margin:0 0 4px;line-height:1.25;">${cem}</h2>
      <p style="font-family:Georgia,serif;font-size:13px;color:#6b6354;margin:0 0 6px;">${meta}</p>
      <p style="font-family:Georgia,serif;font-size:22px;font-weight:600;color:#1f2937;margin:0 0 4px;">${escapeHtml(fmt(price))}${n > 1 ? ' <span style="font-size:13px;font-weight:400;color:#6b6354;">total</span>' : ""}</p>
      ${perSpaceLine}
      <a href="${url}" style="display:inline-block;margin-top:8px;background:#7c3a2e;color:#ffffff;padding:12px 24px;border-radius:999px;text-decoration:none;font-family:Georgia,serif;font-size:14px;font-weight:600;letter-spacing:.02em;">Reserve &amp; pay securely</a>
      <p style="font-family:Georgia,serif;font-size:11px;color:#9ca3af;margin:10px 0 0;">Secure checkout via Stripe</p>
    </td>
  </tr>
</table>`.trim();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
