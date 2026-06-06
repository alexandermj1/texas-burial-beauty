// TexasIntakeDialog — composes the standard Texas Cemetery Brokers intake email
// from the customer's submission, with copy + Gmail compose shortcuts.
import { useMemo, useState } from "react";
import { Copy, Mail, Send, X, Check } from "lucide-react";
import type { Submission } from "./SubmissionsPanel";

interface Props {
  open: boolean;
  onClose: () => void;
  submission: Submission;
  onSent: () => void;
}

const buildBody = (s: Submission) => {
  const x = s as any;
  const first = (s.name || "there").split(/\s+/)[0];
  const cemetery = s.cemetery || "[cemetery name]";
  const propertyDesc = [s.spaces ? `${s.spaces}` : "", s.property_type ? `${s.property_type}` : ""]
    .filter(Boolean).join(" ") || "your cemetery property";

  return `Hi ${first},

Thank you for reaching out to Texas Cemetery Brokers regarding selling ${s.spaces ? `the ${propertyDesc}` : "your cemetery property"}${cemetery !== "[cemetery name]" ? ` at ${cemetery}` : ""}.

Please note that we do not purchase cemetery plots outright. Instead, we offer a complimentary evaluation and, if your property is a good fit for the current resale market, we can list it for sale on your behalf on a consignment basis.

After we complete our analysis (which typically takes a few days based on cemetery response time after we receive the property details below), we will provide you with a single, predetermined net payment offer. That's the exact amount the property owner/s will receive when we find a buyer for the plot/s. To proceed with the evaluation kindly provide the following information:

Garden/Section Name: ${s.section || ""}

Lot and Space Numbers and Type of Plot, e.g. Double depth lawn crypt, grave space: ${[x.lawn, x.space_numbers, s.property_type].filter(Boolean).join(" / ")}

Names of All Owners Listed on the Deed: ${x.deed_owner_names || ""}

Are the Plot Owners Currently Living? ${x.deed_owners_status || ""}

Your Relationship to the Plot Owner/s: ${x.relationship_to_owner || ""}

Depending on the answers to these questions, we may need a few more details, but that's enough to start for now.

Please note that before accepting any listing, our Firm requires documentation demonstrating current ownership of the property and must confirm the consignee's right to sell it. To this end, please include a scanned copy of the deed, and copies of any original purchase records or other information you have regarding the plots. Evidence of Prepaid items such as endowment care and/or prepaid service charges can often increase a valuation to a higher tier.

We look forward to hearing from you and getting started on this process. Please reach out if you have any questions.

Best,
Emma

Emma Maclaren
Cemetery Salesperson
Texas Cemetery Brokers
texascemeterybrokers.com`;
};

const subject = (s: Submission) =>
  `Texas Cemetery Brokers — Property evaluation for ${s.cemetery || "your plots"}`;

const TexasIntakeDialog = ({ open, onClose, submission, onSent }: Props) => {
  const [body, setBody] = useState(() => buildBody(submission));
  const [subj, setSubj] = useState(() => subject(submission));
  const [copied, setCopied] = useState(false);

  const to = submission.email || "";

  const gmailUrl = useMemo(() => {
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      tf: "1",
      to,
      su: subj,
      body,
    });
    return `https://mail.google.com/mail/?${params.toString()}`;
  }, [to, subj, body]);

  const mailtoUrl = useMemo(
    () => `mailto:${to}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`,
    [to, subj, body]
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${subj}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-display text-foreground">Texas intake email</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Auto-filled from {submission.name || "this submission"} · sent from info@texascemeterybrokers.com
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">To</label>
            <input
              type="email"
              value={to}
              readOnly
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-muted/40 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Subject</label>
            <input
              type="text"
              value={subj}
              onChange={(e) => setSubj(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={18}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono leading-relaxed"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border p-4 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy text"}
            </button>
            <a
              href={gmailUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                const w = window.open(gmailUrl, "_blank", "noopener,noreferrer");
                if (!w) window.open(mailtoUrl, "_self");
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" /> Open in Gmail
            </a>
            <a
              href={mailtoUrl}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" /> Default mail app
            </a>
          </div>
          <button
            onClick={onSent}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Send className="w-3.5 h-3.5" /> Mark intake sent
          </button>
        </div>
      </div>
    </div>
  );
};

export default TexasIntakeDialog;
