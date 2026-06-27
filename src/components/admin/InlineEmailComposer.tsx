// Inline Gmail composer for use inside submission drawers / email threads.
// Sends via the `gmail-action` edge function so messages go out from
// info@texascemeterybrokers.com — without opening Gmail in a new tab.
// Pre-fills greeting ("Dear <first name>,") and a signature with the
// currently signed-in admin's name. Supports rich-text formatting
// (bold, italic, underline, bulleted/numbered lists, links) — sent as
// multipart/alternative so recipients see formatting in Gmail.
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, X, Loader2, SpellCheck, Undo2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminDisplayName } from "@/hooks/useAdminDisplayName";
import { cleanDisplayName } from "@/lib/displayName";
import RichTextEditor, { type RichTextEditorHandle } from "./RichTextEditor";

import type { EmailTemplate } from "@/lib/emailTemplates";

interface Props {
  to: string;
  defaultSubject?: string;
  threadId?: string | null;
  inReplyToGmailId?: string | null;
  recipientName?: string | null;
  /** Called after a successful send. Receives the active template id (if any). */
  onSent?: (meta?: { templateId?: string | null }) => void;
  /** Called when the user dismisses the composer. */
  onCancel?: () => void;
  /** Optional label override for the send button (e.g. "Send reply"). */
  sendLabel?: string;
  /** Optional preset templates to pick from. First one is loaded by default. */
  templates?: EmailTemplate[];
}

import { properFirstName } from "@/lib/properCase";

const firstName = (name?: string | null): string => {
  const clean = cleanDisplayName(name || "");
  const cased = properFirstName(clean);
  return cased || "there";
};


const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Convert plain text (templates) into safe HTML preserving paragraph + line breaks.
const textToHtml = (text: string): string => {
  if (!text) return "";
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
};

// Convert composer HTML to a readable plain-text fallback (text/plain MIME part).
const htmlToText = (html: string): string => {
  if (!html) return "";
  if (typeof window === "undefined") return html;
  const wrap = document.createElement("div");
  wrap.innerHTML = html;
  // Lists → "• " / "1. " prefixes
  wrap.querySelectorAll("ul > li").forEach((li) => {
    li.textContent = `• ${li.textContent ?? ""}`;
  });
  wrap.querySelectorAll("ol").forEach((ol) => {
    Array.from(ol.children).forEach((li, idx) => {
      li.textContent = `${idx + 1}. ${li.textContent ?? ""}`;
    });
  });
  // Block-level → newlines
  wrap.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  wrap.querySelectorAll("p, div, li, h1, h2, h3").forEach((el) => {
    el.append("\n");
  });
  const text = (wrap.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
  return text;
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
  templates,
}: Props) => {
  const { toast } = useToast();
  const adminName = useAdminDisplayName();
  const [subject, setSubject] = useState(defaultSubject);
  const [html, setHtml] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [bodyTouched, setBodyTouched] = useState(false);
  const [checking, setChecking] = useState(false);
  const [preCheckHtml, setPreCheckHtml] = useState<string | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(
    templates && templates.length ? templates[0].id : null,
  );

  const editorRef = useRef<RichTextEditorHandle | null>(null);

  const templateText = useMemo(() => {
    if (templates && templates.length) {
      const t = templates.find((x) => x.id === activeTemplateId) || templates[0];
      return t.body;
    }
    const greet = `Dear ${firstName(recipientName)},`;
    const nameBlock = adminName ? `${adminName}\nCemetery Salesperson\n` : "";
    const sig = `Best regards,\n\n${nameBlock}Texas Cemetery Brokers\nwww.texascemeterybrokers.com`;

    return `${greet}\n\n\n\n${sig}`;
  }, [recipientName, adminName, templates, activeTemplateId]);

  const templateHtml = useMemo(() => textToHtml(templateText), [templateText]);

  // Seed the editor on mount and whenever the template changes — but only
  // until the user starts editing.
  useEffect(() => {
    if (bodyTouched) return;
    setHtml(templateHtml);
    editorRef.current?.setHtml(templateHtml);
  }, [templateHtml, bodyTouched]);

  useEffect(() => {
    setSubject(defaultSubject);
  }, [defaultSubject]);

  const applyTemplate = (id: string) => {
    const t = templates?.find((x) => x.id === id);
    if (!t) return;
    setActiveTemplateId(id);
    const next = textToHtml(t.body);
    setHtml(next);
    editorRef.current?.setHtml(next);
    setBodyTouched(false);
  };

  const send = async () => {
    const plain = htmlToText(html);
    if (!plain.trim()) {
      toast({ title: "Message is empty", variant: "destructive" });
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("gmail-action", {
      body: {
        action: "send",
        to,
        subject: subject || "(no subject)",
        body: plain,
        htmlBody: html,
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
    setHtml(templateHtml);
    editorRef.current?.setHtml(templateHtml);
    setBodyTouched(false);
    onSent?.({ templateId: activeTemplateId });
  };

  const checkGrammar = async () => {
    const plain = htmlToText(html);
    if (!plain.trim() || checking) return;
    setChecking(true);
    const originalHtml = html;
    const { data, error } = await supabase.functions.invoke("proofread-email", {
      body: { body: plain, subject },
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
    setPreCheckHtml(originalHtml);
    const correctedHtml = textToHtml(corrected);
    setHtml(correctedHtml);
    editorRef.current?.setHtml(correctedHtml);
    setBodyTouched(true);
    toast({ title: "Grammar updated", description: "Formatting was reflowed. Click Undo to revert." });
  };

  const undoGrammar = () => {
    if (preCheckHtml === null) return;
    setHtml(preCheckHtml);
    editorRef.current?.setHtml(preCheckHtml);
    setPreCheckHtml(null);
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
      {templates && templates.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">Template:</span>
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyTemplate(t.id)}
              className={`text-[10px] font-medium px-2 py-1 rounded-full border transition-colors ${
                activeTemplateId === t.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted"
              }`}
              title={`Load: ${t.label}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <RichTextEditor
        ref={editorRef}
        initialHtml={html}
        onChange={(next) => {
          setHtml(next);
          setBodyTouched(true);
        }}
        placeholder="Write your message…"
        minHeight={200}
      />
      <div className="flex items-center justify-end gap-2">
        {preCheckHtml !== null && (
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
          disabled={checking || !htmlToText(html).trim()}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 disabled:opacity-50"
          title="Proofread with AI"
        >
          {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : <SpellCheck className="w-3 h-3" />}
          {checking ? "Checking…" : "Check grammar"}
        </button>
        <button
          type="button"
          onClick={send}
          disabled={sending || !htmlToText(html).trim()}
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
