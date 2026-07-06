// Admin → Email Marketing → Guaranteed Offer (Bayer, one-off).
// Multi-tier offer with editable options, live preview, PDF contract preview,
// and single-recipient send (contract attached + clickable in email).
import { useEffect, useState } from "react";
import { Loader2, Send, FileText, RefreshCw, Plus, Trash2, ExternalLink, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OfferTier {
  id: string;
  name: string;
  timeframe: string;
  amount: string;
  description: string;
  badge?: string;
  highlight?: boolean;
}

interface OfferInput {
  recipientName: string;
  cemeteryName: string;
  cemeteryLocation: string;
  propertyDescription: string;
  numberOfPlots: string;
  transferFeeCoverage: string;
  paymentTimeline: string;
  typicalResaleWindow: string;
  acceptDeadline: string;
  option1Fee: string;
  option2CancelFee: string;
  option2MinTerm: string;
  officePhone: string;
  agentName: string;
  agentTitle: string;
  agentEmail: string;
  companyAddress: string;
  tiers: OfferTier[];
  subject: string;
  preheader: string;
}

const DEFAULT_TIERS: OfferTier[] = [
  {
    id: "immediate",
    name: "Immediate Direct Purchase",
    timeframe: "Bayer buys directly — paid within 45 days of transfer",
    amount: "$14,500.00",
    description: "Fastest possible exit. Bayer purchases the property directly for cash; you don't wait for a private buyer.",
    badge: "Fastest",
  },
  {
    id: "guarantee-12",
    name: "12-Month Guaranteed Sale",
    timeframe: "Guaranteed sold within 12 months — or Bayer buys it",
    amount: "$16,500.00",
    description: "Balanced option. We actively market for 12 months; if no private buyer is found, Bayer purchases at the guaranteed amount.",
    badge: "Balanced",
  },
  {
    id: "guarantee-24",
    name: "24-Month Guaranteed Sale",
    timeframe: "Guaranteed sold within 24 months — or Bayer buys it",
    amount: "$18,875.00",
    description: "Highest net payment. Longer marketing window (24 months) with the same written buy-back guarantee at the end.",
    badge: "Highest net",
    highlight: true,
  },
];

const DEFAULTS: OfferInput = {
  recipientName: "Ana Del Rio",
  cemeteryName: "Pacific View M.P.",
  cemeteryLocation: "Corona Del Mar, CA",
  propertyDescription: "Double Grave A, Lot 805, Bayview Terrace",
  numberOfPlots: "One (1)",
  transferFeeCoverage: "$700.00",
  paymentTimeline: "45 calendar days of transfer of title",
  typicalResaleWindow: "up to 10 years",
  acceptDeadline: "5:00 PM on Friday, July 17, 2026",
  option1Fee: "$99",
  option2CancelFee: "$299",
  option2MinTerm: "36 months",
  officePhone: "760-247-8518",
  agentName: "Emma MacLaren",
  agentTitle: "Portfolio Manager; Licensed Cemetery Salesperson",
  agentEmail: "emma@bayerbrokers.com",
  companyAddress: "12277 Apple Valley Rd, Ste 449, Apple Valley, CA 92308-1701, USA",
  tiers: DEFAULT_TIERS,
  subject: "",
  preheader: "",
};

const BAYER_PRIMARY = "#1e3a8a";

const BayerGuaranteeOfferPanel = () => {
  const { toast } = useToast();
  const [offer, setOffer] = useState<OfferInput>(DEFAULTS);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [preview, setPreview] = useState<{ html: string; subject: string; contractUrl: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const patch = (k: keyof OfferInput, v: any) => setOffer((p) => ({ ...p, [k]: v }));

  const patchTier = (idx: number, k: keyof OfferTier, v: any) =>
    setOffer((p) => ({
      ...p,
      tiers: p.tiers.map((t, i) => (i === idx ? { ...t, [k]: v } : t)),
    }));

  const addTier = () =>
    setOffer((p) => ({
      ...p,
      tiers: [
        ...p.tiers,
        {
          id: `tier-${Date.now()}`,
          name: "New Option",
          timeframe: "Timeframe",
          amount: "$0.00",
          description: "Describe this option.",
        },
      ],
    }));

  const removeTier = (idx: number) =>
    setOffer((p) => ({ ...p, tiers: p.tiers.filter((_, i) => i !== idx) }));

  const setHighlight = (idx: number) =>
    setOffer((p) => ({ ...p, tiers: p.tiers.map((t, i) => ({ ...t, highlight: i === idx })) }));

  const refreshPreview = async () => {
    setPreviewLoading(true);
    const { data, error } = await supabase.functions.invoke("bayer-guarantee-offer", {
      body: { action: "preview", offer },
    });
    setPreviewLoading(false);
    if (error || (data as any)?.error) {
      toast({ title: "Preview failed", description: (error as any)?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    setPreview({ html: (data as any).html, subject: (data as any).subject, contractUrl: (data as any).contractUrl });
  };

  useEffect(() => {
    const t = setTimeout(refreshPreview, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [offer]);

  const sendTest = async () => {
    setSending(true);
    const { data, error } = await supabase.functions.invoke("bayer-guarantee-offer", {
      body: { action: "send-test", offer },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast({ title: "Test send failed", description: (error as any)?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Test sent", description: `Delivered to ${(data as any).sentTo}` });
  };

  const sendReal = async () => {
    if (!recipientEmail.trim()) {
      toast({ title: "Enter the recipient email", variant: "destructive" });
      return;
    }
    setConfirmOpen(false);
    setSending(true);
    const { data, error } = await supabase.functions.invoke("bayer-guarantee-offer", {
      body: { action: "send", offer, toEmail: recipientEmail.trim() },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast({ title: "Send failed", description: (error as any)?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Guaranteed offer sent", description: `Delivered to ${(data as any).sentTo}` });
  };

  return (
    <div className="grid lg:grid-cols-[460px_1fr] gap-4">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-5 max-h-[85vh] overflow-y-auto">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-semibold">Bayer · One-off email</p>
          <h3 className="text-lg font-semibold mt-1">Guaranteed Sale Offer</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Multi-tier offer. Each option is clickable in the email and opens a pre-filled acceptance reply. A filled PDF contract is attached and linked.
          </p>
        </div>

        <Section title="Recipient & subject">
          <Field label="Recipient full name" value={offer.recipientName} onChange={(v) => patch("recipientName", v)} />
          <Field label="Recipient email" value={recipientEmail} onChange={setRecipientEmail} placeholder="name@example.com" type="email" />
          <Field label="Subject (optional)" value={offer.subject} onChange={(v) => patch("subject", v)} placeholder="Auto: Guaranteed Sale Offer — <cemetery>" />
          <Field label="Preheader (optional)" value={offer.preheader} onChange={(v) => patch("preheader", v)} placeholder="Hidden inbox preview text" />
        </Section>

        <Section title="Property">
          <Field label="Cemetery name" value={offer.cemeteryName} onChange={(v) => patch("cemeteryName", v)} />
          <Field label="Cemetery location" value={offer.cemeteryLocation} onChange={(v) => patch("cemeteryLocation", v)} placeholder="Corona Del Mar, CA" />
          <Field label="Property description" value={offer.propertyDescription} onChange={(v) => patch("propertyDescription", v)} textarea />
          <Field label="Number of plots" value={offer.numberOfPlots} onChange={(v) => patch("numberOfPlots", v)} placeholder="One (1)" />
        </Section>

        <Section title="Offer options (clickable in email)">
          <p className="text-[11px] text-muted-foreground -mt-1">
            Add as many timeframes as you like. Click the star to mark the recommended option (rendered in Bayer navy).
          </p>
          <div className="space-y-3">
            {offer.tiers.map((t, idx) => (
              <div key={t.id} className={`rounded-lg border p-3 space-y-2 ${t.highlight ? "border-blue-500 bg-blue-50/50" : "border-border bg-background"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Option {idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setHighlight(idx)}
                      title="Mark as recommended"
                      className={`p-1 rounded ${t.highlight ? "text-blue-600" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <Star className="w-3.5 h-3.5" fill={t.highlight ? "currentColor" : "none"} />
                    </button>
                    <button
                      onClick={() => removeTier(idx)}
                      disabled={offer.tiers.length <= 1}
                      className="p-1 rounded text-muted-foreground hover:text-red-600 disabled:opacity-30 disabled:hover:text-muted-foreground"
                      title="Remove option"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <Field label="Name" value={t.name} onChange={(v) => patchTier(idx, "name", v)} />
                <Field label="Timeframe" value={t.timeframe} onChange={(v) => patchTier(idx, "timeframe", v)} placeholder="Guaranteed sold within 12 months — or Bayer buys it" />
                <Field label="Net payment (per plot)" value={t.amount} onChange={(v) => patchTier(idx, "amount", v)} placeholder="$16,500.00" />
                <Field label="Description" value={t.description} onChange={(v) => patchTier(idx, "description", v)} textarea />
                <Field label="Badge (optional)" value={t.badge || ""} onChange={(v) => patchTier(idx, "badge", v)} placeholder="Fastest / Balanced / Highest net" />
              </div>
            ))}
          </div>
          <button
            onClick={addTier}
            className="w-full inline-flex items-center justify-center gap-1 text-xs font-semibold px-3 py-2 rounded-md border border-dashed border-border hover:bg-muted"
          >
            <Plus className="w-3.5 h-3.5" /> Add another option
          </button>
        </Section>

        <Section title="Coverage & timing">
          <Field label="Cemetery fees Bayer covers (up to)" value={offer.transferFeeCoverage} onChange={(v) => patch("transferFeeCoverage", v)} placeholder="$700.00" />
          <Field label="Payment timeline after transfer" value={offer.paymentTimeline} onChange={(v) => patch("paymentTimeline", v)} placeholder="45 calendar days of transfer of title" />
          <Field label="Typical private-resale timeframe" value={offer.typicalResaleWindow} onChange={(v) => patch("typicalResaleWindow", v)} placeholder="up to 10 years" />
          <Field label="Acceptance deadline" value={offer.acceptDeadline} onChange={(v) => patch("acceptDeadline", v)} />
        </Section>

        <Section title="Agreement options">
          <Field label="Option A fee" value={offer.option1Fee} onChange={(v) => patch("option1Fee", v)} placeholder="$99" />
          <Field label="Option B cancellation fee" value={offer.option2CancelFee} onChange={(v) => patch("option2CancelFee", v)} placeholder="$299" />
          <Field label="Option B minimum term" value={offer.option2MinTerm} onChange={(v) => patch("option2MinTerm", v)} placeholder="36 months" />
        </Section>

        <Section title="Signature">
          <Field label="Agent name" value={offer.agentName} onChange={(v) => patch("agentName", v)} />
          <Field label="Agent title" value={offer.agentTitle} onChange={(v) => patch("agentTitle", v)} />
          <Field label="Agent email" value={offer.agentEmail} onChange={(v) => patch("agentEmail", v)} type="email" />
          <Field label="Office phone" value={offer.officePhone} onChange={(v) => patch("officePhone", v)} />
          <Field label="Company address" value={offer.companyAddress} onChange={(v) => patch("companyAddress", v)} textarea />
        </Section>

        <div className="pt-3 border-t border-border space-y-2">
          {preview?.contractUrl && (
            <a
              href={preview.contractUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md border border-border hover:bg-muted"
            >
              <ExternalLink className="w-4 h-4" /> Preview generated contract
            </a>
          )}
          <button
            onClick={sendTest}
            disabled={sending}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md border border-border hover:bg-muted disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Send test to me (with attached contract)
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={sending || !recipientEmail.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: BAYER_PRIMARY }}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send offer to {recipientEmail.trim() || "recipient"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            <span>Live preview · Subject: <strong className="text-foreground">{preview?.subject || "—"}</strong></span>
          </div>
          <button onClick={refreshPreview} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        <div className="border border-border rounded-md overflow-hidden bg-white" style={{ height: 800 }}>
          {previewLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Rendering…
            </div>
          ) : preview ? (
            <iframe title="Guaranteed offer preview" srcDoc={preview.html} className="w-full h-full border-0" />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No preview yet.</div>
          )}
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border border-border p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Send guaranteed offer?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This sends the offer to <strong>{recipientEmail}</strong> from{" "}
              <strong>{offer.agentName} &lt;hello@bayerbrokers.com&gt;</strong> with the auto-filled agreement attached as a PDF.
              Replies route to <strong>{offer.agentEmail}</strong>. Sends can't be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmOpen(false)} className="px-4 py-2 text-sm rounded-md border border-border">
                Cancel
              </button>
              <button
                onClick={sendReal}
                className="px-4 py-2 text-sm rounded-md font-semibold text-white"
                style={{ background: BAYER_PRIMARY }}
              >
                Send offer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">{title}</p>
    <div className="space-y-2">{children}</div>
  </div>
);

const Field = ({
  label, value, onChange, placeholder, type = "text", textarea = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
}) => (
  <label className="block">
    <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
    {textarea ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="mt-1 w-full text-sm px-3 py-2 rounded-md border border-border bg-background"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full text-sm px-3 py-2 rounded-md border border-border bg-background"
      />
    )}
  </label>
);

export default BayerGuaranteeOfferPanel;
