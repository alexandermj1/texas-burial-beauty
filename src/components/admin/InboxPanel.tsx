import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, RefreshCw, Link2, ChevronRight, MailOpen, FilePlus2, ArrowRight } from "lucide-react";
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
  /** Called when admin clicks "Open customer" on a matched email — Admin.tsx switches tabs and selects. */
  onJumpToSubmission?: (submissionId: string) => void;
}

const InboxPanel = ({ onJumpToSubmission }: Props) => {
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<EmailMessage | null>(null);
  const [filter, setFilter] = useState<"all" | "matched" | "unmatched">("all");
  const [draftEdit, setDraftEdit] = useState("");
  const [syncProgress, setSyncProgress] = useState("");
  // Map submission_id -> customer kind, used to render colored badges next to matched emails.
  const [kindBySubmission, setKindBySubmission] = useState<Record<string, CustomerKind>>({});

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
      if (error) {
        errorMessage = error.message;
        break;
      }
      rows.push(...((data ?? []) as any[]));
      if (!data || data.length < 1000) break;
    }
    if (errorMessage) toast({ title: "Failed to load emails", description: errorMessage, variant: "destructive" });
    else {
      setEmails(rows as any);
      // Fetch the kind/source for every matched submission so we can render colored badges.
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
      } else {
        setKindBySubmission({});
      }
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
        const { data, error } = await supabase.functions.invoke("sync-inbox", {
          body: { pageToken, maxResults: 100 },
        });
        if (error || data?.error) {
          let msg = error?.message || data?.error || "Unknown sync error";
          try {
            const ctx = (error as any)?.context;
            if (ctx?.body) {
              const text = typeof ctx.body === "string" ? ctx.body : await new Response(ctx.body).text();
              const j = JSON.parse(text);
              if (j.error) msg = j.error;
            }
          } catch { /* ignore */ }
          toast({ title: "Sync failed", description: msg, variant: "destructive" });
          return;
        }

        totalNew += data?.newly_synced ?? 0;
        totalSeen += data?.page_size ?? 0;
        pages += 1;
        pageToken = data?.next_page_token || undefined;
        setSyncProgress(`Imported ${totalSeen} Gmail messages${pageToken ? "..." : ""}`);
      } while (pageToken);

      toast({
        title: "Gmail imported",
        description: `${totalSeen} messages checked across ${pages} page${pages === 1 ? "" : "s"} · ${totalNew} new saved. No AI used.`,
      });
      await fetchEmails();
    } catch (e) {
      toast({ title: "Sync failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setSyncing(false);
      setSyncProgress("");
    }
  };

  const promoteToSubmission = async (email: EmailMessage, source: "contact" | "sell" | "buy" = "contact") => {
    const { data, error } = await supabase.functions.invoke("promote-email-to-submission", {
      body: { email_id: email.id, source },
    });
    if (error || data?.error) {
      toast({ title: "Failed", description: error?.message || data?.error, variant: "destructive" });
    } else {
      toast({ title: "Submission created", description: "This email is now tracked under Submissions." });
      await fetchEmails();
    }
  };

  const openDraft = (email: EmailMessage) => {
    setSelected(email);
    setDraftEdit(email.ai_draft_reply ?? "");
  };

  const sendViaMailto = (email: EmailMessage) => {
    const subject = email.subject?.startsWith("Re:") ? email.subject : `Re: ${email.subject ?? ""}`;
    const url = `mailto:${email.from_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draftEdit)}`;
    window.location.href = url;
  };

  const filtered = emails.filter((e) => {
    if (filter === "matched") return !!e.matched_submission_id;
    if (filter === "unmatched") return !e.matched_submission_id;
    return true;
  });

  const unmatchedCount = emails.filter((e) => !e.matched_submission_id).length;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-card rounded-2xl border border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-base text-foreground">Gmail Inbox</h3>
            <p className="text-xs text-muted-foreground">
              {emails.length} cached · {unmatchedCount} need attention
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-background rounded-full border border-border p-0.5">
            {(["all", "matched", "unmatched"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all capitalize ${
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={sync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Inbox"}
          </button>
        </div>
      </div>
      {syncProgress && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
          {syncProgress}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">Loading inbox...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
          <Mail className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">No emails {filter !== "all" ? `(${filter})` : "yet"}.</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Sync Inbox" to pull Gmail messages directly.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4 items-start">
          {/* List */}
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {filtered.map((email, i) => {
              const isSelected = selected?.id === email.id;
              return (
                <motion.button
                  key={email.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  onClick={() => openDraft(email)}
                  className={`w-full text-left bg-card rounded-xl border p-4 transition-all hover:border-primary/40 hover:shadow-sm ${
                    isSelected ? "border-primary/60 ring-2 ring-primary/10" : "border-border/50"
                  } ${!email.is_read ? "border-l-4 border-l-primary" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
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
                  <p className="text-sm font-medium text-foreground mb-1 line-clamp-1">
                    {email.subject || "(no subject)"}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{email.snippet || email.body_text || "No preview available"}</p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {email.matched_submission_id ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                        <Link2 className="w-2.5 h-2.5" /> Linked to customer
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
                className="bg-card rounded-2xl border border-border/50 p-6 sticky top-4 max-h-[70vh] overflow-y-auto"
              >
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display text-lg text-foreground mb-1">{selected.subject || "(no subject)"}</h4>
                    <p className="text-sm text-muted-foreground">
                      From {selected.from_name ? `${selected.from_name} ` : ""}<span className="text-foreground">{selected.from_email}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(selected.received_at).toLocaleString()}
                    </p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground text-sm">
                    ✕
                  </button>
                </div>

                <div className="bg-background rounded-xl p-4 mb-4 max-h-60 overflow-y-auto">
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
                    <p className="text-xs font-medium text-amber-900 mb-2">
                      This email isn't linked to a form submission. Promote it to track as a lead:
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => promoteToSubmission(selected, "buy")} className="inline-flex items-center gap-1 px-3 py-1.5 bg-card border border-amber-300 text-xs font-medium rounded-full hover:bg-amber-100">
                        <FilePlus2 className="w-3 h-3" /> As Buyer Inquiry
                      </button>
                      <button onClick={() => promoteToSubmission(selected, "sell")} className="inline-flex items-center gap-1 px-3 py-1.5 bg-card border border-amber-300 text-xs font-medium rounded-full hover:bg-amber-100">
                        <FilePlus2 className="w-3 h-3" /> As Seller Inquiry
                      </button>
                      <button onClick={() => promoteToSubmission(selected, "contact")} className="inline-flex items-center gap-1 px-3 py-1.5 bg-card border border-amber-300 text-xs font-medium rounded-full hover:bg-amber-100">
                        <FilePlus2 className="w-3 h-3" /> As General Contact
                      </button>
                    </div>
                  </div>
                )}

                <div className="border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    Reply draft
                  </p>
                  <textarea
                    value={draftEdit}
                    onChange={(e) => setDraftEdit(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
                    placeholder="Write your reply..."
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setDraftEdit("")} className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground">
                      Clear
                    </button>
                    <button onClick={() => sendViaMailto(selected)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-full hover:opacity-90">
                      Open in mail client <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-card rounded-2xl border border-dashed border-border/50 p-12 text-center sticky top-4">
                <MailOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select an email to view the message and draft a reply.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default InboxPanel;
