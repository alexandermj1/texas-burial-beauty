// Admin → Email Marketing → Guaranteed Offer (Bayer, one-off).
// Fully editable letter fields, live preview, single-recipient send.
import { useEffect, useState } from "react";
import { Loader2, Send, FileText, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OfferInput {
  recipientName: string;
  cemeteryName: string;
  cemeteryLocation: string;
  propertyDescription: string;
  numberOfPlots: string;
  guaranteedNetPayment: string;
  totalGuaranteed: string;
  transferFeeCoverage: string;
  guaranteeWindow: string;
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
  subject: string;
  preheader: string;
}

const DEFAULTS: OfferInput = {
  recipientName: "Ana Del Rio",
  cemeteryName: "Pacific View M.P.",
  cemeteryLocation: "Corona Del Mar, CA",
  propertyDescription: "Double Grave A, Lot 805, Bayview Terrace",
  numberOfPlots: "One (1)",
  guaranteedNetPayment: "$18,875.00",
  totalGuaranteed: "$18,875.00",
  transferFeeCoverage: "$700.00",
  guaranteeWindow: "24 months (2 years)",
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
  subject: "",
  preheader: "",
};

const BAYER_PRIMARY = "#1e3a8a";

const BayerGuaranteeOfferPanel = () => {
  const { toast } = useToast();
  const [offer, setOffer] = useState<OfferInput>(DEFAULTS);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [preview, setPreview] = useState<{ html: string; subject: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const patch = (k: keyof OfferInput, v: string) => setOffer((p) => ({ ...p, [k]: v }));

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
    setPreview({ html: (data as any).html, subject: (data as any).subject });
  };

  useEffect(() => {
    const t = setTimeout(refreshPreview, 400);
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
    <div className="grid lg:grid-cols-[420px_1fr] gap-4">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-5 max-h-[85vh] overflow-y-auto">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-semibold">Bayer · One-off email</p>
          <h3 className="text-lg font-semibold mt-1">Guaranteed Sale Offer</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Positions Bayer as backstop buyer within a fixed window (default 2 years). Not a campaign — sends to a single recipient.
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

        <Section title="Guarantee terms">
          <Field label="Guaranteed Net Payment (per plot)" value={offer.guaranteedNetPayment} onChange={(v) => patch("guaranteedNetPayment", v)} placeholder="$18,875.00" />
          <Field label="Total guaranteed (all plots)" value={offer.totalGuaranteed} onChange={(v) => patch("totalGuaranteed", v)} placeholder="$18,875.00" />
          <Field label="Cemetery fees Bayer covers (up to)" value={offer.transferFeeCoverage} onChange={(v) => patch("transferFeeCoverage", v)} placeholder="$700.00" />
          <Field label="Guarantee window" value={offer.guaranteeWindow} onChange={(v) => patch("guaranteeWindow", v)} placeholder="24 months (2 years)" />
          <Field label="Typical private-resale timeframe" value={offer.typicalResaleWindow} onChange={(v) => patch("typicalResaleWindow", v)} placeholder="up to 10 years" />
          <Field label="Payment timeline after transfer" value={offer.paymentTimeline} onChange={(v) => patch("paymentTimeline", v)} placeholder="45 calendar days of transfer of title" />
          <Field label="Acceptance deadline" value={offer.acceptDeadline} onChange={(v) => patch("acceptDeadline", v)} />
        </Section>

        <Section title="Agreement options">
          <Field label="Option 1 fee" value={offer.option1Fee} onChange={(v) => patch("option1Fee", v)} placeholder="$99" />
          <Field label="Option 2 cancellation fee" value={offer.option2CancelFee} onChange={(v) => patch("option2CancelFee", v)} placeholder="$299" />
          <Field label="Option 2 minimum term" value={offer.option2MinTerm} onChange={(v) => patch("option2MinTerm", v)} placeholder="36 months" />
        </Section>

        <Section title="Signature">
          <Field label="Agent name" value={offer.agentName} onChange={(v) => patch("agentName", v)} />
          <Field label="Agent title" value={offer.agentTitle} onChange={(v) => patch("agentTitle", v)} />
          <Field label="Agent email" value={offer.agentEmail} onChange={(v) => patch("agentEmail", v)} type="email" />
          <Field label="Office phone" value={offer.officePhone} onChange={(v) => patch("officePhone", v)} />
          <Field label="Company address" value={offer.companyAddress} onChange={(v) => patch("companyAddress", v)} textarea />
        </Section>

        <div className="pt-3 border-t border-border space-y-2">
          <button
            onClick={sendTest}
            disabled={sending}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md border border-border hover:bg-muted disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Send test to me
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
        <div className="flex items-center justify-between mb-3">
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
              <strong>{offer.agentName} &lt;hello@bayerbrokers.com&gt;</strong>. Replies route to{" "}
              <strong>{offer.agentEmail}</strong>. Sends can't be undone.
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
