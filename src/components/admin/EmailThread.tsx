// Renders the full back-and-forth email chain for a single submission.
// Matches messages by matched_submission_id OR by the customer's email address
// appearing in from/to fields so threads still show even if the linker missed it.
// Replies are composed and sent inline (no Gmail tab) via the gmail-action edge fn.
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Mail, Sparkles, Reply, PenLine } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { isOutgoing, classifyEmailKind, extractQuoteAmount, EMAIL_KIND_META, EMAIL_KIND_RING } from "@/lib/emailReply";
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
  body_html: string | null;
  gmail_thread_id: string | null;
  gmail_message_id: string | null;
}

const emailKind = (message: EmailRow) =>
  isOutgoing(message.from_email)
    ? classifyEmailKind(
        message.subject,
        `${message.body_html || ""} ${message.body_text || ""} ${message.snippet || ""}`,
      )
    : null;

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
  /** When provided (Texas buyer), the composer exposes "Attach plot cards". */
  buyerContext?: {
    id: string;
    name: string | null;
    email: string | null;
    cemetery: string | null;
    property_type?: string | null;
  } | null;
  /** When provided (Texas seller), the composer exposes "Attach listing options". */
  sellerContext?: {
    id: string;
    name: string | null;
    email: string | null;
    cemetery: string | null;
    section: string | null;
    property_type: string | null;
    spaces: string | null;
    space_numbers?: string | null;
    lawn?: string | null;
    transfer_fee_amount?: number | string | null;
  } | null;
  /** When this changes, open a new email pre-loaded with the given template. */
  autoCompose?: { templateId: string; nonce: number } | null;
}

const EmailThread = ({ submissionId, customerEmail, customerName, cemetery, newEmailTemplates, onNewEmailSent, buyerContext, sellerContext, autoCompose }: Props) => {
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [composeNew, setComposeNew] = useState(false);
  const [forcedTemplateId, setForcedTemplateId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
  // When the listing agreement for this submission is signed, the LA email tag
  // flips to a green "Listing agreement signed" chip.
  const [laSignedAt, setLaSignedAt] = useState<string | null>(null);

  // The guided stage buttons (e.g. "Build and send quote") open the very same
  // composer a broker would use by hand, with the requested pack already open.
  useEffect(() => {
    if (!autoCompose) return;
    setForcedTemplateId(autoCompose.templateId);
    setReplyingTo(null);
    setComposeNew(true);
  }, [autoCompose?.nonce, autoCompose?.templateId]);


  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("contracts" as any)
        .select("signed_at")
        .eq("submission_id", submissionId)
        .eq("kind", "listing_agreement")
        .not("signed_at", "is", null)
        .order("signed_at", { ascending: false })
        .limit(1);
      if (!cancelled) setLaSignedAt(((data as any[]) || [])[0]?.signed_at ?? null);
    };
    load();
    const ch = supabase.channel(`contracts_la:${submissionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contracts" }, () => load())
      .subscribe();
    return () => { cancelled = true; ch.unsubscribe(); supabase.removeChannel(ch); };
  }, [submissionId]);

  const refresh = async () => {
    const addr = (customerEmail || "").trim().toLowerCase();
    const orParts: string[] = [`matched_submission_id.eq.${submissionId}`];
    if (addr) {
      orParts.push(`from_email.ilike.%${addr}%`);
      orParts.push(`to_email.ilike.%${addr}%`);
    }
    const { data } = await supabase
      .from("email_messages" as any)
      .select("id, subject, from_email, from_name, to_email, received_at, ai_summary, snippet, body_text, body_html, gmail_thread_id, gmail_message_id")
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
  const newestFirst = [...emails].reverse();
  // Workflow emails carry the facts that move a seller through the process.
  // Keep every one in the feed even when it is older than the recent-message
  // window, while ordinary correspondence remains compact.
  const recentIds = new Set(newestFirst.slice(0, 4).map((email) => email.id));
  const visibleEmails = showAll
    ? newestFirst
    : newestFirst.filter((email) => recentIds.has(email.id) || emailKind(email) !== null);
  const hiddenCount = Math.max(0, emails.length - visibleEmails.length);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
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
            className="ml-auto inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground hover:opacity-90"
            title="Start a new email to this customer"
          >
            <PenLine className="w-2.5 h-2.5" /> New email
          </button>
        )}
      </div>

      {composeNew && replyTarget && (
        <div className="border-b border-border bg-muted/20 p-3">
          <InlineEmailComposer
            key={forcedTemplateId ?? "new"}
            to={replyTarget}
            defaultSubject={cemetery ? `Regarding your inquiry: ${cemetery}` : "Regarding your inquiry"}
            recipientName={customerName}
            templates={newEmailTemplates}
            initialTemplateId={forcedTemplateId}
            submissionId={submissionId}
            buyerContext={buyerContext ?? undefined}
            sellerContext={sellerContext ?? undefined}
            onSent={(meta) => { setComposeNew(false); setForcedTemplateId(null); onNewEmailSent?.(meta); refresh(); }}
            onCancel={() => { setComposeNew(false); setForcedTemplateId(null); }}
          />
        </div>
      )}

      {loading ? (
        <p className="p-4 text-xs text-muted-foreground">Loading messages…</p>
      ) : emails.length === 0 ? (
        <p className="p-4 text-xs text-muted-foreground">No emails found for this customer yet.</p>
      ) : (
        <div>
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="flex w-full items-center justify-center gap-1.5 border-b border-border bg-muted/20 px-3 py-2 text-[11px] font-medium text-primary hover:bg-muted/40"
            >
              <ChevronDown className="h-3.5 w-3.5" /> Show {hiddenCount} earlier message{hiddenCount === 1 ? "" : "s"}
            </button>
          )}
          {showAll && emails.length > 4 && (
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="flex w-full items-center justify-center gap-1.5 border-b border-border bg-muted/20 px-3 py-2 text-[11px] font-medium text-primary hover:bg-muted/40"
            >
              <ChevronUp className="h-3.5 w-3.5" /> Show recent messages only
            </button>
          )}
          <ul className="divide-y divide-border/60">
          {visibleEmails.map((e) => {
            const outgoing = isOutgoing(e.from_email);
            const sender = outgoing ? "You" : (e.from_name && e.from_name.trim()) || e.from_email;
            const body = (e.body_text && e.body_text.trim()) || e.snippet || "";
             const kind = emailKind(e);
            // A later quote only counts as a *revision* when the figure actually
            // changed from the previous quote in the thread; otherwise it is a re-send.
            const quoteAmount = kind === "quote" ? extractQuoteAmount(`${e.body_html || ""} ${e.body_text || ""}`) : null;
            let quoteLabel = "";
            if (kind === "quote") {
               const quotes = emails.filter((m) => emailKind(m) === "quote");
              const idx = quotes.findIndex((m) => m.id === e.id);
              const prevAmount = idx > 0
                ? (() => {
                    for (let i = idx - 1; i >= 0; i--) {
                      const a = extractQuoteAmount(`${quotes[i].body_html || ""} ${quotes[i].body_text || ""}`);
                      if (a) return a;
                    }
                    return null;
                  })()
                : null;
              const amt = quoteAmount ? ` · $${quoteAmount.toLocaleString()}` : "";
              if (idx <= 0) quoteLabel = `Quote sent${amt}`;
              else if (quoteAmount && prevAmount && quoteAmount !== prevAmount)
                quoteLabel = `Quote revised${amt} (was $${prevAmount.toLocaleString()})`;
              else quoteLabel = `Quote re-sent${amt}`;
            }
            const laSigned = kind === "listing_agreement" && !!laSignedAt;
            const kindLabel = kind === "quote"
              ? quoteLabel
              : laSigned ? "Listing agreement signed"
              : kind ? EMAIL_KIND_META[kind].label : "";
            const kindClass = laSigned
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
              : kind ? EMAIL_KIND_META[kind].className : "";
            const ringClass = laSigned
              ? "bg-emerald-500/5 border-emerald-500/40 ring-1 ring-emerald-500/20"
              : kind ? EMAIL_KIND_RING[kind] : "";
            const replyToAddr = outgoing ? (e.to_email || replyTarget) : (e.from_email || replyTarget);
            const replySubject = e.subject ? (e.subject.toLowerCase().startsWith("re:") ? e.subject : `Re: ${e.subject}`) : "";
            const isOpen = replyingTo === e.id;
             const messageOpen = kind !== null || expandedMessage === e.id || isOpen;
            return (
              <li
                key={e.id}
                className={`px-4 py-3 text-xs transition-colors ${
                  kind ? ringClass : outgoing ? "bg-primary/5" : "bg-card"
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
                    {kind && (
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded-full border ${kindClass}`}
                        title={`${kindLabel} · ${new Date(e.received_at).toLocaleDateString()}`}
                      >
                        {kindLabel}
                        <span className="font-medium opacity-80">
                          {new Date(e.received_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </span>
                    )}
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

                {body && kind === null && <button type="button" onClick={() => setExpandedMessage(messageOpen ? null : e.id)} className="mt-1 w-full text-left text-muted-foreground hover:text-foreground">
                  {!messageOpen && <span className="line-clamp-2 whitespace-pre-wrap">{body}</span>}
                  {messageOpen && <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-primary"><ChevronUp className="h-3 w-3" /> Collapse message</span>}
                </button>}
                {body && messageOpen && <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-border/50 bg-background/70 p-3 font-sans leading-relaxed text-foreground/90">{body}</pre>}
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
                    templates={newEmailTemplates}
                    submissionId={submissionId}
                    buyerContext={buyerContext ?? undefined}
                    sellerContext={sellerContext ?? undefined}
                    sendLabel="Send reply"
                    onSent={(meta) => { setReplyingTo(null); onNewEmailSent?.(meta); refresh(); }}
                    onCancel={() => setReplyingTo(null)}
                  />
                )}
              </li>
            );
          })}
          </ul>
        </div>
      )}
    </section>
  );
};

export default EmailThread;
