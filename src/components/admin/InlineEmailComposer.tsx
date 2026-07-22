// Inline Gmail composer for use inside submission drawers / email threads.
// Sends via the `gmail-action` edge function so messages go out from
// info@texascemeterybrokers.com — without opening Gmail in a new tab.
// Pre-fills greeting ("Dear <first name>,") and a signature with the
// currently signed-in admin's name. Supports rich-text formatting
// (bold, italic, underline, bulleted/numbered lists, links) — sent as
// multipart/alternative so recipients see formatting in Gmail.
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, X, Loader2, SpellCheck, Undo2, LayoutGrid, Maximize2, Minimize2, CreditCard } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminDisplayName } from "@/hooks/useAdminDisplayName";
import { cleanDisplayName } from "@/lib/displayName";
import RichTextEditor, { type RichTextEditorHandle } from "./RichTextEditor";
import SendBuyerPlotCardsDialog from "./SendBuyerPlotCardsDialog";
import ListingOptionsInlinePanel from "./ListingOptionsInlinePanel";
import AttachPaymentButtonDialog from "./AttachPaymentButtonDialog";

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
  /** Enables the "Attach payment button" action when set. */
  submissionId?: string | null;
  /** When provided, shows an "Attach plot cards" button (Texas buyer flow only). */
  buyerContext?: {
    id: string;
    name: string | null;
    email: string | null;
    cemetery: string | null;
    property_type?: string | null;
  } | null;
  /** When provided AND the "seller_listing_options" template is active, shows "Attach listing options". */
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
// Each non-empty block of text becomes one <p>; consecutive blank lines become
// empty <p><br></p> rows so the editor preserves room to type between the
// greeting and signature without inflating the gap between regular paragraphs.
// Every paragraph gets the same inline branded typography as the
// listing-options intro (Georgia 15px, slate #1f2937, 14px bottom margin).
// This keeps the greeting, closing, signature, and any user-typed lines
// visually consistent with the injected quote block across all email
// clients (Gmail, Outlook, Apple Mail) — none of which reliably inherit
// wrapper CSS into nested <p> tags.
const P_STYLE =
  "font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#1f2937;margin:0 0 14px;";
const textToHtml = (text: string): string => {
  if (!text) return "";
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let blankCount = 0;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p style="${P_STYLE}">${escapeHtml(paragraph.join("\n")).replace(/\n/g, "<br>")}</p>`);
    paragraph = [];
  };

  lines.forEach((line) => {
    if (line.trim() === "") {
      flushParagraph();
      blankCount += 1;
      return;
    }
    if (blankCount > 1) {
      for (let i = 1; i < blankCount; i += 1) html.push(`<p style="${P_STYLE}"><br></p>`);
    }
    blankCount = 0;
    paragraph.push(line);
  });
  flushParagraph();
  if (blankCount > 1) {
    for (let i = 1; i < blankCount; i += 1) html.push(`<p style="${P_STYLE}"><br></p>`);
  }
  return html.join("");
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
  const text = (wrap.textContent ?? "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{7,}/g, "\n\n\n\n\n\n")
    .trim();
  return text;
};

const mergeInlineStyle = (el: HTMLElement, style: string) => {
  const current = el.getAttribute("style") || "";
  el.setAttribute("style", `${style}${current ? ` ${current}` : ""}`);
};

const isBlankBlock = (el: HTMLElement) => {
  if (el.querySelector("img,table,hr,ul,ol,blockquote")) return false;
  const withoutBreaks = el.innerHTML
    .replace(/&nbsp;/gi, " ")
    .replace(/<br\s*\/?>/gi, "")
    .trim();
  return withoutBreaks === "" && (el.textContent || "").replace(/\u00a0/g, " ").trim() === "";
};

const preserveTypedWhitespace = (root: HTMLElement) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;
    if (!parent || parent.closest("table,style,script,pre,[data-listing-options='1']")) continue;
    if (/[\n\r]| {2,}/.test(node.nodeValue || "")) nodes.push(node);
  }

  nodes.forEach((node) => {
    const value = (node.nodeValue || "").replace(/\r\n?/g, "\n");
    const frag = document.createDocumentFragment();
    value.split("\n").forEach((part, idx) => {
      if (idx > 0) frag.appendChild(document.createElement("br"));
      frag.appendChild(document.createTextNode(part.replace(/ {2,}/g, (m) => ` ${"\u00a0".repeat(m.length - 1)}`)));
    });
    node.replaceWith(frag);
  });
};

// The editor preview gets spacing from CSS classes, but sent emails need inline
// styles. Normalize user-created blocks so blank lines and multiple spaces make
// it all the way to Gmail/Outlook instead of being collapsed by the email client.
const normalizeComposerHtmlForEmail = (rawHtml: string): string => {
  if (!rawHtml || typeof document === "undefined") return rawHtml;
  const root = document.createElement("div");
  root.innerHTML = rawHtml;

  root.querySelectorAll("p, div").forEach((node) => {
    const el = node as HTMLElement;
    if (el.closest("table,[data-listing-options='1']")) return;
    if (isBlankBlock(el)) {
      el.innerHTML = "&nbsp;";
      el.setAttribute(
        "style",
        "font-family:Georgia,serif;font-size:15px;line-height:14px;color:#1f2937;margin:0 0 14px;height:14px;",
      );
      return;
    }
    mergeInlineStyle(el, P_STYLE);
  });

  root.querySelectorAll("ul, ol").forEach((node) => {
    const el = node as HTMLElement;
    if (el.closest("table,[data-listing-options='1']")) return;
    mergeInlineStyle(el, "font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#1f2937;margin:0 0 14px;padding-left:22px;");
  });

  root.querySelectorAll("li").forEach((node) => {
    const el = node as HTMLElement;
    if (el.closest("table,[data-listing-options='1']")) return;
    mergeInlineStyle(el, "font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#1f2937;margin:0 0 6px;");
  });

  preserveTypedWhitespace(root);
  return root.innerHTML;
};

// Vogue-style branded shell wrapped around every outgoing email so replies from
// the submissions panel match the aesthetic of the plot-card emails: editorial
// masthead at the top, hairline divider, and an italic footer line.
const LOGO_URL = "https://www.texascemeterybrokers.com/__l5e/assets-v1/ba491ce8-b20f-42a1-a37e-059bb277ea85/hibiscus-coral.png";

const wrapInBrandedShell = (innerHtml: string): string => {
  if (!innerHtml || !innerHtml.trim()) return innerHtml;
  if (/data-tcb-shell="1"/.test(innerHtml)) return innerHtml; // never double-wrap
  return `
<div data-tcb-shell="1" style="font-family:Georgia,serif;width:100%;max-width:100%;margin:0;color:#1f2937;padding:24px 40px;background:#ffffff;box-sizing:border-box;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 18px;border-collapse:collapse;">
    <tr>
      <td style="text-align:center;padding:6px 0 14px;border-bottom:1px solid #e7e2d8;">
        <img src="${LOGO_URL}" alt="Texas Cemetery Brokers" width="44" height="44" style="display:inline-block;width:44px;height:44px;object-fit:contain;margin-bottom:8px;" />
        <p style="font-family:Georgia,serif;font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:#7c3a2e;margin:0;font-weight:600;">Texas Cemetery Brokers</p>
        <p style="font-family:Georgia,serif;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#9a8f7a;margin:4px 0 0;font-style:italic;">Serving all of Texas</p>
      </td>
    </tr>
  </table>
  <div style="font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#1f2937;">${innerHtml}</div>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:22px 0 0;border-collapse:collapse;">
    <tr>
      <td style="text-align:center;padding:14px 0 4px;border-top:1px solid #e7e2d8;">
        <p style="font-family:Georgia,serif;font-size:11px;color:#9a8f7a;margin:0;font-style:italic;letter-spacing:.04em;">texascemeterybrokers.com &middot; info@texascemeterybrokers.com</p>
      </td>
    </tr>
  </table>
</div>`.trim();
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
  submissionId,
  buyerContext,
  sellerContext,
}: Props) => {
  const { toast } = useToast();
  const adminName = useAdminDisplayName();
  const [subject, setSubject] = useState(defaultSubject);
  const [html, setHtml] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [bodyTouched, setBodyTouched] = useState(false);
  const [checking, setChecking] = useState(false);
  const [preCheckHtml, setPreCheckHtml] = useState<string | null>(null);
  const [plotPickerOpen, setPlotPickerOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [listingBlockInserted, setListingBlockInserted] = useState(false);
  // For replies, start with the plain greeting+signature so we don't
  // clobber the user's reply with a full template. Templates can still be
  // chosen from the picker below.
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(
    inReplyToGmailId ? null : (templates && templates.length ? templates[0].id : null),
  );

  const editorRef = useRef<RichTextEditorHandle | null>(null);

  const templateText = useMemo(() => {
    if (activeTemplateId && templates && templates.length) {
      const t = templates.find((x) => x.id === activeTemplateId);
      if (t) return t.body;
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

  const quoteSubjectFor = (cemetery?: string | null) => {
    const c = (cemetery || "").trim();
    return c
      ? `Your Property Valuation is Complete - Listing Offer for ${c}`
      : `Your Property Valuation is Complete - Listing Offer`;
  };

  const applyTemplate = (id: string) => {
    if (id === "__blank__") {
      setActiveTemplateId(null);
      setBodyTouched(false);
      setListingBlockInserted(false);
      return;
    }
    const t = templates?.find((x) => x.id === id);
    if (!t) return;
    setActiveTemplateId(id);
    const next = textToHtml(t.body);
    setHtml(next);
    editorRef.current?.setHtml(next);
    setBodyTouched(false);
    setListingBlockInserted(false);
    if (id === "seller_listing_options") {
      setSubject(quoteSubjectFor(sellerContext?.cemetery));
    }
  };

  const send = async () => {
    const plain = htmlToText(html);
    if (!plain.trim()) {
      toast({ title: "Message is empty", variant: "destructive" });
      return;
    }
    setSending(true);
    const normalizedHtml = normalizeComposerHtmlForEmail(html);
    // Quote emails (listing-options block already includes brand header/footer)
    // ship without the extra masthead shell to avoid double branding.
    const hasListingBlock = /data-listing-options="1"/.test(normalizedHtml);
    const brandedHtml = hasListingBlock ? normalizedHtml : wrapInBrandedShell(normalizedHtml);
    const { data, error } = await supabase.functions.invoke("gmail-action", {
      body: {
        action: "send",
        to,
        subject: subject || "(no subject)",
        body: plain,
        htmlBody: brandedHtml,
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
    toast({
      title: "Email sent",
      description: (data as any)?.fallbackUsed
        ? `Sent to ${to} using the backup mailbox while info@ recovers.`
        : `Sent to ${to}`,
    });
    // If a listing-options quote block was inserted OR the seller_listing_options
    // template was used, stamp the submission's quote_sent_at so it moves to the
    // "Quoted" pipeline stage / gets the quoted tag.
    try {
      const isQuoteSend =
        (listingBlockInserted || activeTemplateId === "seller_listing_options") &&
        sellerContext?.id;
      if (isQuoteSend) {
        await supabase
          .from("contact_submissions")
          .update({ quote_sent_at: new Date().toISOString() })
          .eq("id", sellerContext!.id);
      }
    } catch (e) {
      console.warn("quote_sent_at update failed", e);
    }
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

  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={
        expanded
          ? "fixed inset-4 z-50 rounded-xl border border-primary/30 bg-background p-5 shadow-2xl flex flex-col gap-3 overflow-hidden"
          : "mt-2 rounded-lg border border-primary/30 bg-background p-3 space-y-2"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wide font-bold text-primary">
          {inReplyToGmailId ? "Reply in this thread" : "New email"} · from info@texascemeterybrokers.com
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="hidden lg:inline-flex text-muted-foreground hover:text-foreground"
            title={expanded ? "Exit full screen" : "Expand to full screen"}
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
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
      </div>
      <div className="text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">To:</span> {to}
      </div>
      {templates && templates.length >= 1 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">Template:</span>
          <button
            type="button"
            onClick={() => applyTemplate("__blank__")}
            className={`text-[10px] font-medium px-2 py-1 rounded-full border transition-colors ${
              activeTemplateId === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground border-border hover:bg-muted"
            }`}
            title="Blank (greeting + signature only)"
          >
            Blank
          </button>
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
      {sellerContext && activeTemplateId === "seller_listing_options" && (
        <ListingOptionsInlinePanel
          seller={sellerContext}
          hasGenerated={listingBlockInserted}
          onGenerated={(blockHtml) => {
            // Remove any previously inserted block so regeneration replaces
            // rather than duplicates.
            const current = editorRef.current?.getHtml() ?? html;
            const stripped = current.replace(
              /<div data-listing-options="1"[\s\S]*?<\/div>\s*(<p><br><\/p>)?/g,
              "",
            );
            editorRef.current?.setHtml(stripped);
            editorRef.current?.insertHtmlBeforeSignature(blockHtml);
            const next = editorRef.current?.getHtml() ?? blockHtml;
            setHtml(next);
            setBodyTouched(true);
            setListingBlockInserted(true);
            setSubject(quoteSubjectFor(sellerContext?.cemetery));
          }}
        />
      )}
      <div className={expanded ? "flex-1 min-h-0 overflow-auto" : ""}>
        <RichTextEditor
          ref={editorRef}
          initialHtml={html}
          onChange={(next) => {
            setHtml(next);
            setBodyTouched(true);
          }}
          placeholder="Write your message…"
          minHeight={expanded ? 520 : 200}
        />
      </div>
      <div className="flex items-center justify-end gap-2 flex-wrap">
        {buyerContext && (
          <button
            type="button"
            onClick={() => setPlotPickerOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-[hsl(var(--accent-gold-fg))]/40 text-[hsl(var(--accent-gold-fg))] bg-[hsl(var(--accent-gold-bg))]/60 hover:bg-[hsl(var(--accent-gold-bg))]"
            title="Pick Texas plots and insert branded cards into this email"
          >
            <LayoutGrid className="w-3 h-3" />
            Attach plot cards
          </button>
        )}
        {submissionId && (
          <button
            type="button"
            onClick={() => setPaymentDialogOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-emerald-600/40 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30"
            title="Attach a Stripe payment button for any amount"
          >
            <CreditCard className="w-3 h-3" />
            Attach payment
          </button>
        )}
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
      {buyerContext && (
        <SendBuyerPlotCardsDialog
          open={plotPickerOpen}
          onClose={() => setPlotPickerOpen(false)}
          buyer={buyerContext}
          adminName={adminName}
          mode="attach"
          onAttach={(cardsHtml) => {
            editorRef.current?.insertHtmlBeforeSignature(cardsHtml);
            setHtml(editorRef.current?.getHtml() ?? html);
            setBodyTouched(true);
          }}
        />
      )}
      {submissionId && (
        <AttachPaymentButtonDialog
          open={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
          submissionId={submissionId}
          recipientEmail={to}
          recipientName={recipientName}
          onAttach={(buttonHtml) => {
            editorRef.current?.insertHtmlBeforeSignature(buttonHtml);
            setHtml(editorRef.current?.getHtml() ?? html);
            setBodyTouched(true);
          }}
        />
      )}
    </div>
  );
};

export default InlineEmailComposer;
