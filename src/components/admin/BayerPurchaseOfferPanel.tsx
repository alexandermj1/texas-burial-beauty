// Admin → Email Marketing → Purchase Offer (Bayer, one-off).
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
  acquisitionMonth: string;
  directOffer: string;
  transferFeeCovered: string;
  brokerageTarget: string;
  resaleWindow: string;
  documentReturnWindow: string;
  acceptDeadline: string;
  signatureWindow: string;
  officePhone: string;
  agentName: string;
  agentTitle: string;
  agentEmail: string;
  companyAddress: string;
  subject: string;
  preheader: string;
}

const DEFAULTS: OfferInput = {
  recipientName: "Christophe Chang",
  cemeteryName: "Forest Lawn M.P.",
  cemeteryLocation: "Covina Hills, CA",
  propertyDescription: "Garden of Family Love, Lot 1371, Single Lawn Crypt Space 3",
  acquisitionMonth: "May 2026",
  directOffer: "$4,215.00",
  transferFeeCovered: "$400.00",
  brokerageTarget: "$6,150.00",
  resaleWindow: "21-30 days",
  documentReturnWindow: "7 business days",
  acceptDeadline: "5:00 PM on Friday, May 22, 2026",
  signatureWindow: "48-hour",
  officePhone: "760-247-8518",
  agentName: "Emma MacLaren",
  agentTitle: "Portfolio Manager; Licensed Cemetery Salesperson",
  agentEmail: "emma@bayerbrokers.com",
  companyAddress: "12277 Apple Valley Rd, Ste 449, Apple Valley, CA 92308-1701, USA",
  subject: "",
  preheader: "",
};

const BAYER_PRIMARY = "#1e3a8a";

const BayerPurchaseOfferPanel = () => {
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
    const { data, error } = await supabase.functions.invoke("bayer-purchase-offer", {
      body: { action: "preview", offer },
    });
    setPreviewLoading(false);
    if (error || (data as any)?.error) {
      toast({ title: "Preview failed", description: (error as any)?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    setPreview({ html: (data as any).html, subject: (data as any).subject });
  };

  // Initial + auto-refresh with debounce
  useEffect(() => {
    const t = setTimeout(refreshPreview, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [offer]);

  const sendTest = async () => {
    setSending(true);
    const { data, error } = await supabase.functions.invoke("bayer-purchase-offer", {
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
    const { data, error } = await supabase.functions.invoke("bayer-purchase-offer", {
      body: { action: "send", offer, toEmail: recipientEmail.trim() },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast({ title: "Send failed", description: (error as any)?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Offer sent", description: `Delivered to ${(data as any).sentTo}` });
  };

  return (
    <div className="grid lg:grid-cols-[420px_1fr] gap-4">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-5 max-h-[85vh] overflow-y-auto">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground font-semibold">Bayer · One-off email</p>
          <h3 className="text-lg font-semibold mt-1">Direct Purchase Offer</h3>
          <p className="text-xs text-muted-foreground mt-1">Not a campaign — sends to a single recipient. Edit every field below, preview, then send.</p>
        </div>

        <Section title="Recipient & subject">
          <Field label="Recipient full name" value={offer.recipientName} onChange={(v) => patch("recipientName", v)} />
          <Field label="Recipient email" value={recipientEmail} onChange={setRecipientEmail} placeholder="name@example.com" type="email" />
          <Field label="Subject (optional)" value={offer.subject} onChange={(v) => patch("subject", v)} placeholder="Auto: Direct Purchase Offer — <cemetery>" />
          <Field label="Preheader (optional)" value={offer.preheader} onChange={(v) => patch("preheader", v)} placeholder="Hidden inbox preview text" />
        </Section>

        <Section title="Property">
          <Field label="Cemetery name" value={offer.cemeteryName} onChange={(v) => patch("cemeteryName", v)} />
          <Field label="Cemetery location" value={offer.cemeteryLocation} onChange={(v) => patch("cemeteryLocation", v)} placeholder="Covina Hills, CA" />
          <Field label="Property description" value={offer.propertyDescription} onChange={(v) => patch("propertyDescription", v)} textarea />
        </Section>

        <Section title="Offer terms">
          <Field label="Acquisition month" value={offer.acquisitionMonth} onChange={(v) => patch("acquisitionMonth", v)} />
          <Field label="Direct cash offer (net to seller)" value={offer.directOffer} onChange={(v) => patch("directOffer", v)} />
          <Field label="Transfer fee we cover" value={offer.transferFeeCovered} onChange={(v) => patch("transferFeeCovered", v)} />
          <Field label="Brokerage target (Option 2)" value={offer.brokerageTarget} onChange={(v) => patch("brokerageTarget", v)} />
          <Field label="Resale market window" value={offer.resaleWindow} onChange={(v) => patch("resaleWindow", v)} placeholder="21-30 days" />
          <Field label="Document return window" value={offer.documentReturnWindow} onChange={(v) => patch("documentReturnWindow", v)} placeholder="7 business days" />
          <Field label="Signature window" value={offer.signatureWindow} onChange={(v) => patch("signatureWindow", v)} placeholder="48-hour" />
          <Field label="Acceptance deadline" value={offer.acceptDeadline} onChange={(v) => patch("acceptDeadline", v)} placeholder="5:00 PM on Friday, May 22, 2026" />
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
            <iframe title="Purchase offer preview" srcDoc={preview.html} className="w-full h-full border-0" />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No preview yet.</div>
          )}
        </div>
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl border border-border p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">Send purchase offer?</h3>
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

export default BayerPurchaseOfferPanel;
