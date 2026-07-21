// Small dialog for admins to attach a branded Stripe payment button to any
// outgoing email. Creates a Stripe Checkout session via the create-payment-link
// edge function (kind: "custom") and injects a Georgia-styled CTA block into
// the editor. Uses the LIVE Stripe environment so real money is collected.
import { useState } from "react";
import { Loader2, CreditCard, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getPaymentsEnvironment } from "@/lib/paymentEnvironment";

interface Props {
  open: boolean;
  onClose: () => void;
  submissionId: string;
  recipientEmail: string;
  recipientName?: string | null;
  onAttach: (buttonHtml: string) => void;
}

const buildButtonHtml = (opts: { amountCents: number; description: string; url: string }) => {
  const dollars = (opts.amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.amountCents % 100 === 0 ? 0 : 2,
  });
  const desc = opts.description.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `
<div data-tcb-payment="1" style="margin:22px 0;padding:22px 24px;border:1px solid #e7e2d8;border-radius:10px;background:#fbf7f1;font-family:Georgia,serif;color:#1f2937;text-align:center;">
  <p style="margin:0 0 4px;font-family:Georgia,serif;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:#9a8f7a;">Secure Payment</p>
  <p style="margin:0 0 12px;font-family:Georgia,serif;font-size:16px;color:#1f2937;font-style:italic;">${desc}</p>
  <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;font-weight:600;color:#7c3a2e;letter-spacing:.02em;">${dollars}</p>
  <a href="${opts.url}" target="_blank" rel="noopener" style="display:inline-block;padding:12px 28px;background:#7c3a2e;color:#ffffff;text-decoration:none;font-family:Georgia,serif;font-size:14px;letter-spacing:.14em;text-transform:uppercase;border-radius:6px;font-weight:600;">Pay Securely</a>
  <p style="margin:14px 0 0;font-family:Georgia,serif;font-size:11px;color:#9a8f7a;font-style:italic;">Powered by Stripe · Texas Cemetery Brokers</p>
</div>`.trim();
};

const AttachPaymentButtonDialog = ({ open, onClose, submissionId, recipientEmail, recipientName, onAttach }: Props) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submit = async () => {
    const dollars = parseFloat(amount);
    if (!isFinite(dollars) || dollars <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title: "Add a description so the customer knows what they're paying for", variant: "destructive" });
      return;
    }
    const amountCents = Math.round(dollars * 100);
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("create-payment-link", {
      body: {
        submissionId,
        kind: "custom",
        amountCents,
        description: description.trim(),
        recipientEmail,
        recipientName: recipientName || "",
        environment: getPaymentsEnvironment(),
      },
    });
    setLoading(false);
    if (error || (data as any)?.error || !(data as any)?.url) {
      toast({
        title: "Could not create payment link",
        description: error?.message || (data as any)?.error || "Unknown error",
        variant: "destructive",
      });
      return;
    }
    const html = buildButtonHtml({ amountCents, description: description.trim(), url: (data as any).url });
    onAttach(html);
    toast({ title: "Payment button attached", description: `${dollars.toFixed(2)} · ${description.trim()}` });
    setAmount("");
    setDescription("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-background rounded-xl border border-border shadow-2xl w-full max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Attach payment button</h3>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">Amount (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input
              type="number"
              min="0.50"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full text-sm pl-7 pr-3 py-2 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">
            What is this payment for?
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Deed transfer & recording fee for Restland Memorial Park"
            rows={3}
            className="w-full text-sm px-3 py-2 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <p className="text-[10px] text-muted-foreground">
            Shown on the Stripe checkout page and on the button in the email.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
            {loading ? "Creating…" : "Create & attach"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttachPaymentButtonDialog;
