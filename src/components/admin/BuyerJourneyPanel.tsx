// BuyerJourneyPanel — lightweight CRM view for buyer leads.
// Buyers don't follow a linear quote/paperwork pipeline like sellers. Instead,
// this shows: incoming context, recommended plots we've sent, and activity notes.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, ExternalLink, Trash2, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { Submission } from "./SubmissionsPanel";

interface Recommendation {
  id: string;
  submission_id: string;
  listing_id: string;
  sent_at: string;
  sent_by_name: string | null;
  cemetery: string | null;
  plot_type: string | null;
  asking_price: number | null;
  notes: string | null;
  buyer_response: string | null;
  responded_at: string | null;
}

const formatMoney = (v: number | null) =>
  v == null ? "Price on request" : `$${Number(v).toLocaleString()}`;

const BuyerJourneyPanel = ({ submission, onOpenSend }: { submission: Submission; onOpenSend: () => void }) => {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("buyer_recommendations" as any)
      .select("*")
      .eq("submission_id", submission.id)
      .order("sent_at", { ascending: false });
    if (data) setRecs(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecs();
    // refresh when the dialog closes (best-effort) by listening for visibility
    const h = () => fetchRecs();
    window.addEventListener("buyer-rec-saved", h);
    return () => window.removeEventListener("buyer-rec-saved", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission.id]);

  const setResponse = async (id: string, resp: "interested" | "not_interested") => {
    const { error } = await supabase
      .from("buyer_recommendations" as any)
      .update({ buyer_response: resp, responded_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else fetchRecs();
  };

  const removeRec = async (id: string) => {
    const { error } = await supabase.from("buyer_recommendations" as any).delete().eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else fetchRecs();
  };

  return (
    <div className="space-y-5">
      <section className="bg-muted/30 rounded-xl border border-border/50 p-4">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-medium text-foreground">
              Recommended plots <span className="text-muted-foreground font-normal">({recs.length})</span>
            </h4>
          </div>
          <button
            onClick={onOpenSend}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-[11px] font-medium rounded-full hover:opacity-90"
          >
            <Send className="w-3 h-3" /> Send plots
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : recs.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No plots recommended yet. Click "Send plots" to email this buyer matching inventory.
          </p>
        ) : (
          <ul className="space-y-2">
            {recs.map((r) => (
              <motion.li
                key={r.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-lg border border-border/50 px-3 py-2.5 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{r.cemetery || "Listing"}</p>
                    <p className="text-muted-foreground mt-0.5">
                      {r.plot_type || "—"} · {formatMoney(r.asking_price)}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 mt-1">
                      Sent {formatDistanceToNow(new Date(r.sent_at), { addSuffix: true })}
                      {r.sent_by_name ? ` · by ${r.sent_by_name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={`/properties?listing=${r.listing_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-muted-foreground hover:text-foreground"
                      title="View listing"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => removeRec(r.id)}
                      className="p-1.5 text-muted-foreground/60 hover:text-destructive"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Buyer:</span>
                  <button
                    onClick={() => setResponse(r.id, "interested")}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                      r.buyer_response === "interested"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-card text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    <ThumbsUp className="w-2.5 h-2.5" /> Interested
                  </button>
                  <button
                    onClick={() => setResponse(r.id, "not_interested")}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                      r.buyer_response === "not_interested"
                        ? "bg-rose-600 text-white border-rose-600"
                        : "bg-card text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    <ThumbsDown className="w-2.5 h-2.5" /> Pass
                  </button>
                  {r.responded_at && (
                    <span className="text-[10px] text-muted-foreground">
                      · {formatDistanceToNow(new Date(r.responded_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/20 border border-border/40 rounded-lg p-3">
        <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <p>
          Buyer leads are tracked through notes and recommendations rather than a fixed pipeline.
          Use the internal notes field above to log calls, follow-ups and decisions.
        </p>
      </div>
    </div>
  );
};

export default BuyerJourneyPanel;
