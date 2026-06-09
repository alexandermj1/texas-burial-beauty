// TexasPipelinePanel — 6-stage Texas Cemetery Brokers seller workflow.
// Stages: New → Intake Sent → Details Received → Quoted → Listed → Closed
import { motion } from "framer-motion";
import { Inbox, Mail, FileText, FileSignature, Globe, CheckCircle, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Submission } from "./SubmissionsPanel";
import { useState } from "react";
import TexasIntakeDialog from "./TexasIntakeDialog";
import TexasQuoteDialog from "./TexasQuoteDialog";

export type TexasStage =
  | "new"
  | "intake_sent"
  | "details_received"
  | "quoted"
  | "listed"
  | "closed";

export const TEXAS_STAGE_ORDER: TexasStage[] = [
  "new", "intake_sent", "details_received", "quoted", "listed", "closed",
];

export const TEXAS_STAGE_META: Record<TexasStage, { label: string; short: string; cls: string; dot: string; Icon: any }> = {
  new:              { label: "1. New inquiry",       short: "New",      cls: "bg-primary/10 text-primary border-primary/25",             Icon: Inbox,         dot: "bg-primary" },
  intake_sent:      { label: "2. Intake email sent", short: "Intake sent", cls: "bg-amber-500/10 text-amber-700 border-amber-500/25",     Icon: Mail,          dot: "bg-amber-500" },
  details_received: { label: "3. Details received",  short: "Details in", cls: "bg-sky-500/10 text-sky-700 border-sky-500/25",            Icon: FileText,      dot: "bg-sky-500" },
  quoted:           { label: "4. Quote sent",        short: "Quoted",   cls: "bg-amber-500/10 text-amber-700 border-amber-500/25",       Icon: FileSignature, dot: "bg-amber-500" },
  listed:           { label: "5. Listed",            short: "Listed",   cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25", Icon: Globe,         dot: "bg-emerald-500" },
  closed:           { label: "6. Closed",            short: "Closed",   cls: "bg-emerald-600/15 text-emerald-700 border-emerald-600/30", Icon: CheckCircle,   dot: "bg-emerald-600" },
};

export const deriveTexasStage = (s: Submission): TexasStage => {
  const x = s as any;
  if (x.texas_pipeline_stage) return x.texas_pipeline_stage as TexasStage;
  if (x.closed_at) return "closed";
  if (x.listing_live_at || x.listing_number) return "listed";
  if (s.quote_sent_at) return "quoted";
  if (x.texas_details_received_at || x.deed_owner_names || x.purchase_info) return "details_received";
  if (x.texas_intake_sent_at) return "intake_sent";
  return "new";
};

interface Props {
  submission: Submission;
  onPatch: (patch: Partial<Submission>) => Promise<void>;
}

const TexasPipelinePanel = ({ submission, onPatch }: Props) => {
  const stage = deriveTexasStage(submission);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);

  const setStage = async (next: TexasStage) => {
    const patch: any = { texas_pipeline_stage: next };
    if (next === "intake_sent" && !(submission as any).texas_intake_sent_at) {
      patch.texas_intake_sent_at = new Date().toISOString();
    }
    if (next === "details_received" && !(submission as any).texas_details_received_at) {
      patch.texas_details_received_at = new Date().toISOString();
    }
    if (next === "closed" && !(submission as any).closed_at) {
      patch.closed_at = new Date().toISOString();
    }
    await onPatch(patch);
    toast({ title: "Stage updated", description: TEXAS_STAGE_META[next].label });
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="text-sm font-semibold text-foreground">Texas pipeline</h4>
          <div className="flex items-center gap-1.5">
            {stage === "new" && (
              <button
                onClick={() => setIntakeOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <Mail className="w-3.5 h-3.5" /> Compose intake email
              </button>
            )}
            {stage === "intake_sent" && (
              <button
                onClick={() => setStage("details_received")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-sky-600 text-white hover:opacity-90 transition-opacity"
              >
                <FileText className="w-3.5 h-3.5" /> Mark details received
              </button>
            )}
            {stage === "details_received" && (
              <button
                onClick={() => setQuoteOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                <DollarSign className="w-3.5 h-3.5" /> Generate quote email
              </button>
            )}
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {TEXAS_STAGE_ORDER.map((st, idx) => {
            const m = TEXAS_STAGE_META[st];
            const reached = TEXAS_STAGE_ORDER.indexOf(stage) >= idx;
            const isActive = stage === st;
            return (
              <button
                key={st}
                onClick={() => setStage(st)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  isActive ? m.cls + " ring-2 ring-offset-1 ring-offset-card ring-current/20" : reached ? m.cls : "bg-muted text-muted-foreground border-border"
                }`}
                title={`Set to ${m.label}`}
              >
                <m.Icon className="w-3 h-3" />
                {m.short}
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Current: <span className="font-medium text-foreground">{TEXAS_STAGE_META[stage].label}</span>
          {(submission as any).texas_intake_sent_at && stage !== "new" && (
            <> · intake sent {new Date((submission as any).texas_intake_sent_at).toLocaleDateString()}</>
          )}
        </p>
      </div>

      <TexasIntakeDialog
        open={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        submission={submission}
        onSent={async () => {
          await setStage("intake_sent");
          setIntakeOpen(false);
        }}
      />
    </>
  );
};

export default TexasPipelinePanel;
