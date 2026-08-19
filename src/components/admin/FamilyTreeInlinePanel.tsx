// Inline "Family tree / confirm the deed" generator for the email composer.
// Lets the admin edit the copy, preview the exact block, and insert it into the
// reply. The seller lands on the same secure /confirm page the standalone
// ownership-questions email uses, so all the existing infrastructure (answers,
// roster, reminders, tagging) keeps working.
import { useEffect, useMemo, useState } from "react";
import { Loader2, Eye, Network, CheckCircle2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { properCase, properFirstName } from "@/lib/properCase";
import { cleanDisplayName } from "@/lib/displayName";
import {
  buildFamilyTreeBlock,
  defaultFamilyTreeHelpNote,
  defaultFamilyTreeParagraphs,
  familyTreeLink,
} from "@/lib/buildFamilyTreeBlock";

interface Props {
  seller: { id: string; name: string | null; cemetery: string | null };
  hasGenerated: boolean;
  onGenerated: (blockHtml: string) => void;
}

const FamilyTreeInlinePanel = ({ seller, hasGenerated, onGenerated }: Props) => {
  const cemetery = useMemo(() => properCase(seller.cemetery || ""), [seller.cemetery]);
  const firstName = useMemo(
    () => properFirstName(cleanDisplayName(seller.name || "")) || "there",
    [seller.name],
  );

  const [paragraphs, setParagraphs] = useState<string>(
    defaultFamilyTreeParagraphs(firstName, cemetery).join("\n\n"),
  );
  const [ctaLabel, setCtaLabel] = useState("Confirm your details →");
  const [helpNote, setHelpNote] = useState(defaultFamilyTreeHelpNote);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [doneAt, setDoneAt] = useState<string | null>(null);

  useEffect(() => {
    setParagraphs(defaultFamilyTreeParagraphs(firstName, cemetery).join("\n\n"));
  }, [firstName, cemetery]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("contact_submissions")
        .select("ownership_answers")
        .eq("id", seller.id)
        .maybeSingle();
      if (!active) return;
      const a = (data?.ownership_answers ?? {}) as Record<string, unknown>;
      setSentAt(typeof a.questionsSentAt === "string" ? a.questionsSentAt : null);
      setDoneAt(typeof a.sellerConfirmedAt === "string" ? a.sellerConfirmedAt : null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [seller.id, hasGenerated]);

  const blockHtml = useMemo(
    () =>
      buildFamilyTreeBlock({
        submissionId: seller.id,
        firstName,
        cemetery,
        paragraphs: paragraphs.split(/\n{2,}/),
        ctaLabel,
        helpNote,
      }),
    [seller.id, firstName, cemetery, paragraphs, ctaLabel, helpNote],
  );

  return (
    <div className="rounded-lg border border-emerald-600/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-bold text-emerald-700 dark:text-emerald-300">
          <Network className="w-3 h-3" />
          Family tree — confirm the deed
        </div>
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        ) : doneAt ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-600 text-white">
            <CheckCircle2 className="w-3 h-3" />
            Completed {new Date(doneAt).toLocaleString()}
          </span>
        ) : sentAt ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-600 text-white">
            <CheckCircle2 className="w-3 h-3" />
            Sent {new Date(sentAt).toLocaleString()}
          </span>
        ) : (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border text-muted-foreground">
            Not sent yet
          </span>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Message (blank line = new paragraph)</label>
        <textarea
          value={paragraphs}
          onChange={(e) => setParagraphs(e.target.value)}
          rows={7}
          className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Button label</label>
          <input
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">Reassurance note (blank to hide)</label>
          <input
            value={helpNote}
            onChange={(e) => setHelpNote(e.target.value)}
            className="w-full text-xs px-2 py-1.5 rounded border border-border bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground break-all">
        Secure link: {familyTreeLink(seller.id)}
      </p>

      {showPreview && (
        <div className="rounded border border-border bg-white max-h-[340px] overflow-auto">
          <iframe
            title="Family tree email preview"
            srcDoc={blockHtml}
            className="w-full h-[600px] border-0"
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full border border-border bg-background hover:bg-muted"
        >
          <Eye className="w-3 h-3" />
          {showPreview ? "Hide preview" : "Preview"}
        </button>
        <button
          type="button"
          onClick={() => onGenerated(blockHtml)}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Network className="w-3 h-3" />
          {hasGenerated ? "Regenerate into email" : "Insert into email"}
        </button>
      </div>
    </div>
  );
};

export default FamilyTreeInlinePanel;
