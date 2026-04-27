// CustomerJourney: the Stage 2 journey tracker for a single customer/submission.
// Shows DocuSign status, the document checklist (PoA, Deed, Title, Affidavit, etc.),
// reminder history with prompts when a follow-up is due, and the linked Gmail thread.
//
// It's a *manual-track* DocuSign integration: admin pastes the envelope link and
// flips status as they go. Document collection is also manual: admin marks each
// required doc as received / verified.
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FileSignature, Send, CheckCircle2, XCircle, FileText, Plus, Bell,
  AlertTriangle, ExternalLink, Mail, Sparkles, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import CustomerKindBadge, { resolveKind } from "./CustomerKindBadge";

interface SubmissionDoc {
  id: string;
  submission_id: string;
  document_type: string;
  label: string;
  status: "pending" | "received" | "verified" | "na";
  requested_at: string | null;
  received_at: string | null;
  notes: string | null;
}

interface ReminderRow {
  id: string;
  reminder_type: string;
  sent_at: string;
  notes: string | null;
}

interface LinkedEmail {
  id: string;
  subject: string | null;
  from_email: string;
  received_at: string;
  ai_summary: string | null;
  ai_intent: string | null;
}

export interface JourneySubmission {
  id: string;
  name: string | null;
  email: string | null;
  source: string | null;
  customer_kind?: string | null;
  docusign_status?: string | null;
  docusign_sent_at?: string | null;
  docusign_signed_at?: string | null;
  docusign_envelope_url?: string | null;
  documents_requested_at?: string | null;
  closed_at?: string | null;
  closed_outcome?: string | null;
}

// Standard checklists by customer kind. Admin can add custom items.
const SELLER_DOCS: { type: string; label: string; required: boolean }[] = [
  { type: "poa", label: "Power of Attorney", required: true },
  { type: "deed", label: "Deed / Cemetery Certificate", required: true },
  { type: "title", label: "Title / Ownership Proof", required: false },
  { type: "affidavit_of_heirship", label: "Affidavit of Heirship", required: false },
  { type: "id", label: "Government-issued ID", required: false },
];

const BUYER_DOCS: { type: string; label: string; required: boolean }[] = [
  { type: "id", label: "Government-issued ID", required: true },
  { type: "deposit", label: "Deposit / Payment Confirmation", required: true },
];

const docusignSteps: Record<string, { label: string; cls: string; Icon: any }> = {
  not_sent:  { label: "Not sent",  cls: "bg-muted text-muted-foreground border-border", Icon: FileSignature },
  sent:      { label: "Sent — awaiting signature", cls: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400", Icon: Send },
  signed:    { label: "Signed",    cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400", Icon: CheckCircle2 },
  declined:  { label: "Declined",  cls: "bg-rose-500/10 text-rose-700 border-rose-500/25 dark:text-rose-400", Icon: XCircle },
};

interface Props {
  submission: JourneySubmission;
  onSubmissionPatched: (patch: Partial<JourneySubmission>) => Promise<void>;
}

const daysSince = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
};

const CustomerJourney = ({ submission, onSubmissionPatched }: Props) => {
  const kind = resolveKind(submission.customer_kind, submission.source);
  const [docs, setDocs] = useState<SubmissionDoc[]>([]);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [emails, setEmails] = useState<LinkedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [envelopeUrlDraft, setEnvelopeUrlDraft] = useState(submission.docusign_envelope_url ?? "");
  const [customDocLabel, setCustomDocLabel] = useState("");

  useEffect(() => {
    setEnvelopeUrlDraft(submission.docusign_envelope_url ?? "");
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission.id]);

  const fetchAll = async () => {
    setLoading(true);
    const [d, r, e] = await Promise.all([
      supabase.from("submission_documents" as any).select("*")
        .eq("submission_id", submission.id).order("created_at", { ascending: true }),
      supabase.from("reminder_log" as any).select("*")
        .eq("submission_id", submission.id).order("sent_at", { ascending: false }),
      supabase.from("email_messages" as any).select("id, subject, from_email, received_at, ai_summary, ai_intent")
        .eq("matched_submission_id", submission.id).order("received_at", { ascending: false }),
    ]);
    if (d.data) setDocs(d.data as any);
    if (r.data) setReminders(r.data as any);
    if (e.data) setEmails(e.data as any);
    setLoading(false);
  };

  // Seed the standard checklist if it hasn't been created yet.
  const seedChecklist = async () => {
    const template = kind === "seller" ? SELLER_DOCS : kind === "buyer" ? BUYER_DOCS : [];
    if (template.length === 0) {
      toast({ title: "No standard checklist", description: "Use 'Add document' below to create custom items." });
      return;
    }
    const rows = template.map((t) => ({
      submission_id: submission.id,
      document_type: t.type,
      label: t.label,
      status: "pending" as const,
      requested_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("submission_documents" as any).insert(rows);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    await onSubmissionPatched({ documents_requested_at: new Date().toISOString() });
    toast({ title: "Document request started" });
    fetchAll();
  };

  const addCustomDoc = async () => {
    if (!customDocLabel.trim()) return;
    const { error } = await supabase.from("submission_documents" as any).insert({
      submission_id: submission.id,
      document_type: "custom",
      label: customDocLabel.trim(),
      status: "pending",
      requested_at: new Date().toISOString(),
    });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { setCustomDocLabel(""); fetchAll(); }
  };

  const updateDocStatus = async (id: string, status: SubmissionDoc["status"]) => {
    const patch: any = { status };
    if (status === "received" || status === "verified") patch.received_at = new Date().toISOString();
    const { error } = await supabase.from("submission_documents" as any).update(patch).eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else fetchAll();
  };

  const removeDoc = async (id: string) => {
    const { error } = await supabase.from("submission_documents" as any).delete().eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else fetchAll();
  };

  const setDocusign = async (status: string) => {
    const patch: Partial<JourneySubmission> = { docusign_status: status };
    if (status === "sent" && !submission.docusign_sent_at) patch.docusign_sent_at = new Date().toISOString();
    if (status === "signed") patch.docusign_signed_at = new Date().toISOString();
    await onSubmissionPatched(patch);
  };

  const saveEnvelopeUrl = async () => {
    if (envelopeUrlDraft === (submission.docusign_envelope_url ?? "")) return;
    await onSubmissionPatched({ docusign_envelope_url: envelopeUrlDraft || null });
    toast({ title: "Envelope link saved" });
  };

  const logReminder = async (type: "docusign" | "documents" | "follow_up", subject: string, body: string) => {
    if (!submission.email) {
      toast({ title: "No email on file", description: "Can't compose without a recipient.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("reminder_log" as any).insert({
      submission_id: submission.id,
      reminder_type: type,
      sent_via: "manual_email",
    });
    if (error) {
      toast({ title: "Failed to log", description: error.message, variant: "destructive" });
      return;
    }
    window.location.href = `mailto:${submission.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    fetchAll();
  };

  const docusignStatus = submission.docusign_status ?? "not_sent";
  const dStep = docusignSteps[docusignStatus] ?? docusignSteps.not_sent;

  const pendingDocs = docs.filter((d) => d.status === "pending");
  const receivedDocs = docs.filter((d) => d.status === "received" || d.status === "verified");
  const allDocsIn = docs.length > 0 && pendingDocs.length === 0;

  // Smart reminder prompts based on time elapsed and outstanding state.
  const prompts = useMemo(() => {
    const out: { kind: "docusign" | "documents" | "follow_up"; message: string }[] = [];
    const sentDays = daysSince(submission.docusign_sent_at);
    if (docusignStatus === "sent" && sentDays !== null && sentDays >= 3) {
      out.push({
        kind: "docusign",
        message: `DocuSign sent ${sentDays} day${sentDays === 1 ? "" : "s"} ago and not yet signed — send a reminder?`,
      });
    }
    const reqDays = daysSince(submission.documents_requested_at);
    if (pendingDocs.length > 0 && reqDays !== null && reqDays >= 3) {
      out.push({
        kind: "documents",
        message: `${pendingDocs.length} document${pendingDocs.length === 1 ? "" : "s"} still outstanding ${reqDays} day${reqDays === 1 ? "" : "s"} after request.`,
      });
    }
    return out;
  }, [docusignStatus, submission.docusign_sent_at, submission.documents_requested_at, pendingDocs.length]);

  const fullySignedUp =
    docusignStatus === "signed" && allDocsIn && submission.closed_outcome !== "won";

  return (
    <div className="space-y-5">
      {/* ================= Smart prompts ================= */}
      {prompts.length > 0 && (
        <div className="space-y-2">
          {prompts.map((p) => (
            <div key={p.kind} className="flex items-start justify-between gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
              <div className="flex items-start gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">{p.message}</p>
              </div>
              <button
                onClick={() => {
                  if (p.kind === "docusign") {
                    logReminder(
                      "docusign",
                      `Reminder: signature needed`,
                      `Hi ${submission.name ?? "there"},\n\nJust a friendly reminder — your DocuSign envelope is still waiting on your signature. Let us know if you ran into any trouble opening it and we'll resend straight away.\n\nThanks,\nThe Team at Texas Cemetery Brokers`
                    );
                  } else {
                    const list = pendingDocs.map((d) => `• ${d.label}`).join("\n");
                    logReminder(
                      "documents",
                      `Reminder: outstanding documents`,
                      `Hi ${submission.name ?? "there"},\n\nWe're still waiting on the following items to finish your file:\n\n${list}\n\nReply with photos or scans whenever you have a moment.\n\nThanks,\nThe Team at Texas Cemetery Brokers`
                    );
                  }
                }}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background text-[11px] font-medium rounded-full hover:opacity-90"
              >
                <Bell className="w-3 h-3" /> Send reminder
              </button>
            </div>
          ))}
        </div>
      )}

      {fullySignedUp && (
        <div className="flex items-center justify-between gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">Everything signed and all documents in. Send the final confirmation email and close as won.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => logReminder(
                "follow_up",
                `Welcome aboard — you're all set`,
                `Hi ${submission.name ?? "there"},\n\nGreat news — we have your signed paperwork and every document we need on file. You're officially signed up with Texas Cemetery Brokers and we'll be in touch with next steps shortly.\n\nThanks,\nThe Team at Texas Cemetery Brokers`
              )}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-medium rounded-full hover:opacity-90"
            >
              <Mail className="w-3 h-3" /> Send welcome
            </button>
            <button
              onClick={() => onSubmissionPatched({ closed_at: new Date().toISOString(), closed_outcome: "won" })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background text-[11px] font-medium rounded-full"
            >
              Mark closed
            </button>
          </div>
        </div>
      )}

      {/* ================= DocuSign tracker ================= */}
      <section className="bg-muted/30 rounded-xl border border-border/50 p-4">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-medium text-foreground">DocuSign</h4>
            <CustomerKindBadge kind={kind} size="xs" />
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${dStep.cls}`}>
            <dStep.Icon className="w-3 h-3" /> {dStep.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {(["not_sent", "sent", "signed", "declined"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setDocusign(s)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                docusignStatus === s
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {docusignSteps[s].label}
            </button>
          ))}
        </div>

        <label className="text-[10px] uppercase tracking-wide text-muted-foreground block mb-1">Envelope link (optional)</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={envelopeUrlDraft}
            onChange={(e) => setEnvelopeUrlDraft(e.target.value)}
            onBlur={saveEnvelopeUrl}
            placeholder="https://app.docusign.com/..."
            className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {submission.docusign_envelope_url && (
            <a
              href={submission.docusign_envelope_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-card border border-border rounded-lg text-xs text-foreground hover:bg-muted/50"
            >
              <ExternalLink className="w-3 h-3" /> Open
            </a>
          )}
        </div>

        {(submission.docusign_sent_at || submission.docusign_signed_at) && (
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
            {submission.docusign_sent_at && <span><Clock className="w-2.5 h-2.5 inline mr-0.5" /> Sent {formatDistanceToNow(new Date(submission.docusign_sent_at), { addSuffix: true })}</span>}
            {submission.docusign_signed_at && <span className="text-emerald-600">· Signed {formatDistanceToNow(new Date(submission.docusign_signed_at), { addSuffix: true })}</span>}
          </p>
        )}
      </section>

      {/* ================= Document checklist ================= */}
      <section className="bg-muted/30 rounded-xl border border-border/50 p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-medium text-foreground">
              Documents <span className="text-muted-foreground font-normal">({receivedDocs.length}/{docs.length})</span>
            </h4>
          </div>
          {docs.length === 0 && (
            <button onClick={seedChecklist} className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-[11px] font-medium rounded-full hover:opacity-90">
              <Plus className="w-3 h-3" /> Start {kind} checklist
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : docs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No documents requested yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {docs.map((d) => {
              const done = d.status === "received" || d.status === "verified";
              return (
                <li key={d.id} className="flex items-center gap-2 text-xs bg-card rounded-lg border border-border/50 px-3 py-2">
                  <button
                    onClick={() => updateDocStatus(d.id, done ? "pending" : "received")}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      done ? "bg-emerald-500 border-emerald-500" : "border-border bg-background"
                    }`}
                  >
                    {done && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </button>
                  <span className={`flex-1 ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {d.label}
                  </span>
                  <select
                    value={d.status}
                    onChange={(e) => updateDocStatus(d.id, e.target.value as SubmissionDoc["status"])}
                    className="bg-background border border-border rounded px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    <option value="pending">pending</option>
                    <option value="received">received</option>
                    <option value="verified">verified</option>
                    <option value="na">N/A</option>
                  </select>
                  <button onClick={() => removeDoc(d.id)} className="text-muted-foreground/60 hover:text-destructive text-[10px]">×</button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex gap-2 mt-3">
          <input
            value={customDocLabel}
            onChange={(e) => setCustomDocLabel(e.target.value)}
            placeholder="Add custom document…"
            className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button onClick={addCustomDoc} className="inline-flex items-center gap-1 px-3 py-1.5 bg-card border border-border rounded-lg text-xs hover:bg-muted/50">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>

        {pendingDocs.length > 0 && (
          <button
            onClick={() => {
              const list = pendingDocs.map((d) => `• ${d.label}`).join("\n");
              logReminder(
                "documents",
                `Documents needed to finalize`,
                `Hi ${submission.name ?? "there"},\n\nTo finalize your file we still need the following:\n\n${list}\n\nReply with photos or scans whenever you have a moment.\n\nThanks,\nThe Team at Texas Cemetery Brokers`
              );
            }}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background text-[11px] font-medium rounded-full hover:opacity-90"
          >
            <Mail className="w-3 h-3" /> Email outstanding list
          </button>
        )}
      </section>

      {/* ================= Linked emails ================= */}
      <section className="bg-muted/30 rounded-xl border border-border/50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-medium text-foreground">
            Email thread <span className="text-muted-foreground font-normal">({emails.length})</span>
          </h4>
        </div>
        {emails.length === 0 ? (
          <p className="text-xs text-muted-foreground">No matched emails yet. Run "Sync Inbox" on the Gmail tab.</p>
        ) : (
          <ul className="space-y-1.5">
            {emails.map((e) => (
              <li key={e.id} className="bg-card rounded-lg border border-border/50 px-3 py-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground truncate flex-1">{e.subject || "(no subject)"}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(e.received_at), { addSuffix: true })}
                  </span>
                </div>
                {e.ai_summary && (
                  <p className="text-muted-foreground italic mt-1 flex items-start gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-primary shrink-0 mt-0.5" />
                    {e.ai_summary}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ================= Reminder history ================= */}
      {reminders.length > 0 && (
        <section className="bg-muted/30 rounded-xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-medium text-foreground">Reminder history</h4>
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {reminders.slice(0, 5).map((r) => (
              <li key={r.id}>
                · {r.reminder_type.replace("_", " ")} reminder — {formatDistanceToNow(new Date(r.sent_at), { addSuffix: true })}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default CustomerJourney;
