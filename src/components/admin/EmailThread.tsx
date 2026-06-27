// Renders the full back-and-forth email chain for a single submission.
// Matches messages by matched_submission_id OR by the customer's email address
// appearing in from/to fields so threads still show even if the linker missed it.
// Replies are composed and sent inline (no Gmail tab) via the gmail-action edge fn.
import { useEffect, useMemo, useState } from "react";
import { Mail, Sparkles, Reply, PenLine } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { isOutgoing } from "@/lib/emailReply";
import InlineEmailComposer from "./InlineEmailComposer";

interface EmailRow {
  id: string;
  subject: string | null;
  from_email: string;
  from_name: string | null;
  to_email: string | null;
  received_at: string;
  ai_summary: string | null;
  snippet: string | null;
  body_text: string | null;
  gmail_thread_id: string | null;
  gmail_message_id: string | null;
}

import type { EmailTemplate } from "@/lib/emailTemplates";

interface Props {
  submissionId: string;
  customerEmail: string | null;
  customerName?: string | null;
  cemetery?: string | null;
  /** Optional templates for the New email composer (first one is loaded by default). */
  newEmailTemplates?: EmailTemplate[];
  /** Called after a new email (from the templates composer) is sent. */
  onNewEmailSent?: (meta?: { templateId?: string | null }) => void;
}

const EmailThread = ({ submissionId, customerEmail, customerName, cemetery, newEmailTemplates, onNewEmailSent }: Props) => {
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [composeNew, setComposeNew] = useState(false);

  const refresh = async () => {
    const addr = (customerEmail || "").trim().toLowerCase();
    const orParts: string[] = [`matched_submission_id.eq.${submissionId}`];
    if (addr) {
      orParts.push(`from_email.ilike.%${addr}%`);
      orParts.push(`to_email.ilike.%${addr}%`);
    }
    const { data } = await supabase
      .from("email_messages" as any)
      .select("id, subject, from_email, from_name, to_email, received_at, ai_summary, snippet, body_text, gmail_thread_id, gmail_message_id")
      .or(orParts.join(","))
      .order("received_at", { ascending: true });
    const seen = new Set<string>();
    const uniq = ((data as any[]) || []).filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
    setEmails(uniq as any);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refresh().then(() => { if (cancelled) return; });
    const ch = supabase.channel(`email_thread:${submissionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "email_messages" }, () => { refresh(); })
      .subscribe();
    return () => { cancelled = true; ch.unsubscribe(); supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId, customerEmail]);

  const last = emails[emails.length - 1];
  const awaiting = !!last && !isOutgoing(last.from_email);

  const newSubject = useMemo(() => {
    const lastSub = emails[emails.length - 1]?.subject;
    return lastSub ? (lastSub.toLowerCase().startsWith("re:") ? lastSub : `Re: ${lastSub}`) : "";
  }, [emails]);

  const replyTarget = customerEmail || "";

  return (
    <section className="bg-muted/30 rounded-xl border border-border/50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-medium text-foreground">
          Email thread <span className="text-muted-foreground font-normal">({emails.length})</span>
        </h4>
        {awaiting && (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Needs reply
          </span>
        )}
        {replyTarget && !composeNew && (
          <button
            type="button"
            onClick={() => { setComposeNew(true); setReplyingTo(null); }}
            className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-foreground text-background hover:opacity-90"
            title="Start a new email to this customer"
          >
            <PenLine className="w-2.5 h-2.5" /> New email
          </button>
        )}
      </div>

      {composeNew && replyTarget && (
        <div className="mb-3">
          <InlineEmailComposer
            to={replyTarget}
            defaultSubject={cemetery ? `Regarding your inquiry: ${cemetery}` : "Regarding your inquiry"}
            recipientName={customerName}
            templates={newEmailTemplates}
            onSent={() => { setComposeNew(false); refresh(); }}
            onCancel={() => setComposeNew(false)}
          />
        </div>
      )}

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading messages…</p>
      ) : emails.length === 0 ? (
        <p className="text-xs text-muted-foreground">No emails found for this customer yet.</p>
      ) : (
        <ul className="space-y-2">
          {emails.map((e) => {
            const outgoing = isOutgoing(e.from_email);
            const sender = outgoing ? "You" : (e.from_name && e.from_name.trim()) || e.from_email;
            const body = (e.body_text && e.body_text.trim()) || e.snippet || "";
            const replyToAddr = outgoing ? (e.to_email || replyTarget) : (e.from_email || replyTarget);
            const replySubject = e.subject ? (e.subject.toLowerCase().startsWith("re:") ? e.subject : `Re: ${e.subject}`) : "";
            const isOpen = replyingTo === e.id;
            return (
              <li
                key={e.id}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  outgoing ? "bg-primary/5 border-primary/20" : "bg-card border-border/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded-full ${
                      outgoing ? "bg-primary/15 text-primary" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    }`}>
                      {outgoing ? "Sent" : "Received"}
                    </span>
                    <p className="font-medium text-foreground truncate">{sender}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(e.received_at), { addSuffix: true })}
                    </span>
                    {replyToAddr && (
                      <button
                        type="button"
                        onClick={() => { setReplyingTo(isOpen ? null : e.id); setComposeNew(false); }}
                        title="Reply in this thread without leaving the admin panel"
                        className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary text-primary-foreground hover:opacity-90"
                      >
                        <Reply className="w-2.5 h-2.5" /> {isOpen ? "Close" : "Reply"}
                      </button>
                    )}
                  </div>
                </div>
                <p className="font-medium text-foreground/90 truncate">{e.subject || "(no subject)"}</p>
                {body && (
                  <details className="mt-1 group">
                    <summary className="list-none cursor-pointer text-muted-foreground hover:text-foreground">
                      <span className="line-clamp-2 group-open:hidden whitespace-pre-wrap">{body}</span>
                      <span className="hidden group-open:inline text-[10px] uppercase tracking-wide text-primary">Hide message</span>
                    </summary>
                    <pre className="mt-1.5 whitespace-pre-wrap font-sans text-foreground/90 bg-background/60 rounded p-2 border border-border/40 max-h-80 overflow-y-auto">{body}</pre>
                  </details>
                )}
                {e.ai_summary && (
                  <p className="text-muted-foreground italic mt-1 flex items-start gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-primary shrink-0 mt-0.5" />
                    {e.ai_summary}
                  </p>
                )}
                {isOpen && replyToAddr && (
                  <InlineEmailComposer
                    to={replyToAddr}
                    defaultSubject={replySubject}
                    threadId={e.gmail_thread_id}
                    inReplyToGmailId={e.gmail_message_id}
                    recipientName={customerName}
                    sendLabel="Send reply"
                    onSent={() => { setReplyingTo(null); refresh(); }}
                    onCancel={() => setReplyingTo(null)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default EmailThread;
