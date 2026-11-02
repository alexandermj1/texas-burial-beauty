// Staff side of the buyer Purchase Agreement: match a Docs-out seller to a
// buyer (from either record), edit the schedule, send the signing link,
// countersign (which issues the card payment link) and follow progress.
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Download, FileSignature, Handshake, Loader2, Mail, PenLine, RefreshCw, Search, XCircle } from "lucide-react";
import SignaturePad from "@/components/SignaturePad";
import { resolveKind } from "./CustomerKindBadge";
import { getPaymentsEnvironment } from "@/lib/paymentEnvironment";
import {
  STATUS_LABEL, chargeTotals, defaultFields, inviteEmailPreviewNote, money, normalizeFields, paCall, sellerReadyForBuyer,
  type AgreementFields, type PaStatus,
} from "@/lib/purchaseAgreement";

type Agreement = {
  id: string; status: PaStatus; fields: AgreementFields; seller_submission_id: string; buyer_submission_id: string;
  sign_token: string | null; events: { at: string; type: string; by?: string }[]; payment_url: string | null;
  sent_at: string | null; viewed_at: string | null; buyer_signed_at: string | null; countersigned_at: string | null; paid_at: string | null;
  void_reason: string | null; buyer_signature: any; document_hash: string | null; signed_pdf_path: string | null;
};
type Rec = Record<string, any>;

const SELLER_COLS = "id,name,email,phone,cemetery,cemetery_city,section,lawn,plot_description,property_type,spaces,plot_count,quote_amount,accepted_quote_amount,transfer_fee_amount,buyer_fees,documents_requested_at,documents_completed_at,sold_at,deleted_at,customer_kind,source,created_at,message";
const STATUS_TONE: Record<PaStatus, string> = {
  draft: "bg-muted text-foreground", sent: "bg-secondary text-secondary-foreground", viewed: "bg-secondary text-secondary-foreground",
  buyer_signed: "bg-accent text-accent-foreground", countersigned: "bg-primary/15 text-primary", paid: "bg-primary text-primary-foreground", void: "bg-muted text-muted-foreground line-through",
};
const SITE = "https://www.texascemeterybrokers.com";
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");

export default function PurchaseAgreementPanel({ submission, kind }: { submission: Rec; kind: "seller" | "buyer" | "contact" }) {
  const [list, setList] = useState<Agreement[] | null>(null);
  const [names, setNames] = useState<Record<string, Rec>>({});
  const [picker, setPicker] = useState(false);
  const isSeller = kind !== "buyer";
  const ready = !isSeller || sellerReadyForBuyer(submission);

  const load = useCallback(async () => {
    const col = isSeller ? "seller_submission_id" : "buyer_submission_id";
    const { data } = await supabase.from("purchase_agreements").select("*").eq(col, submission.id).is("deleted_at", null).order("created_at", { ascending: false });
    const rows = (data ?? []) as unknown as Agreement[];
    setList(rows);
    const ids = [...new Set(rows.map((r) => (isSeller ? r.buyer_submission_id : r.seller_submission_id)))];
    if (ids.length) {
      const { data: people } = await supabase.from("contact_submissions").select("id,name,email,cemetery").in("id", ids);
      setNames(Object.fromEntries((people ?? []).map((p: any) => [p.id, p])));
    }
  }, [submission.id, isSeller]);
  useEffect(() => { load(); }, [load]);

  if (isSeller && !ready && !list?.length) return null;
  const active = (list ?? []).filter((a) => a.status !== "void");
  const voided = (list ?? []).filter((a) => a.status === "void");

  const match = async (other: Rec) => {
    const seller = isSeller ? submission : other; const buyer = isSeller ? other : submission;
    try {
      await paCall({ action: "create", seller_submission_id: seller.id, buyer_submission_id: buyer.id, fields: defaultFields(seller, buyer) });
      toast.success(`Matched ${buyer.name || "buyer"} to ${seller.name || "seller"}. Check the details, then send.`);
      setPicker(false); load();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="border-t border-border/40 pt-4 space-y-3" data-testid="purchase-agreement-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><Handshake className="w-3 h-3" /> Buyer match &amp; purchase agreement</p>
        {ready && (
          <Button size="sm" variant={active.length ? "outline" : "default"} onClick={() => setPicker(true)}>
            <Handshake className="w-4 h-4 mr-1.5" />{isSeller ? (active.length ? "Match another buyer" : "Match to buyer & send purchase agreement") : "Match to a seller's property"}
          </Button>
        )}
      </div>
      {list === null && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      {list && !active.length && <p className="text-xs text-muted-foreground">{isSeller ? "No buyer matched yet." : "This buyer hasn't been matched to a property yet."}</p>}
      {active.map((a) => (
        <AgreementCard key={a.id} a={a} other={names[isSeller ? a.buyer_submission_id : a.seller_submission_id]} isSeller={isSeller} onChange={load} />
      ))}
      {voided.length > 0 && <p className="text-[11px] text-muted-foreground">{voided.length} voided agreement{voided.length > 1 ? "s" : ""}: {voided.map((v) => `${names[isSeller ? v.buyer_submission_id : v.seller_submission_id]?.name ?? "—"} (${v.void_reason ?? "no reason"})`).join("; ")}</p>}
      {picker && <MatchPicker isSeller={isSeller} submission={submission} onClose={() => setPicker(false)} onPick={match} />}
    </div>
  );
}

function MatchPicker({ isSeller, submission, onClose, onPick }: { isSeller: boolean; submission: Rec; onClose: () => void; onPick: (r: Rec) => void }) {
  const [rows, setRows] = useState<Rec[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      let query = supabase.from("contact_submissions").select(SELLER_COLS).is("deleted_at", null).order("created_at", { ascending: false }).limit(1000);
      if (!isSeller) query = query.or("documents_requested_at.not.is.null,documents_completed_at.not.is.null").is("sold_at", null);
      const { data } = await query;
      const want = isSeller ? "buyer" : "seller";
      setRows(((data ?? []) as Rec[]).filter((r) => r.id !== submission.id && resolveKind(r.customer_kind, r.source) === want && (want === "buyer" || sellerReadyForBuyer(r as any))));
    })();
  }, [isSeller, submission.id]);
  const cem = String(submission.cemetery ?? "").toLowerCase().split(/\s+/)[0] ?? "";
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows ?? [])
      .filter((r) => !t || [r.name, r.email, r.cemetery, r.phone].some((v) => String(v ?? "").toLowerCase().includes(t)))
      .sort((a, b) => Number(!!cem && String(b.cemetery ?? "").toLowerCase().includes(cem)) - Number(!!cem && String(a.cemetery ?? "").toLowerCase().includes(cem)))
      .slice(0, 60);
  }, [rows, q, cem]);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isSeller ? `Match a buyer to ${submission.name}'s property` : `Match ${submission.name} to a seller's property`}</DialogTitle>
          <DialogDescription>{isSeller ? "Buyers at the same cemetery are listed first." : "Only sellers whose paperwork is out (Docs out or later) and not yet sold are listed. Same cemetery first."}</DialogDescription>
        </DialogHeader>
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" /><Input autoFocus className="pl-9" placeholder="Search name, email, phone or cemetery" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="max-h-[50vh] overflow-y-auto divide-y divide-border rounded-md border border-border">
          {rows === null && <div className="p-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin" /></div>}
          {rows && !shown.length && <p className="p-4 text-sm text-muted-foreground">No matching {isSeller ? "buyers" : "sellers"}.</p>}
          {shown.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{r.name || r.email}</p>
                <p className="text-xs text-muted-foreground truncate">{[r.cemetery, r.cemetery_city, r.section && `Sec ${r.section}`, (r.plot_count || r.spaces) && `${r.plot_count || r.spaces} space(s)`, r.email].filter(Boolean).join(" · ")}</p>
              </div>
              <Button size="sm" disabled={!!busy} onClick={async () => { setBusy(r.id); await onPick(r); setBusy(null); }}>{busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Match"}</Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const STEPS: { key: PaStatus; label: string; at: (a: Agreement) => string | null }[] = [
  { key: "draft", label: "Matched", at: () => null },
  { key: "sent", label: "Sent", at: (a) => a.sent_at },
  { key: "viewed", label: "Opened", at: (a) => a.viewed_at },
  { key: "buyer_signed", label: "Buyer signed", at: (a) => a.buyer_signed_at },
  { key: "countersigned", label: "Countersigned", at: (a) => a.countersigned_at },
  { key: "paid", label: "Paid", at: (a) => a.paid_at },
];

function AgreementCard({ a, other, isSeller, onChange }: { a: Agreement; other?: Rec; isSeller: boolean; onChange: () => void }) {
  const [f, setF] = useState<AgreementFields>(normalizeFields(a.fields));
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [csOpen, setCsOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(a.status === "draft");
  useEffect(() => { setF(normalizeFields(a.fields)); setDirty(false); }, [a.fields]);
  const editable = ["draft", "sent", "viewed"].includes(a.status);
  const t = chargeTotals(f.charges);
  const idx = STEPS.findIndex((s) => s.key === a.status);
  const signUrl = a.sign_token ? `${SITE}/purchase-agreement/${a.sign_token}` : null;

  const run = async (k: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(k);
    try { await fn(); if (ok) toast.success(ok); onChange(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const save = () => run("save", () => paCall({ action: "update", id: a.id, fields: f }), "Agreement details saved");
  const set = <S extends keyof AgreementFields>(s: S, k: keyof AgreementFields[S], v: unknown) => { setF((x) => ({ ...x, [s]: { ...x[s], [k]: v } })); setDirty(true); };
  const openPdf = () => run("pdf", async () => {
    const r = await paCall<{ url?: string; base64?: string }>({ action: "pdf", id: a.id });
    if (r.url) window.open(r.url, "_blank", "noopener");
    else if (r.base64) { const blob = new Blob([Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0))], { type: "application/pdf" }); window.open(URL.createObjectURL(blob), "_blank", "noopener"); }
  });

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <FileSignature className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{isSeller ? "Buyer matched:" : "Matched to seller:"} {other?.name ?? "—"}</span>
        {!isSeller && other?.cemetery && <span className="text-xs text-muted-foreground">({other.cemetery})</span>}
        <Badge className={`${STATUS_TONE[a.status]} border-0`}>{STATUS_LABEL[a.status]}</Badge>
        <span className="ml-auto text-sm font-semibold tabular-nums text-foreground">{money(t.totalDue)}</span>
      </div>

      <ol className="grid grid-cols-6 gap-1" aria-label="Purchase agreement progress">
        {STEPS.map((s, i) => (
          <li key={s.key} className="text-center">
            <div className={`h-1.5 rounded-full ${i <= idx ? "bg-primary" : "bg-muted"}`} />
            <p className={`mt-1 text-[10px] ${i <= idx ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
            <p className="text-[9px] text-muted-foreground">{fmt(s.at(a))}</p>
          </li>
        ))}
      </ol>

      {editable && (
        <div className="rounded-lg bg-muted/40 p-3">
          <button type="button" className="text-xs font-medium text-foreground underline" onClick={() => setEditOpen((o) => !o)}>{editOpen ? "Hide" : "Edit"} agreement details (price, property, purchaser)</button>
          {editOpen && (
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              <E label="Purchaser name(s)" v={f.purchaser.names} on={(v) => set("purchaser", "names", v)} />
              <E label="Purchaser email" v={f.purchaser.email} on={(v) => set("purchaser", "email", v)} />
              <E label="Purchaser phone" v={f.purchaser.phone} on={(v) => set("purchaser", "phone", v)} />
              <E label="Purchaser address (buyer can complete)" v={f.purchaser.address} on={(v) => set("purchaser", "address", v)} />
              <E label="Cemetery" v={f.property.cemetery} on={(v) => set("property", "cemetery", v)} />
              <E label="City" v={f.property.city} on={(v) => set("property", "city", v)} />
              <div className="sm:col-span-2"><E label="Property description — legal (section, lot, space)" v={f.property.description} on={(v) => set("property", "description", v)} /></div>
              <E label="Number of spaces" type="number" v={String(f.property.spaces)} on={(v) => set("property", "spaces", Math.max(1, parseInt(v, 10) || 1))} />
              <E label="Property type" v={f.property.property_type} on={(v) => set("property", "property_type", v)} />
              <div className="sm:col-span-2"><E label="Additional commodities / services (optional)" v={f.property.commodities} on={(v) => set("property", "commodities", v)} /></div>
              <E label="1. Commitment deposit ($)" type="number" v={String(f.charges.deposit)} on={(v) => set("charges", "deposit", Number(v) || 0)} />
              <E label="2. Balance of property price ($)" type="number" v={String(f.charges.balance)} on={(v) => set("charges", "balance", Number(v) || 0)} />
              <E label="4. Cemetery transfer fee ($)" type="number" v={String(f.charges.transfer_fee)} on={(v) => set("charges", "transfer_fee", Number(v) || 0)} />
              <E label="5. Adjustments ($, can be negative)" type="number" v={String(f.charges.adjustments)} on={(v) => set("charges", "adjustments", Number(v) || 0)} />
              <div className="sm:col-span-2"><E label="Adjustment note (shown to buyer)" v={f.charges.adjustments_note} on={(v) => set("charges", "adjustments_note", v)} /></div>
              <p className="sm:col-span-2 text-xs text-muted-foreground">3. Total property price {money(t.totalProperty)} · <strong className="text-foreground">6. Total amount due {money(t.totalDue)}</strong> — this is what the buyer's card payment link will charge.</p>
              <div className="sm:col-span-2 flex gap-2">
                <Button size="sm" onClick={save} disabled={!dirty || !!busy}>{busy === "save" && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Save details</Button>
                {a.status !== "draft" && dirty && <p className="text-xs text-muted-foreground self-center">Saving updates the link the buyer already has — they'll be asked to reload.</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {a.status === "buyer_signed" && (
        <p className="text-xs text-foreground">Signed by <strong>{a.buyer_signature?.typed_name}</strong> on {fmt(a.buyer_signed_at)} from IP {a.buyer_signature?.ip}. Deed to: {f.deed.same_as_purchaser ? f.purchaser.names : f.deed.names}{f.deed.holder2 ? ` & ${f.deed.holder2}` : ""}.</p>
      )}
      {a.payment_url && <p className="text-xs text-muted-foreground break-all">Payment link: <a className="underline" href={a.payment_url} target="_blank" rel="noreferrer">{a.payment_url}</a></p>}

      <div className="flex flex-wrap gap-2">
        {editable && <Button size="sm" onClick={() => (dirty ? toast.error("Save your changes first.") : setSendOpen(true))}><Mail className="w-4 h-4 mr-1.5" />{a.status === "draft" ? "Send purchase agreement to buyer" : "Resend to buyer"}</Button>}
        {signUrl && editable && <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(signUrl); toast.success("Signing link copied"); }}><Copy className="w-4 h-4 mr-1.5" />Copy signing link</Button>}
        {a.status === "buyer_signed" && <Button size="sm" onClick={() => setCsOpen(true)}><PenLine className="w-4 h-4 mr-1.5" />Countersign &amp; send payment link</Button>}
        {a.status === "countersigned" && <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run("resend", () => paCall({ action: "resend_executed", id: a.id }), "Payment link re-sent to the buyer")}><RefreshCw className="w-4 h-4 mr-1.5" />Resend payment link</Button>}
        <Button size="sm" variant="outline" disabled={!!busy} onClick={openPdf}>{busy === "pdf" ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Download className="w-4 h-4 mr-1.5" />}{a.signed_pdf_path ? "Executed PDF" : "Preview PDF"}</Button>
        {a.status !== "paid" && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setVoidOpen(true)}><XCircle className="w-4 h-4 mr-1.5" />Void</Button>}
      </div>

      <details className="text-[11px] text-muted-foreground">
        <summary className="cursor-pointer">Audit trail ({a.events?.length ?? 0} events){a.document_hash ? ` · fingerprint ${a.document_hash.slice(0, 12)}…` : ""}</summary>
        <ul className="mt-1 space-y-0.5">{(a.events ?? []).map((e, i) => <li key={i}>{fmt(e.at)} — {e.type.replace(/_/g, " ")}{e.by ? ` · ${e.by}` : ""}</li>)}</ul>
      </details>

      {sendOpen && <SendDialog a={a} f={f} onClose={() => setSendOpen(false)} onDone={() => { setSendOpen(false); onChange(); }} />}
      {csOpen && <CountersignDialog a={a} total={t.totalDue} onClose={() => setCsOpen(false)} onDone={() => { setCsOpen(false); onChange(); }} />}
      {voidOpen && <VoidDialog a={a} onClose={() => setVoidOpen(false)} onDone={() => { setVoidOpen(false); onChange(); }} />}
    </div>
  );
}

function E({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string }) {
  return <div><Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Label><Input type={type} value={v} onChange={(e) => on(e.target.value)} className="h-8 mt-0.5" /></div>;
}

function SendDialog({ a, f, onClose, onDone }: { a: Agreement; f: AgreementFields; onClose: () => void; onDone: () => void }) {
  const [to, setTo] = useState(f.purchaser.email);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const t = chargeTotals(f.charges);
  const go = async () => {
    setBusy(true);
    try { await paCall({ action: "send", id: a.id, to, note }); toast.success(`Purchase agreement emailed to ${to}`); onDone(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Send purchase agreement to buyer</DialogTitle><DialogDescription>{inviteEmailPreviewNote}</DialogDescription></DialogHeader>
        <div className="rounded-md bg-muted/50 p-3 text-sm space-y-0.5">
          <p><strong>{f.property.cemetery}</strong>{f.property.city ? `, ${f.property.city}` : ""}</p>
          <p className="text-muted-foreground">{f.property.description} · {f.property.spaces} space(s)</p>
          <p>Total amount due <strong>{money(t.totalDue)}</strong></p>
        </div>
        <div><Label>Send to</Label><Input value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div><Label>Personal note (optional)</Label><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Lovely speaking with you today — here is the agreement for the two spaces we discussed." /></div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={go} disabled={busy || !to}>{busy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Send email</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CountersignDialog({ a, total, onClose, onDone }: { a: Agreement; total: number; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [sig, setSig] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { supabase.auth.getUser().then(async ({ data }) => { if (!data.user) return; const { data: p } = await supabase.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle(); setName(p?.full_name || ""); }); }, []);
  const go = async () => {
    setBusy(true);
    try {
      const r = await paCall<{ warning?: string }>({ action: "countersign", id: a.id, signer_name: name, signature: sig, environment: getPaymentsEnvironment() });
      if (r.warning) toast.warning(r.warning); else toast.success("Countersigned. Executed copy and payment link emailed to the buyer.");
      onDone();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Countersign for Texas Cemetery Brokers</DialogTitle><DialogDescription>This makes the agreement binding, creates a live card payment link for {money(total)}, and emails the buyer the executed PDF with the link.</DialogDescription></DialogHeader>
        <div><Label>Your name (authorized representative)</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <SignaturePad label="Broker signature" onChange={setSig} />
        <label className="flex items-start gap-2 text-sm"><Checkbox checked={ok} onCheckedChange={(c) => setOk(!!c)} className="mt-0.5" />I've checked the buyer's details, the deed names and the price, and I'm authorized to sign for Texas Cemetery Brokers.</label>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={go} disabled={busy || !sig || !ok || name.trim().length < 2}>{busy && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Countersign &amp; send</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VoidDialog({ a, onClose, onDone }: { a: Agreement; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Void this purchase agreement?</DialogTitle><DialogDescription>The buyer's link will stop working. The record is kept for your history. {a.status === "countersigned" ? "If they have not paid, also deactivate the payment link in Stripe." : ""}</DialogDescription></DialogHeader>
        <div><Label>Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Buyer chose a different plot" /></div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Keep</Button><Button variant="destructive" disabled={busy || reason.trim().length < 2} onClick={async () => {
          setBusy(true); try { await paCall({ action: "void", id: a.id, reason }); toast.success("Agreement voided"); onDone(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
        }}>Void agreement</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
