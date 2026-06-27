// Inline Gmail composer for use inside submission drawers / email threads.
// Sends via the `gmail-action` edge function so messages go out from
// info@texascemeterybrokers.com — without opening Gmail in a new tab.
// Pre-fills greeting ("Dear <first name>,") and a signature with the
// currently signed-in admin's name.
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, X, Loader2, SpellCheck, Undo2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminDisplayName } from "@/hooks/useAdminDisplayName";
import { cleanDisplayName } from "@/lib/displayName";

import type { EmailTemplate } from "@/lib/emailTemplates";

interface Props {
  to: string;
  defaultSubject?: string;
  threadId?: string | null;
  inReplyToGmailId?: string | null;
  recipientName?: string | null;
  /** Called after a successful send. */
  onSent?: () => void;
  /** Called when the user dismisses the composer. */
  onCancel?: () => void;
  /** Optional label override for the send button (e.g. "Send reply"). */
  sendLabel?: string;
  /** Optional preset templates to pick from. First one is loaded by default. */
  templates?: EmailTemplate[];
}

const firstName = (name?: string | null): string => {
  const clean = cleanDisplayName(name || "");
  if (!clean) return "there";
  return clean.split(/\s+/)[0];
};

const InlineEmailComposer = ({
  to,
  defaultSubject = "",
  threadId,
  inReplyToGmailId,
  recipientName,
  onSent,
  onCancel,
  sendLabel = "Send",
}: Props) => {
  const { toast } = useToast();
  const adminName = useAdminDisplayName();
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [bodyTouched, setBodyTouched] = useState(false);
  const [checking, setChecking] = useState(false);
  const [preCheckBody, setPreCheckBody] = useState<string | null>(null);


  // Re-template the body whenever the recipient or admin name resolves,
  // until the user has actually edited the textarea.
  const greetLen = useMemo(() => `Dear ${firstName(recipientName)},`.length, [recipientName]);
  const template = useMemo(() => {
    const greet = `Dear ${firstName(recipientName)},`;
    const sig = adminName ? `Best regards,\n${adminName}\nTexas Cemetery Brokers` : `Best regards,\nTexas Cemetery Brokers`;
    return `${greet}\n\n\n\n${sig}`;
  }, [recipientName, adminName]);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!bodyTouched) setBody(template);
  }, [template, bodyTouched]);

  // Autofocus the textarea and place the cursor one line below the greeting
  // so the admin can just start typing the body.
  useEffect(() => {
    if (bodyTouched) return;
    const el = textareaRef.current;
    if (!el) return;
    const pos = greetLen + 2; // after "Dear X,\n\n"
    const id = window.setTimeout(() => {
      el.focus();
      try { el.setSelectionRange(pos, pos); } catch { /* noop */ }
    }, 30);
    return () => window.clearTimeout(id);
  }, [body, greetLen, bodyTouched]);

  useEffect(() => {
    setSubject(defaultSubject);
  }, [defaultSubject]);

  const send = async () => {
    if (!body.trim()) {
      toast({ title: "Message is empty", variant: "destructive" });
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("gmail-action", {
      body: {
        action: "send",
        to,
        subject: subject || "(no subject)",
        body,
        threadId: threadId || undefined,
        inReplyToGmailId: inReplyToGmailId || undefined,
      },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast({
        title: "Send failed",
        description: error?.message || (data as any)?.error || "Unknown error",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Email sent", description: `Sent to ${to}` });
    setBody(template);
    setBodyTouched(false);
    onSent?.();
  };

  const checkGrammar = async () => {
    if (!body.trim() || checking) return;
    setChecking(true);
    const original = body;
    const { data, error } = await supabase.functions.invoke("proofread-email", {
      body: { body, subject },
    });
    setChecking(false);
    if (error || (data as any)?.error) {
      toast({
        title: "Grammar check failed",
        description: error?.message || (data as any)?.error || "Unknown error",
        variant: "destructive",
      });
      return;
    }
    const corrected = (data as any)?.corrected as string;
    const changed = (data as any)?.changed as boolean;
    if (!corrected) return;
    if (!changed) {
      toast({ title: "Looks good", description: "No grammar issues found." });
      return;
    }
    setPreCheckBody(original);
    setBody(corrected);
    setBodyTouched(true);
    toast({ title: "Grammar updated", description: "Click Undo to revert." });
  };

  const undoGrammar = () => {
    if (preCheckBody === null) return;
    setBody(preCheckBody);
    setPreCheckBody(null);
  };


  return (
    <div className="mt-2 rounded-lg border border-primary/30 bg-background p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wide font-bold text-primary">
          {inReplyToGmailId ? "Reply in this thread" : "New email"} · from info@texascemeterybrokers.com
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">To:</span> {to}
      </div>
      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => { setBody(e.target.value); setBodyTouched(true); }}
        rows={9}
        className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background font-sans whitespace-pre-wrap focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="flex items-center justify-end gap-2">
        {preCheckBody !== null && (
          <button
            type="button"
            onClick={undoGrammar}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted"
            title="Revert grammar changes"
          >
            <Undo2 className="w-3 h-3" /> Undo
          </button>
        )}
        <button
          type="button"
          onClick={checkGrammar}
          disabled={checking || !body.trim()}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 disabled:opacity-50"
          title="Proofread with AI"
        >
          {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : <SpellCheck className="w-3 h-3" />}
          {checking ? "Checking…" : "Check grammar"}
        </button>
        <button
          type="button"
          onClick={send}
          disabled={sending || !body.trim()}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          {sending ? "Sending…" : sendLabel}
        </button>
      </div>

    </div>
  );
};

export default InlineEmailComposer;
