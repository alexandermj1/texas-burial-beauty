import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, Mail, StickyNote, UserRound, FileSignature, Link2, Users, DollarSign, FileText, PencilLine } from "lucide-react";

export type AiAction = {
  id: string; submission_id: string; action_type: string; status: string; reason: string | null;
  confidence: number | null; email_to: string | null; email_subject: string | null; email_body: string | null;
  note_body: string | null; created_at: string; decided_by_name: string | null; error: string | null;
  payload?: { fields?: Record<string, string> } | null;
};

export const AI_TYPE_META: Record<string, { label: string; Icon: typeof Mail; approve: string }> = {
  reply_email: { label: "Reply email", Icon: Mail, approve: "Approve & send" },
  add_note: { label: "Internal note", Icon: StickyNote, approve: "Add note" },
  flag_human: { label: "Needs a person", Icon: UserRound, approve: "I'll handle it" },
  update_fields: { label: "Update record", Icon: PencilLine, approve: "Apply update" },
  send_listing_agreement: { label: "Send listing agreement", Icon: FileSignature, approve: "Send agreement" },
  resend_signing_link: { label: "Resend signing link", Icon: Link2, approve: "Resend link" },
  send_family_tree: { label: "Send family tree", Icon: Users, approve: "Send family tree" },
  open_quote_dialog: { label: "Send quote", Icon: DollarSign, approve: "Open quote dialog" },
  open_document_request: { label: "Document request", Icon: FileText, approve: "Open document request" },
};

export async function callSellerAgent(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("seller-agent", { body });
  if (error) {
    let msg: unknown = error.message;
    try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* keep */ }
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

type Props = {
  action: AiAction;
  sellerName?: string | null;
  sellerSub?: string | null;
  onOpenSubmission?: (id: string) => void;
  /** Called after approval of an "open dialog" action, with which dialog to open. */
  onOpen?: (which: "quote" | "documents", action: AiAction) => void;
  onChanged: () => void;
  compact?: boolean;
};

export default function AiActionCard({ action: a, sellerName, sellerSub, onOpenSubmission, onOpen, onChanged, compact }: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [subject, setSubject] = useState(a.email_subject ?? "");
  const [body, setBody] = useState(a.email_body ?? "");
  const meta = AI_TYPE_META[a.action_type] ?? AI_TYPE_META.add_note;
  const pending = a.status === "proposed";

  const approve = async () => {
    setBusy(true);
    try {
      if (a.action_type === "reply_email" && (body !== a.email_body || subject !== a.email_subject)) {
        await supabase.from("ai_agent_actions" as never).update({ email_body: body, email_subject: subject } as never).eq("id", a.id);
      }
      const r = await callSellerAgent({ action: "execute", action_id: a.id });
      if (r?.open) {
        if (onOpen) onOpen(r.open, a);
        else { onOpenSubmission?.(a.submission_id); toast({ title: "Opening the record", description: r.open === "quote" ? "Use Send quote on the record to review and send." : "Open Family tree & documents to review and send." }); }
      } else toast({ title: "Done", description: meta.label });
      onChanged();
    } catch (e) { toast({ title: "Couldn't complete", description: (e as Error).message, variant: "destructive" }); }
    setBusy(false);
  };
  const reject = async () => {
    setBusy(true);
    try { await callSellerAgent({ action: "reject", action_id: a.id }); onChanged(); }
    catch (e) { toast({ title: "Couldn't reject", description: (e as Error).message, variant: "destructive" }); }
    setBusy(false);
  };

  return (
    <div className={`rounded-xl border border-indigo-500/30 bg-card ${compact ? "p-3" : "p-4 md:p-5"} space-y-2.5`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {sellerName !== undefined && (
            <button onClick={() => onOpenSubmission?.(a.submission_id)} className="font-medium text-foreground hover:text-indigo-600 text-left">{sellerName ?? "Seller"}</button>
          )}
          {sellerSub && <div className="text-xs text-muted-foreground">{sellerSub}</div>}
          <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
            <meta.Icon className="w-3.5 h-3.5" />{meta.label}
            {a.confidence != null && <span className="text-muted-foreground font-normal">· {Math.round(a.confidence * 100)}% sure</span>}
          </div>
        </div>
        {!pending && <span className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{a.status}{a.decided_by_name ? ` · ${a.decided_by_name}` : ""} · {new Date(a.created_at).toLocaleDateString()}</span>}
      </div>
      {a.reason && <p className="text-sm text-muted-foreground">{a.reason}</p>}
      {a.action_type === "reply_email" && (pending ? (
        <div className="space-y-2">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[200px] text-sm leading-relaxed" />
        </div>
      ) : <pre className="whitespace-pre-wrap text-sm text-foreground bg-muted/40 rounded-lg p-3 font-sans">{a.email_body}</pre>)}
      {a.action_type === "update_fields" && a.payload?.fields && (
        <ul className="text-sm bg-muted/40 rounded-lg p-3 space-y-0.5">
          {Object.entries(a.payload.fields).map(([k, v]) => <li key={k}><span className="text-muted-foreground">{k.replace(/_/g, " ")}:</span> {v}</li>)}
        </ul>
      )}
      {a.action_type !== "reply_email" && a.note_body && <p className="text-sm text-foreground bg-muted/40 rounded-lg p-3 whitespace-pre-wrap">{a.note_body}</p>}
      {a.error && <p className="text-sm text-destructive">{a.error}</p>}
      {pending && (
        <div className="flex gap-2">
          <Button size="sm" onClick={approve} disabled={busy} className="bg-indigo-600 hover:bg-indigo-700 text-primary-foreground">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4 mr-1" />{meta.approve}</>}
          </Button>
          <Button size="sm" variant="outline" onClick={reject} disabled={busy}><X className="w-4 h-4 mr-1" />Reject</Button>
        </div>
      )}
    </div>
  );
}
