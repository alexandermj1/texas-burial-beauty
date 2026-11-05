import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Loader2 } from "lucide-react";
import { buildListingOptionsBlock } from "../../../../supabase/functions/_shared/listingOptionsBlock.ts";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/** Shows the quote email the AI will send, built with the same shared builder (payment buttons are placeholders). */
export default function AiQuotePreview({ submissionId, fields, intro }: { submissionId: string; fields?: Record<string, string>; intro?: string | null }) {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setOpen(true); setLoading(true); setErr(null);
    try {
      const { data: sub, error } = await supabase.from("contact_submissions")
        .select("id,name,email,cemetery,section,property_type,space_numbers,lawn,transfer_fee_amount,plot_description,quote_amount,plot_count")
        .eq("id", submissionId).maybeSingle();
      if (error || !sub) throw new Error(error?.message ?? "Record not found");
      const per = Number(fields?.per_space ?? sub.quote_amount);
      const n = Number(fields?.spaces ?? sub.plot_count);
      const fee = Number(sub.transfer_fee_amount ?? 0);
      if (!(per > 0) || !(n >= 1)) throw new Error("This suggestion has no price per space or space count.");
      const block = await buildListingOptionsBlock({
        seller: { id: sub.id, name: sub.name, email: sub.email, cemetery: sub.cemetery, section: sub.section, property_type: sub.property_type, spaces: String(n), space_numbers: sub.space_numbers, lawn: sub.lawn, transfer_fee_amount: fee } as never,
        netPerPlot: per, plotCount: n, transferFee: fee, environment: "live",
        plotDescription: (fields?.plot_description || sub.plot_description || null) as string | null,
        createLink: async () => ({ url: "#preview" }),
      });
      const first = (sub.name ?? "").trim().split(/\s+/)[0] || "there";
      const P = "margin:0 0 14px;font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#1f2a37";
      setSubject(`Your Property Valuation is Complete - Listing Offer${sub.cemetery ? ` for ${sub.cemetery}` : ""}`);
      setHtml(`<div style="padding:20px;background:#fff"><p style="${P}">Dear ${esc(first)},</p>${intro?.trim() ? `<p style="${P}">${esc(intro.trim()).replace(/\n/g, "<br>")}</p>` : ""}${block}</div>`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  };

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={load}><Eye className="h-4 w-4 mr-1.5" />See quote email</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Quote email preview</DialogTitle></DialogHeader>
          {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Building the quote…</div>}
          {err && <p className="text-sm text-destructive">{err}</p>}
          {html && !loading && (
            <div className="space-y-2">
              <p className="text-sm"><span className="text-muted-foreground">Subject:</span> {subject}</p>
              <iframe title="Quote email preview" srcDoc={html} className="w-full h-[65vh] rounded-md border bg-background" />
              <p className="text-xs text-muted-foreground">The listing-option buttons get their live payment links when the quote is sent.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
