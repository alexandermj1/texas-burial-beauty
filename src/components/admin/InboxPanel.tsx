import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, RefreshCw, Link2, MailOpen, FilePlus2, ArrowRight, PenSquare, Reply, Archive, Trash2, MailMinus, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import CustomerKindBadge, { resolveKind, type CustomerKind } from "./CustomerKindBadge";

interface EmailMessage {
  id: string;
  gmail_message_id: string;
  gmail_thread_id: string;
  from_email: string;
  from_name: string | null;
  to_email: string | null;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  body_html: string | null;
  received_at: string;
  is_read: boolean;
  ai_summary: string | null;
  ai_intent: string | null;
  ai_draft_reply: string | null;
  matched_submission_id: string | null;
  match_confidence: string | null;
}

interface Props {
  onJumpToSubmission?: (submissionId: string) => void;
}

const TARGET_MAILBOX = "info@texascemeterybrokers.com";

const InboxPanel = ({ onJumpToSubmission }: Props) => {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<EmailMessage | null>(null);
  const [filter, setFilter] = useState<"all" | "matched" | "unmatched" | "unread">("all");
  const [search, setSearch] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");
  const [kindBySubmission, setKindBySubmission] = useState<Record<string, CustomerKind>>({});
  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState({ to: "", cc: "", subject: "", body: "" });

  useEffect(() => { fetchEmails(); }, []);

  const fetchEmails = async () => {
    setLoading(true);
    const rows: any[] = [];
    let errorMessage: string | null = null;
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("email_messages" as any)
        .select("*")
        .order("received_at", { ascending: false })
        .range(from, from + 999);
      if (error) { errorMessage = error.message; break; }
      rows.push(...((data ?? []) as any[]));
      if (!data || data.length < 1000) break;
    }
    if (errorMessage) toast({ title: "Failed to load emails", description: errorMessage, variant: "destructive" });
    else {
      setEmails(rows as any);
      const subIds = Array.from(new Set(rows.map(r => r.matched_submission_id).filter(Boolean)));
      if (subIds.length > 0) {
        const { data: subs } = await supabase
          .from("contact_submissions" as any)
          .select("id, customer_kind, source")
          .in("id", subIds);
        if (subs) {
          const map: Record<string, CustomerKind> = {};
          (subs as any[]).forEach(s => { map[s.id] = resolveKind(s.customer_kind, s.source); });
          setKindBySubmission(map);
        }
      } else setKindBySubmission({});
    }
    setLoading(false);
  };

  const sync = async () => {
    setSyncing(true);
    setSyncProgress("Starting Gmail import...");
    try {
      let pageToken: string | undefined;
      let totalNew = 0;
      let totalSeen = 0;
      let pages = 0;
      do {
        const { data, error } = await supabase.functions.invoke("sync-inbox", { body: { pageToken, maxResults: 100 } });
        if (error || data?.error) {
          toast({ title: "Sync failed", description: error?.message || data?.error || "Unknown sync error", variant: "destructive" });
          return;
        }
        totalNew += data?.newly_synced ?? 0;
        totalSeen += data?.page_size ?? 0;
        pages += 1;
        pageToken = data?.next_page_token || undefined;
        setSyncProgress(`Imported ${totalSeen} Gmail messages${pageToken ? "..." : ""}`);
      } while (pageToken);
      toast({ title: "Gmail imported", description: `${totalSeen} messages checked across ${pages} page${pages === 1 ? "" : "s"} · ${totalNew} new saved.` });
      await fetchEmails();
    } catch (e) {
      toast({ title: "Sync failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally { setSyncing(false); setSyncProgress(""); }
  };

  const openEmail = async (email: EmailMessage) => {
    setSelected(email);
    setReplyBody("");
    // Auto-mark as read
    if (!email.is_read) {
      try {
        await supabase.functions.invoke("gmail-action", {
          body: { action: "modify", messageId: email.gmail_message_id, removeLabelIds: ["UNREAD"] },
        });
        setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, is_read: true } : e));
      } catch { /* ignore */ }
    }
  };

  const sendReply = async () => {
    if (!selected || !replyBody.trim()) return;
    setSending(true);
    const subject = selected.subject?.toLowerCase().startsWith("re:") ? selected.subject : `Re: ${selected.subject ?? ""}`;
    const { data, error } = await supabase.functions.invoke("gmail-action", {
      body: {
        action: "send",
        to: selected.from_email,
        subject,
        body: replyBody,
        threadId: selected.gmail_thread_id,
        inReplyToGmailId: selected.gmail_message_id,
      },
    });
    setSending(false);
    if (error || data?.error) {
      toast({ title: "Reply failed", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Reply sent", description: `Replied to ${selected.from_email}` });
    setReplyBody("");
    await fetchEmails();
  };

  const sendCompose = async () => {
    if (!compose.to.trim() || !compose.body.trim()) {
      toast({ title: "Missing fields", description: "Recipient and message are required.", variant: "destructive" });
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("gmail-action", {
      body: { action: "send", to: compose.to, cc: compose.cc, subject: compose.subject, body: compose.body },
    });
    setSending(false);
    if (error || data?.error) {
      toast({ title: "Send failed", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Email sent", description: `Sent to ${compose.to}` });
    setCompose({ to: "", cc: "", subject: "", body: "" });
    setComposeOpen(false);
    await fetchEmails();
  };

  const markUnread = async (email: EmailMessage) => {
    await supabase.functions.invoke("gmail-action", { body: { action: "modify", messageId: email.gmail_message_id, addLabelIds: ["UNREAD"] } });
    setEmails((prev) => prev.map((e) => e.id === email.id ? { ...e, is_read: false } : e));
    toast({ title: "Marked as unread" });
  };

  const archive = async (email: EmailMessage) => {
    await supabase.functions.invoke("gmail-action", { body: { action: "modify", messageId: email.gmail_message_id, removeLabelIds: ["INBOX"] } });
    toast({ title: "Archived" });
  };

  const trash = async (email: EmailMessage) => {
    if (!confirm("Move this email to Trash?")) return;
    const { error } = await supabase.functions.invoke("gmail-action", { body: { action: "trash", messageId: email.gmail_message_id } });
    if (error) { toast({ title: "Trash failed", variant: "destructive" }); return; }
    setEmails((prev) => prev.filter((e) => e.id !== email.id));
    if (selected?.id === email.id) setSelected(null);
    toast({ title: "Moved to trash" });
  };

  const promoteToSubmission = async (email: EmailMessage, source: "contact" | "sell" | "buy" = "contact") => {
    const { data, error } = await supabase.functions.invoke("promote-email-to-submission", { body: { email_id: email.id, source } });
    if (error || data?.error) toast({ title: "Failed", description: error?.message || data?.error, variant: "destructive" });
    else { toast({ title: "Submission created" }); await fetchEmails(); }
  };

  const filtered = emails.filter((e) => {
    if (filter === "matched" && !e.matched_submission_id) return false;
    if (filter === "unmatched" && e.matched_submission_id) return false;
    if (filter === "unread" && e.is_read) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${e.from_email} ${e.from_name ?? ""} ${e.subject ?? ""} ${e.snippet ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const unreadCount = emails.filter((e) => !e.is_read).length;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-card rounded-2xl border border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-base text-foreground">{TARGET_MAILBOX}</h3>
            <p className="text-xs text-muted-foreground">{emails.length} cached · {unreadCount} unread</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search inbox..."
            className="px-3 py-2 rounded-full bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 w-44"
          />
          <div className="flex bg-background rounded-full border border-border p-0.5">
            {(["all", "unread", "matched", "unmatched"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all capitalize ${
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >{f}</button>
            ))}
          </div>
          <button
            onClick={() => setComposeOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-foreground text-background text-sm font-medium rounded-full hover:opacity-90"
          >
            <PenSquare className="w-4 h-4" /> Compose
          </button>
          <button
            onClick={sync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Refresh"}
          </button>
        </div>
      </div>
      {syncProgress && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">{syncProgress}</div>
      )}

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading inbox...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
          <Mail className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No emails {filter !== "all" ? `(${filter})` : "yet"}.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-4 items-start">
          {/* List */}
          <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
            {filtered.map((email, i) => {
              const isSelected = selected?.id === email.id;
              return (
                <motion.button
                  key={email.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  onClick={() => openEmail(email)}
                  className={`w-full text-left bg-card rounded-xl border p-4 transition-all hover:border-primary/40 hover:shadow-sm ${
                    isSelected ? "border-primary/60 ring-2 ring-primary/10" : "border-border/50"
                  } ${!email.is_read ? "border-l-4 border-l-primary" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className={`text-sm truncate ${!email.is_read ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                          {email.from_name ?? email.from_email}
                        </p>
                        {email.matched_submission_id && kindBySubmission[email.matched_submission_id] && (
                          <CustomerKindBadge kind={kindBySubmission[email.matched_submission_id]} size="xs" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{email.from_email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className={`text-sm mb-1 line-clamp-1 ${!email.is_read ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                    {email.subject || "(no subject)"}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{email.snippet || email.body_text || "No preview"}</p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {email.matched_submission_id ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                        <Link2 className="w-2.5 h-2.5" /> Linked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                        Unmatched
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Detail panel */}
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="bg-card rounded-2xl border border-border/50 p-6 sticky top-4 max-h-[75vh] overflow-y-auto"
              >
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display text-lg text-foreground mb-1">{selected.subject || "(no subject)"}</h4>
                    <p className="text-sm text-muted-foreground">
                      From {selected.from_name ? `${selected.from_name} ` : ""}
                      <span className="text-foreground">{selected.from_email}</span>
                    </p>
                    {selected.to_email && (
                      <p className="text-xs text-muted-foreground">To {selected.to_email}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(selected.received_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
                </div>

                {/* Action toolbar */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <button onClick={() => markUnread(selected)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border border-border bg-background hover:bg-muted">
                    <MailMinus className="w-3 h-3" /> Mark unread
                  </button>
                  <button onClick={() => archive(selected)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border border-border bg-background hover:bg-muted">
                    <Archive className="w-3 h-3" /> Archive
                  </button>
                  <button onClick={() => trash(selected)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full border border-rose-300 text-rose-600 bg-background hover:bg-rose-50">
                    <Trash2 className="w-3 h-3" /> Trash
                  </button>
                </div>

                <div className="bg-background rounded-xl p-4 mb-4 max-h-80 overflow-y-auto">
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {selected.body_text || selected.snippet || "(no content)"}
                  </p>
                </div>

                {selected.matched_submission_id && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link2 className="w-4 h-4 text-primary shrink-0" />
                      <p className="text-xs text-foreground">
                        Linked to a customer record
                        {kindBySubmission[selected.matched_submission_id] && (
                          <span className="ml-2 inline-block align-middle">
                            <CustomerKindBadge kind={kindBySubmission[selected.matched_submission_id]} size="xs" />
                          </span>
                        )}
                      </p>
                    </div>
                    {onJumpToSubmission && (
                      <button
                        onClick={() => onJumpToSubmission(selected.matched_submission_id!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-[11px] font-medium rounded-full hover:opacity-90"
                      >
                        Open customer <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {!selected.matched_submission_id && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                    <p className="text-xs font-medium text-amber-900 mb-2">Not linked to a submission yet:</p>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => promoteToSubmission(selected, "buy")} className="inline-flex items-center gap-1 px-3 py-1.5 bg-card border border-amber-300 text-xs font-medium rounded-full hover:bg-amber-100">
                        <FilePlus2 className="w-3 h-3" /> As Buyer
                      </button>
                      <button onClick={() => promoteToSubmission(selected, "sell")} className="inline-flex items-center gap-1 px-3 py-1.5 bg-card border border-amber-300 text-xs font-medium rounded-full hover:bg-amber-100">
                        <FilePlus2 className="w-3 h-3" /> As Seller
                      </button>
                      <button onClick={() => promoteToSubmission(selected, "contact")} className="inline-flex items-center gap-1 px-3 py-1.5 bg-card border border-amber-300 text-xs font-medium rounded-full hover:bg-amber-100">
                        <FilePlus2 className="w-3 h-3" /> As General
                      </button>
                    </div>
                  </div>
                )}

                {/* Reply box */}
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Reply className="w-3 h-3" /> Reply to {selected.from_email}
                  </p>
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
                    placeholder="Write your reply..."
                  />
                  <div className="flex justify-between items-center gap-2">
                    <p className="text-[10px] text-muted-foreground">Sends from {TARGET_MAILBOX} · stays in same thread</p>
                    <div className="flex gap-2">
                      <button onClick={() => setReplyBody("")} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground">Clear</button>
                      <button
                        onClick={sendReply}
                        disabled={sending || !replyBody.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:opacity-90 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" /> {sending ? "Sending..." : "Send reply"}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-card rounded-2xl border border-dashed border-border/50 p-12 text-center sticky top-4">
                <MailOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select an email to read and reply.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Compose modal */}
      <AnimatePresence>
        {composeOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
            onClick={() => setComposeOpen(false)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl border border-border w-full max-w-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                <div>
                  <h4 className="font-display text-base text-foreground">New message</h4>
                  <p className="text-xs text-muted-foreground">From {TARGET_MAILBOX}</p>
                </div>
                <button onClick={() => setComposeOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <input
                  value={compose.to}
                  onChange={(e) => setCompose({ ...compose, to: e.target.value })}
                  placeholder="To (comma-separated)"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  value={compose.cc}
                  onChange={(e) => setCompose({ ...compose, cc: e.target.value })}
                  placeholder="Cc (optional)"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                  value={compose.subject}
                  onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
                  placeholder="Subject"
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <textarea
                  value={compose.body}
                  onChange={(e) => setCompose({ ...compose, body: e.target.value })}
                  rows={10}
                  placeholder="Write your message..."
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-muted/20">
                <button onClick={() => setComposeOpen(false)} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                <button
                  onClick={sendCompose}
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:opacity-90 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InboxPanel;
