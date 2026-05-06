// BayerPipelinePanel — the 8-stage Bayer / Texas Cemetery Brokers seller workflow.
// Each stage exposes its own inline checklist + "advance" actions that mutate
// fields on contact_submissions. The derived stage is computed from those fields.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Inbox, FileText, Archive, ThumbsUp, FileSignature, CreditCard,
  ShieldCheck, Mail, Package, Globe, RotateCcw, Plus, X, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { Submission } from "./SubmissionsPanel";

export type BayerStage =
  | "initial_inquiry"
  | "quote_issued"
  | "quote_morgued"
  | "quote_accepted"
  | "la_issued"
  | "la_signed_awaiting_payment"
  | "la_signed_paid"
  | "la_confirmed_poa_issued"
  | "awaiting_notarized_docs"
  | "file_compiled"
  | "listing_live";

export const BAYER_STAGE_ORDER: BayerStage[] = [
  "initial_inquiry",
  "quote_issued",
  "quote_morgued",
  "quote_accepted",
  "la_issued",
  "la_signed_awaiting_payment",
  "la_signed_paid",
  "la_confirmed_poa_issued",
  "awaiting_notarized_docs",
  "file_compiled",
  "listing_live",
];

export const BAYER_STAGE_META: Record<BayerStage, { label: string; short: string; cls: string; dot: string; Icon: any; owner: string }> = {
  initial_inquiry:           { label: "1. Initial inquiry",        short: "Inquiry",      cls: "bg-primary/10 text-primary border-primary/25",                Icon: Inbox,         owner: "Intake",        dot: "bg-primary" },
  quote_issued:              { label: "2. Quote issued",            short: "Quote sent",   cls: "bg-amber-500/10 text-amber-700 border-amber-500/25",          Icon: FileText,      owner: "Cici (CA)",     dot: "bg-amber-500" },
  quote_morgued:             { label: "2b. Morgued (no response)",  short: "Morgued",      cls: "bg-muted text-muted-foreground border-border",                Icon: Archive,       owner: "Auto",          dot: "bg-muted-foreground" },
  quote_accepted:            { label: "3. Quote accepted",          short: "Accepted",     cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",    Icon: ThumbsUp,      owner: "Intake",        dot: "bg-emerald-500" },
  la_issued:                 { label: "4. L.A. issued",             short: "L.A. out",     cls: "bg-sky-500/10 text-sky-700 border-sky-500/25",                Icon: FileSignature, owner: "Intake",        dot: "bg-sky-500" },
  la_signed_awaiting_payment:{ label: "5a. L.A. signed — awaiting $99", short: "Awaiting $99", cls: "bg-amber-500/10 text-amber-700 border-amber-500/25",     Icon: CreditCard,    owner: "YM",            dot: "bg-amber-500" },
  la_signed_paid:            { label: "5b. L.A. signed (paid/free)", short: "L.A. signed",  cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",   Icon: ThumbsUp,      owner: "YM",            dot: "bg-emerald-500" },
  la_confirmed_poa_issued:   { label: "6. POA issued",              short: "POA out",      cls: "bg-sky-500/10 text-sky-700 border-sky-500/25",                Icon: ShieldCheck,   owner: "Senior Broker", dot: "bg-sky-500" },
  awaiting_notarized_docs:   { label: "7. Awaiting notarized docs", short: "Awaiting POA", cls: "bg-amber-500/10 text-amber-700 border-amber-500/25",          Icon: Mail,          owner: "Seller",        dot: "bg-amber-500" },
  file_compiled:             { label: "8a. File compiled",          short: "Compiled",     cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25",    Icon: Package,       owner: "YM / CC",       dot: "bg-emerald-500" },
  listing_live:              { label: "8b. Listing live",           short: "Live",         cls: "bg-emerald-600/15 text-emerald-700 border-emerald-600/30",    Icon: Globe,         owner: "ZM",            dot: "bg-emerald-600" },
};

export const deriveBayerStage = (s: Submission): BayerStage => {
  if ((s as any).pipeline_stage_override) return (s as any).pipeline_stage_override as BayerStage;
  if ((s as any).listing_live_at) return "listing_live";
  if ((s as any).listing_number) return "file_compiled";
  if ((s as any).la_countersigned_at) {
    // POA flow
    return "la_confirmed_poa_issued";
  }
  if ((s as any).la_signed_at) {
    if ((s as any).listing_option === "paid_99" && !(s as any).payment_received_at) return "la_signed_awaiting_payment";
    return "la_signed_paid";
  }
  if ((s as any).la_issued_at) return "la_issued";
  if (s.quote_response === "accepted") return "quote_accepted";
  if ((s as any).morgued_at) return "quote_morgued";
  if (s.quote_sent_at) {
    // auto-morgue at 7d if no response
    const days = (Date.now() - new Date(s.quote_sent_at).getTime()) / 86400000;
    if (days >= 7 && !s.quote_response) return "quote_morgued";
    return "quote_issued";
  }
  return "initial_inquiry";
};

interface PoaRecord {
  id: string;
  owner_name: string;
  relation: string | null;
  poa_type: string;
  delivery_method: string | null;
  status: string;
  notarized_at: string | null;
  returned_at: string | null;
  notes: string | null;
}

interface QuoteRevision {
  id: string;
  prior_amount: number | null;
  new_amount: number;
  reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

interface Props {
  submission: Submission;
  onPatch: (patch: Partial<Submission> & Record<string, any>) => Promise<void>;
}

const nowIso = () => new Date().toISOString();
const inDays = (d: number) => new Date(Date.now() + d * 86400000).toISOString();

const BayerPipelinePanel = ({ submission, onPatch }: Props) => {
  const stage = deriveBayerStage(submission);
  const meta = BAYER_STAGE_META[stage];
  const [poas, setPoas] = useState<PoaRecord[]>([]);
  const [revs, setRevs] = useState<QuoteRevision[]>([]);
  const [newPoaName, setNewPoaName] = useState("");
  const [newPoaRelation, setNewPoaRelation] = useState("");
  const [revAmount, setRevAmount] = useState("");
  const [revReason, setRevReason] = useState("");
  const [revApprover, setRevApprover] = useState<"CC" | "EM">("CC");

  const isForestLawn = (submission.cemetery || "").toLowerCase().includes("forest lawn");
  const requiredApprover = isForestLawn ? "EM" : "CC";

  const refresh = async () => {
    const [p, r] = await Promise.all([
      supabase.from("poa_records" as any).select("*").eq("submission_id", submission.id).order("created_at"),
      supabase.from("quote_revisions" as any).select("*").eq("submission_id", submission.id).order("created_at", { ascending: false }),
    ]);
    if (p.data) setPoas(p.data as any);
    if (r.data) setRevs(r.data as any);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [submission.id]);
  useEffect(() => { setRevApprover(requiredApprover as any); }, [requiredApprover]);

  // Stage advance helpers
  const advance = async (patch: Record<string, any>, msg?: string) => {
    await onPatch(patch);
    if (msg) toast({ title: msg });
  };

  const addPoa = async () => {
    if (!newPoaName.trim()) return;
    const { error } = await supabase.from("poa_records" as any).insert({
      submission_id: submission.id,
      owner_name: newPoaName.trim(),
      relation: newPoaRelation.trim() || null,
      issued_at: nowIso(),
      status: "issued",
    });
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else { setNewPoaName(""); setNewPoaRelation(""); refresh(); }
  };

  const updatePoa = async (id: string, patch: Partial<PoaRecord>) => {
    await supabase.from("poa_records" as any).update(patch).eq("id", id);
    refresh();
  };
  const removePoa = async (id: string) => {
    await supabase.from("poa_records" as any).delete().eq("id", id);
    refresh();
  };

  const recordRevision = async () => {
    const amt = parseFloat(revAmount);
    if (!isFinite(amt)) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    const { error } = await supabase.from("quote_revisions" as any).insert({
      submission_id: submission.id,
      prior_amount: submission.quote_amount ?? null,
      new_amount: amt,
      reason: revReason.trim() || null,
      approved_by: revApprover,
      approved_at: nowIso(),
    });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    await onPatch({ quote_amount: amt, quote_approved_by: revApprover } as any);
    setRevAmount(""); setRevReason("");
    refresh();
    toast({ title: `Revision recorded (approved by ${revApprover})` });
  };

  const allPoasReturned = poas.length > 0 && poas.every(p => p.returned_at);
  const docChecklistComplete =
    (submission as any).gov_id_on_file && (submission as any).deed_on_file;

  return (
    <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-xl border-2 border-primary/30 p-5 space-y-4 shadow-md ring-1 ring-primary/10">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <meta.Icon className="w-5 h-5 text-primary" />
          <h4 className="text-base font-bold text-foreground tracking-tight">Bayer pipeline</h4>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${meta.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          <span className="text-[10px] text-muted-foreground">· Owner: {meta.owner}</span>
        </div>
        {isForestLawn && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/25">
            Forest Lawn — quote routes to EM
          </span>
        )}
      </div>

      {/* Stage rail (compact horizontal) */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2 -my-1 -mx-1 px-1">
        {(BAYER_STAGE_ORDER.filter(s => s !== "quote_morgued") as BayerStage[]).map((s, i, arr) => {
          const m = BAYER_STAGE_META[s];
          const stageIdx = arr.indexOf(stage as BayerStage);
          const myIdx = i;
          const isCurrent = s === stage;
          const isDone = stageIdx > myIdx;
          return (
            <div key={s} className="flex items-center gap-1 shrink-0">
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border ${
                  isCurrent ? m.cls + " ring-1 ring-current/30" :
                  isDone ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25" :
                  "bg-card text-muted-foreground border-border"
                }`}
              >
                <span className={`w-1 h-1 rounded-full ${isDone ? "bg-emerald-500" : m.dot}`} />
                {m.short}
              </div>
              {i < arr.length - 1 && <span className="text-muted-foreground/30 text-[10px]">→</span>}
            </div>
          );
        })}
      </div>

      {/* ============== Stage-specific action panel ============== */}
      <motion.div key={stage} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-lg border border-border/50 p-4 space-y-3">

        {/* STAGE 1 — Intake */}
        {stage === "initial_inquiry" && (
          <>
            <p className="text-xs text-muted-foreground">Confirm intake details and authorization, then issue quote.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <Toggle label="Authorization confirmed" value={!!(submission as any).authorization_confirmed} onChange={v => onPatch({ authorization_confirmed: v } as any)} />
              <Toggle label="Cemetery verified ownership" value={!!(submission as any).cemetery_verified_ownership} onChange={v => onPatch({ cemetery_verified_ownership: v } as any)} />
              <NumberField label="Cemetery retail" value={(submission as any).cemetery_retail} onSave={v => onPatch({ cemetery_retail: v } as any)} />
              <NumberField label="Transfer fee" value={submission.transfer_fee_amount} onSave={v => onPatch({ transfer_fee_amount: v } as any)} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Next: {requiredApprover} approves the quote → Cici sends template A/B/C. Use the "Send seller quote" button below.
            </p>
          </>
        )}

        {/* STAGE 2 — Quote issued */}
        {stage === "quote_issued" && (
          <>
            <div className="text-xs text-foreground">
              <span className="font-medium">Quote sent</span>
              {submission.quote_amount ? ` · $${Number(submission.quote_amount).toLocaleString()}` : ""}
              {(submission as any).quote_template ? ` · Template ${(submission as any).quote_template}` : ""}
              {submission.quote_sent_at && (
                <> · {formatDistanceToNow(new Date(submission.quote_sent_at), { addSuffix: true })}</>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              3-day quote validity. Auto-morgues after 7 days with no response.
            </p>
            <RevisionForm
              revAmount={revAmount} setRevAmount={setRevAmount}
              revReason={revReason} setRevReason={setRevReason}
              revApprover={revApprover} setRevApprover={setRevApprover}
              onSubmit={recordRevision}
              required={requiredApprover}
            />
            <RevisionList revs={revs} />
            <div className="flex gap-2 flex-wrap pt-1">
              <button onClick={() => advance({ morgued_at: nowIso() } as any, "Morgued")} className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-muted text-foreground border border-border">
                <Archive className="w-3 h-3 inline mr-1" /> Morgue manually
              </button>
            </div>
          </>
        )}

        {/* STAGE 2b — Morgued */}
        {stage === "quote_morgued" && (
          <>
            <p className="text-xs text-muted-foreground">Archived — no response within 7 days. Reactivate if seller comes back.</p>
            <button onClick={() => advance({ morgued_at: null, quote_responded_at: null, quote_response: null } as any, "Reactivated")} className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-foreground text-background">
              <RotateCcw className="w-3 h-3 inline mr-1" /> Reactivate
            </button>
          </>
        )}

        {/* STAGE 3 — Accepted, prepare L.A. */}
        {stage === "quote_accepted" && (
          <>
            <p className="text-xs text-foreground font-medium">Quote accepted — collect requirements before issuing L.A.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <Toggle label="Government ID on file" value={!!(submission as any).gov_id_on_file} onChange={v => onPatch({ gov_id_on_file: v } as any)} />
              <Toggle label="Deed / cemetery doc on file" value={!!(submission as any).deed_on_file} onChange={v => onPatch({ deed_on_file: v } as any)} />
              <Toggle label="Death cert(s) on file" value={!!(submission as any).death_cert_on_file} onChange={v => onPatch({ death_cert_on_file: v } as any)} />
              <Toggle label="Multi-owner: needs perm-to-rep" value={!!(submission as any).multi_owner_perm_required} onChange={v => onPatch({ multi_owner_perm_required: v } as any)} />
            </div>
            <SelectField label="Ownership type" value={(submission as any).ownership_type ?? ""} options={["", "self", "heir", "multi_owner"]} onSave={v => onPatch({ ownership_type: v || null } as any)} />
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                disabled={!docChecklistComplete}
                onClick={() => advance({ la_issued_at: nowIso(), la_signature_expires_at: inDays(3) } as any, "L.A. issued via Dropbox Sign")}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-primary text-primary-foreground disabled:opacity-40"
              >
                <FileSignature className="w-3 h-3 inline mr-1" /> Issue L.A. (Dropbox Sign)
              </button>
              {!docChecklistComplete && <span className="text-[10px] text-muted-foreground self-center">ID + deed required first</span>}
            </div>
          </>
        )}

        {/* STAGE 4 — L.A. issued */}
        {stage === "la_issued" && (
          <>
            <p className="text-xs text-foreground">L.A. issued via Dropbox Sign. Signature link expires in 3 days.</p>
            <div className="text-[11px] text-muted-foreground">
              Sent {(submission as any).la_issued_at && formatDistanceToNow(new Date((submission as any).la_issued_at), { addSuffix: true })}
              {(submission as any).la_signature_expires_at && (
                <> · expires {formatDistanceToNow(new Date((submission as any).la_signature_expires_at), { addSuffix: true })}</>
              )}
            </div>
            <SelectField label="Listing option chosen" value={(submission as any).listing_option ?? ""} options={["", "paid_99", "free"]} onSave={v => onPatch({ listing_option: v || null } as any)} />
            <button
              onClick={() => advance({ la_signed_at: nowIso() } as any, "L.A. signed")}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-emerald-600 text-white"
            >
              <ThumbsUp className="w-3 h-3 inline mr-1" /> Mark L.A. signed
            </button>
          </>
        )}

        {/* STAGE 5a — Awaiting payment */}
        {stage === "la_signed_awaiting_payment" && (
          <>
            <p className="text-xs text-foreground font-medium">$99 listing — awaiting Stax payment.</p>
            <div className="flex flex-wrap gap-2">
              {!(submission as any).payment_link_sent_at && (
                <button onClick={() => advance({ payment_link_sent_at: nowIso() } as any, "Stax link sent")} className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-foreground text-background">
                  <CreditCard className="w-3 h-3 inline mr-1" /> Mark Stax link sent
                </button>
              )}
              <button onClick={() => advance({ payment_received_at: nowIso() } as any, "Payment received (YM)")} className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-emerald-600 text-white">
                YM: confirm payment received
              </button>
            </div>
            {(submission as any).payment_link_sent_at && (
              <p className="text-[10px] text-muted-foreground">Stax link sent {formatDistanceToNow(new Date((submission as any).payment_link_sent_at), { addSuffix: true })}</p>
            )}
          </>
        )}

        {/* STAGE 5b — Signed (paid or free), need countersign */}
        {stage === "la_signed_paid" && (
          <>
            <p className="text-xs text-foreground">L.A. signed by seller. Senior Broker must countersign electronically.</p>
            <button onClick={() => advance({ la_countersigned_at: nowIso() } as any, "L.A. countersigned by Senior Broker")} className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-primary text-primary-foreground">
              <FileSignature className="w-3 h-3 inline mr-1" /> Senior Broker countersigns
            </button>
          </>
        )}

        {/* STAGE 6 — POA issued, manage POA records */}
        {stage === "la_confirmed_poa_issued" && (
          <>
            <p className="text-xs text-foreground font-medium">POA(s) issued for notarization. Track each owner's POA below.</p>
            <Toggle label="Multi-owner permission doc signed" value={!!(submission as any).multi_owner_perm_signed_at} onChange={v => onPatch({ multi_owner_perm_signed_at: v ? nowIso() : null } as any)} />
            <PoaTable poas={poas} onUpdate={updatePoa} onRemove={removePoa} />
            <div className="flex gap-2 items-end flex-wrap bg-muted/30 p-2 rounded-lg">
              <input value={newPoaName} onChange={e => setNewPoaName(e.target.value)} placeholder="Owner name" className="flex-1 min-w-[120px] px-2 py-1 rounded bg-background border border-border text-xs" />
              <input value={newPoaRelation} onChange={e => setNewPoaRelation(e.target.value)} placeholder="Relation (spouse, sibling…)" className="flex-1 min-w-[120px] px-2 py-1 rounded bg-background border border-border text-xs" />
              <button onClick={addPoa} className="px-2 py-1 rounded bg-foreground text-background text-[11px] inline-flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add POA
              </button>
            </div>
          </>
        )}

        {/* STAGE 7 — Awaiting notarized originals via USPS */}
        {stage === "awaiting_notarized_docs" && (
          <>
            <p className="text-xs text-foreground">Awaiting notarized POA originals via USPS.</p>
            <PoaTable poas={poas} onUpdate={updatePoa} onRemove={removePoa} />
            {allPoasReturned && (
              <button onClick={() => advance({} as any, "All POAs received — proceed to file compile")} className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-emerald-600 text-white">
                All POAs received
              </button>
            )}
          </>
        )}

        {/* STAGE 8a — Compile listing */}
        {stage === "file_compiled" && (
          <>
            <p className="text-xs text-foreground font-medium">File compiled — finalize and publish.</p>
            <TextField label="Listing # (C#) — assigned by CC" value={(submission as any).listing_number ?? ""} onSave={v => onPatch({ listing_number: v || null } as any)} />
            <TextField label="Google Drive URL (CA scan)" value={(submission as any).gdrive_url ?? ""} onSave={v => onPatch({ gdrive_url: v || null } as any)} />
            <TextField label="Final listing URL (ZM publishes)" value={(submission as any).listing_url ?? ""} onSave={v => onPatch({ listing_url: v || null } as any)} />
            <button
              onClick={() => advance({ listing_live_at: nowIso(), receipt_sent_at: nowIso() } as any, "Listing live — receipt sent")}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-emerald-600 text-white"
            >
              <Globe className="w-3 h-3 inline mr-1" /> Mark listing live
            </button>
          </>
        )}

        {/* STAGE 8b — Live */}
        {stage === "listing_live" && (
          <>
            <p className="text-xs text-emerald-700 font-medium">🎉 Listing is live.</p>
            {(submission as any).listing_number && <p className="text-[11px] text-muted-foreground">C#: {(submission as any).listing_number}</p>}
            {(submission as any).listing_url && (
              <a href={(submission as any).listing_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                {(submission as any).listing_url}
              </a>
            )}
          </>
        )}

        {/* Manual stage override */}
        <details className="text-[10px] text-muted-foreground pt-2 border-t border-border/30">
          <summary className="cursor-pointer hover:text-foreground">Manual override</summary>
          <select
            value={(submission as any).pipeline_stage_override ?? ""}
            onChange={e => onPatch({ pipeline_stage_override: e.target.value || null } as any)}
            className="mt-2 w-full px-2 py-1 bg-background border border-border rounded text-xs text-foreground"
          >
            <option value="">— derive automatically —</option>
            {BAYER_STAGE_ORDER.map(s => <option key={s} value={s}>{BAYER_STAGE_META[s].label}</option>)}
          </select>
        </details>
      </motion.div>
    </section>
  );
};

// ============== Sub-components ==============

const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <button onClick={() => onChange(!value)} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs ${value ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700" : "bg-background border-border text-muted-foreground"}`}>
    <span>{label}</span>
    <span className={`w-3 h-3 rounded-full ${value ? "bg-emerald-500" : "bg-muted"}`} />
  </button>
);

const NumberField = ({ label, value, onSave }: { label: string; value: number | null | undefined; onSave: (v: number | null) => void }) => {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase text-muted-foreground">{label}</span>
      <input
        type="number"
        value={draft as any}
        onChange={e => setDraft(e.target.value as any)}
        onBlur={() => {
          const n = draft === "" ? null : parseFloat(draft as any);
          if (n !== value) onSave(isFinite(n as number) ? (n as number) : null);
        }}
        className="px-2 py-1 rounded bg-background border border-border text-xs"
      />
    </div>
  );
};

const TextField = ({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase text-muted-foreground">{label}</span>
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => { if (draft !== value) onSave(draft); }}
        className="px-2 py-1 rounded bg-background border border-border text-xs"
      />
    </div>
  );
};

const SelectField = ({ label, value, options, onSave }: { label: string; value: string; options: string[]; onSave: (v: string) => void }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[10px] uppercase text-muted-foreground">{label}</span>
    <select value={value} onChange={e => onSave(e.target.value)} className="px-2 py-1 rounded bg-background border border-border text-xs">
      {options.map(o => <option key={o} value={o}>{o || "—"}</option>)}
    </select>
  </div>
);

const PoaTable = ({ poas, onUpdate, onRemove }: { poas: PoaRecord[]; onUpdate: (id: string, p: Partial<PoaRecord>) => void; onRemove: (id: string) => void }) => {
  if (poas.length === 0) return <p className="text-[11px] text-muted-foreground italic">No POA records yet — add one below.</p>;
  return (
    <ul className="space-y-1.5">
      {poas.map(p => (
        <li key={p.id} className="bg-muted/30 rounded-lg border border-border/50 px-3 py-2 text-xs flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <p className="font-medium text-foreground">{p.owner_name}</p>
            {p.relation && <p className="text-[10px] text-muted-foreground">{p.relation}</p>}
          </div>
          <select value={p.status} onChange={e => onUpdate(p.id, { status: e.target.value })} className="bg-background border border-border rounded px-1.5 py-0.5 text-[10px]">
            <option value="pending">pending</option>
            <option value="issued">issued</option>
            <option value="mailed">mailed</option>
            <option value="notarized">notarized</option>
            <option value="returned">returned</option>
          </select>
          <button
            onClick={() => onUpdate(p.id, { notarized_at: p.notarized_at ? null : new Date().toISOString() })}
            className={`text-[10px] px-1.5 py-0.5 rounded border ${p.notarized_at ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "border-border text-muted-foreground"}`}
          >
            Notarized
          </button>
          <button
            onClick={() => onUpdate(p.id, { returned_at: p.returned_at ? null : new Date().toISOString(), status: p.returned_at ? p.status : "returned" })}
            className={`text-[10px] px-1.5 py-0.5 rounded border ${p.returned_at ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "border-border text-muted-foreground"}`}
          >
            Returned (USPS)
          </button>
          <button onClick={() => onRemove(p.id)} className="text-muted-foreground/60 hover:text-destructive">
            <Trash2 className="w-3 h-3" />
          </button>
        </li>
      ))}
    </ul>
  );
};

const RevisionForm = ({ revAmount, setRevAmount, revReason, setRevReason, revApprover, setRevApprover, onSubmit, required }: any) => (
  <div className="bg-muted/30 p-2 rounded-lg space-y-2">
    <p className="text-[10px] uppercase text-muted-foreground">Revise quote (requires {required} approval)</p>
    <div className="flex gap-2 flex-wrap">
      <input type="number" placeholder="New amount" value={revAmount} onChange={e => setRevAmount(e.target.value)} className="flex-1 min-w-[100px] px-2 py-1 rounded bg-background border border-border text-xs" />
      <select value={revApprover} onChange={e => setRevApprover(e.target.value)} className="px-2 py-1 rounded bg-background border border-border text-xs">
        <option value="CC">CC</option>
        <option value="EM">EM</option>
      </select>
      <button onClick={onSubmit} className="px-2 py-1 rounded bg-foreground text-background text-[11px]">Record</button>
    </div>
    <input placeholder="Reason (optional)" value={revReason} onChange={e => setRevReason(e.target.value)} className="w-full px-2 py-1 rounded bg-background border border-border text-xs" />
  </div>
);

const RevisionList = ({ revs }: { revs: QuoteRevision[] }) => {
  if (revs.length === 0) return null;
  return (
    <ul className="text-[11px] text-muted-foreground space-y-0.5">
      {revs.map(r => (
        <li key={r.id}>
          · {r.prior_amount ? `$${Number(r.prior_amount).toLocaleString()} → ` : ""}
          <span className="text-foreground font-medium">${Number(r.new_amount).toLocaleString()}</span>
          {r.approved_by && <> · approved by {r.approved_by}</>}
          {r.reason && <> — {r.reason}</>}
        </li>
      ))}
    </ul>
  );
};

export default BayerPipelinePanel;
