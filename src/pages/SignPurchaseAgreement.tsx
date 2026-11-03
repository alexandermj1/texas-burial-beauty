import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CheckCircle2, CreditCard, Download, Loader2, Lock, PenLine, ShieldCheck } from "lucide-react";
import SignaturePad from "@/components/SignaturePad";
import {
  ACKNOWLEDGEMENTS, CANCELLATION_NOTICE, ESIGN_CONSENT, TERMS, chargeTotals, documentFingerprint, money, paCall,
  type AgreementFields,
} from "@/lib/purchaseAgreement";

type View = { id: string; status: string; fields: AgreementFields; terms_version: string; buyer_signed_at: string | null; payment_url: string | null };

const Row = ({ k, v, locked }: { k: string; v?: string | number | null; locked?: boolean }) => (
  <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-1 py-2 border-b border-border/50 last:border-0 items-center">
    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</span>
    <span className={locked ? "flex items-center justify-between gap-3 rounded-md bg-muted px-3 py-1.5 text-sm text-foreground break-words" : "text-sm text-foreground break-words"}>
      <span>{v || "—"}</span>
      {locked && <span className="inline-flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground" title="Set by Texas Cemetery Brokers — cannot be edited"><Lock className="w-3 h-3" />Locked</span>}
    </span>
  </div>
);
const LockedNote = () => (
  <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground"><Lock className="w-3.5 h-3.5" />These details are set by Texas Cemetery Brokers and cannot be edited. If anything is wrong, call (214) 230-4740 before signing.</p>
);

const Section = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <section className="rounded-xl border border-border bg-card p-5 sm:p-7 shadow-sm">
    <div className="flex items-baseline gap-3 mb-4">
      <span className="font-serif text-2xl text-primary">{n}</span>
      <h2 className="font-serif text-xl text-foreground">{title}</h2>
    </div>
    {children}
  </section>
);

export default function SignPurchaseAgreement() {
  const { token = "" } = useParams();
  const [view, setView] = useState<View | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState<AgreementFields | null>(null);
  const [hash, setHash] = useState("");
  const [typed, setTyped] = useState("");
  const [sig, setSig] = useState<string | null>(null);
  const [initials, setInitials] = useState({ rules: "", verification: "" });
  const [checks, setChecks] = useState({ esign: false, terms: false, cancel: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = "Purchase Agreement · Texas Cemetery Brokers"; }, []);
  const load = useCallback(async () => {
    try {
      const v = await paCall<View>({ action: "get", token });
      setView(v); setF(v.fields); setTyped((t) => t || v.fields.purchaser.names);
      setHash(await documentFingerprint(v.fields, v.terms_version));
    } catch (e) { setErr((e as Error).message); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => (f ? chargeTotals(f.charges) : null), [f]);
  const setP = (k: keyof AgreementFields["purchaser"], v: string) => setF((x) => x && { ...x, purchaser: { ...x.purchaser, [k]: v } });
  const setD = (k: keyof AgreementFields["deed"], v: string | boolean) => setF((x) => x && { ...x, deed: { ...x.deed, [k]: v } });

  if (err) return <Shell><div className="rounded-xl border border-border bg-card p-8 text-center"><p className="text-foreground">{err}</p></div></Shell>;
  if (!view || !f || !totals) return <Shell><div className="py-24 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></Shell>;

  const signable = view.status === "sent" || view.status === "viewed";
  const missing: string[] = [];
  if (signable) {
    if (!f.purchaser.names.trim()) missing.push("your name");
    if (!/^\S+@\S+\.\S+$/.test(f.purchaser.email.trim())) missing.push("a valid email");
    if (!f.purchaser.address.trim()) missing.push("your address");
    if (!f.deed.same_as_purchaser && !f.deed.names.trim()) missing.push("deed holder name(s)");
    if (!initials.rules.trim() || !initials.verification.trim()) missing.push("both sets of initials");
    if (!checks.terms || !checks.cancel || !checks.esign) missing.push("both confirmations");
    if (typed.trim().length < 2) missing.push("your full legal name");
    if (!sig) missing.push("your signature");
  }

  const submit = async () => {
    if (missing.length) { toast.error(`Please add ${missing.join(", ")}.`); return; }
    setBusy(true);
    try {
      await paCall({
        action: "sign", token, hash_seen: hash, typed_name: typed.trim(), signature: sig, initials,
        esign_consent: true, read_terms: true, cancellation_read: true,
        purchaser: { names: f.purchaser.names, email: f.purchaser.email, address: f.purchaser.address, phone: f.purchaser.phone, dob: f.purchaser.dob, marital_status: f.purchaser.marital_status },
        deed: { same_as_purchaser: f.deed.same_as_purchaser, holder2: f.deed.holder2, names: f.deed.names, address: f.deed.address, phone: f.deed.phone, email: f.deed.email, dob: f.deed.dob, marital_status: f.deed.marital_status },
      });
      toast.success("Signed — thank you.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      await load();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const download = async () => {
    try { const { url } = await paCall<{ url: string }>({ action: "download", token }); window.open(url, "_blank", "noopener"); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Shell>
      <header className="text-center space-y-2 mb-8">
        <p className="text-[11px] tracking-[0.3em] uppercase text-muted-foreground">Texas Cemetery Brokers</p>
        <h1 className="font-serif text-4xl sm:text-5xl text-foreground">Purchase Agreement</h1>
        <p className="text-sm text-muted-foreground">{f.property.cemetery}{f.property.city ? ` · ${f.property.city}` : ""}</p>
      </header>

      {view.status === "buyer_signed" && <Banner icon={CheckCircle2} title="Thank you — your agreement is signed">We've emailed you a confirmation. Our team will countersign shortly and send you the completed agreement with a secure payment link.</Banner>}
      {view.status === "countersigned" && (
        <Banner icon={CreditCard} title="Your agreement is complete — payment is the last step">
          <div className="flex flex-wrap gap-3 mt-3">
            {view.payment_url && <Button asChild><a href={view.payment_url}>Pay {money(totals.totalDue)} securely</a></Button>}
            <Button variant="outline" onClick={download}><Download className="w-4 h-4 mr-2" />Download executed copy</Button>
          </div>
        </Banner>
      )}
      {view.status === "paid" && (
        <Banner icon={CheckCircle2} title="Paid — thank you">Your payment has been received. We're now filing the transfer with the cemetery and will keep you updated.
          <div className="mt-3"><Button variant="outline" onClick={download}><Download className="w-4 h-4 mr-2" />Download executed copy</Button></div>
        </Banner>
      )}

      <div className="space-y-6">
        <p className="text-sm text-muted-foreground leading-relaxed">The Undersigned, hereafter referred to as “Purchaser”, hereby agrees to purchase the following interment property, services and/or commodities. Please fill in the white boxes with your details. Grey boxes marked <Lock className="inline w-3 h-3" /> Locked were prepared by Texas Cemetery Brokers and cannot be edited — if anything looks wrong, call (214) 230-4740 before signing.</p>

        <Section n="1" title="Purchaser details">
          {!signable && <><Row k="Name(s)" v={f.purchaser.names} /><Row k="Email" v={f.purchaser.email} /></>}
          {signable ? (
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <Field label="Full name(s) *" value={f.purchaser.names} onChange={(v) => setP("names", v)} />
              <Field label="Email *" type="email" value={f.purchaser.email} onChange={(v) => setP("email", v)} />
              <Field label="Mailing address *" value={f.purchaser.address} onChange={(v) => setP("address", v)} className="sm:col-span-2" />
              <Field label="Telephone" value={f.purchaser.phone} onChange={(v) => setP("phone", v)} />
              <Field label="Date of birth" type="date" value={f.purchaser.dob} onChange={(v) => setP("dob", v)} />
              <Field label="Marital status" value={f.purchaser.marital_status} onChange={(v) => setP("marital_status", v)} />
            </div>
          ) : (<><Row k="Address" v={f.purchaser.address} /><Row k="Telephone" v={f.purchaser.phone} /><Row k="Date of birth" v={f.purchaser.dob} /><Row k="Marital status" v={f.purchaser.marital_status} /></>)}
        </Section>

        <Section n="2" title="Interment property">
          <LockedNote />
          <Row k="Cemetery" v={f.property.cemetery} locked />
          <Row k="City" v={f.property.city} locked />
          <Row k="Property description" v={f.property.description} locked />
          <Row k="Number of spaces" v={f.property.spaces} locked />
          <Row k="Property type" v={f.property.property_type} locked />
          <Row k="Additional commodities" v={f.property.commodities || "None"} locked />
        </Section>

        <Section n="3" title="Persons the property will be deeded to">
          {signable ? (
            <div className="space-y-4">
              <label className="flex items-center gap-3 text-sm"><Checkbox checked={f.deed.same_as_purchaser} onCheckedChange={(c) => setD("same_as_purchaser", !!c)} />Deed holder #1 is the Purchaser ({f.purchaser.names})</label>
              {!f.deed.same_as_purchaser && (
                <div className="grid sm:grid-cols-2 gap-4 rounded-lg bg-muted/40 p-4">
                  <Field label="Deed holder name(s) *" value={f.deed.names} onChange={(v) => setD("names", v)} className="sm:col-span-2" />
                  <Field label="Address" value={f.deed.address} onChange={(v) => setD("address", v)} className="sm:col-span-2" />
                  <Field label="Telephone" value={f.deed.phone} onChange={(v) => setD("phone", v)} />
                  <Field label="Email" value={f.deed.email} onChange={(v) => setD("email", v)} />
                  <Field label="Date of birth" type="date" value={f.deed.dob} onChange={(v) => setD("dob", v)} />
                  <Field label="Marital status" value={f.deed.marital_status} onChange={(v) => setD("marital_status", v)} />
                </div>
              )}
              <Field label="(Optional) Deed holder #2 name" value={f.deed.holder2} onChange={(v) => setD("holder2", v)} />
            </div>
          ) : (<><Row k="Deed holder #1" v={f.deed.same_as_purchaser ? f.purchaser.names : f.deed.names} /><Row k="Deed holder #2" v={f.deed.holder2} /></>)}
        </Section>

        <Section n="4" title="Schedule of charges">
          <LockedNote />
          <div className="text-sm">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1 mb-1">I. Sale price breakdown</p>
            <Money k="1. Commitment deposit" v={f.charges.deposit} />
            <Money k="2. Balance of property price" v={f.charges.balance} />
            <Money k="3. Total property price (1 + 2)" v={totals.totalProperty} strong />
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-4 mb-1">II. Fees and adjustments</p>
            <Money k="4. Cemetery transfer fee" v={f.charges.transfer_fee} />
            <Money k={`5. Adjustments${f.charges.adjustments_note ? ` — ${f.charges.adjustments_note}` : ""}`} v={f.charges.adjustments} />
            <div className="mt-4 rounded-lg bg-primary/10 px-4 py-3 flex items-center justify-between">
              <span className="font-serif text-lg text-foreground">6. Total amount due</span>
              <span className="font-serif text-2xl text-primary">{money(totals.totalDue)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Payable by secure card link after we countersign, or by certified check or wire.</p>
          </div>
        </Section>

        <Section n="5" title="Acknowledgements">
          <div className="space-y-5">
            {ACKNOWLEDGEMENTS.map((a) => (
              <div key={a.key} className="grid sm:grid-cols-[1fr_120px] gap-3 items-end">
                <p className="text-sm leading-relaxed"><strong className="text-foreground">{a.label}.</strong> <span className="text-muted-foreground">{a.text}</span></p>
                {signable ? (
                  <div><Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Initials *</Label>
                    <Input maxLength={6} value={(initials as any)[a.key]} onChange={(e) => setInitials((x) => ({ ...x, [a.key]: e.target.value.toUpperCase() }))} className="font-serif text-lg text-center" /></div>
                ) : <span className="font-serif text-lg text-center">✓</span>}
              </div>
            ))}
          </div>
        </Section>

        <Section n="6" title="Terms and conditions">
          <div className="max-h-[28rem] overflow-y-auto pr-3 space-y-5 text-sm leading-relaxed" tabIndex={0} aria-label="Terms and conditions">
            {TERMS.map((s) => (
              <div key={s.heading}><h3 className="font-serif text-base text-foreground mb-1">{s.heading}</h3>{s.body.map((p, i) => <p key={i} className="text-muted-foreground mb-2">{p}</p>)}</div>
            ))}
            <div><h3 className="font-serif text-base text-foreground mb-1">Notice of cancellation</h3><p className="text-muted-foreground mb-2">{CANCELLATION_NOTICE}</p></div>
          </div>
        </Section>

        {signable && (
          <Section n="7" title="Sign">
            <div className="space-y-5">
              <Confirm checked={checks.terms} onChange={(v) => setChecks((c) => ({ ...c, terms: v, cancel: v }))}>I have read and agree to this Purchase Agreement, including the Schedule of Charges and the Terms and Conditions.</Confirm>
              <Confirm checked={checks.esign} onChange={(v) => setChecks((c) => ({ ...c, esign: v }))}>{ESIGN_CONSENT}</Confirm>
              <Field label="Full legal name *" value={typed} onChange={setTyped} />
              <SignaturePad label="Your signature *" onChange={setSig} />
              {typed.trim() && <p className="font-serif italic text-3xl text-foreground/80 border-b border-border pb-1">{typed}</p>}
              <div className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>When you sign we record your name, email, the date and time, your IP address and device, and a SHA-256 fingerprint of this exact document ({hash.slice(0, 12)}…). These appear on the certificate attached to your executed copy.</span></div>
              <Button size="lg" className="w-full" onClick={submit} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PenLine className="w-4 h-4 mr-2" />}Sign purchase agreement
              </Button>
              {missing.length > 0 && <p className="text-xs text-muted-foreground text-center">Still needed: {missing.join(", ")}.</p>}
            </div>
          </Section>
        )}
        <p className="text-center text-xs text-muted-foreground pb-10">Agreement {view.id.slice(0, 8)} · Terms {view.terms_version} · Questions? (214) 230-4740 · info@texascemeterybrokers.com</p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background"><meta name="robots" content="noindex" /><div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">{children}</div></div>;
}
function Banner({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return <div className="mb-8 rounded-xl border border-primary/30 bg-primary/10 p-5 flex gap-3"><Icon className="w-6 h-6 text-primary shrink-0" /><div><p className="font-serif text-lg text-foreground">{title}</p><div className="text-sm text-muted-foreground mt-1">{children}</div></div></div>;
}
function Field({ label, value, onChange, type = "text", className = "" }: { label: string; value: string; onChange: (v: string) => void; type?: string; className?: string }) {
  return <div className={className}><Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" /></div>;
}
function Money({ k, v, strong }: { k: string; v: number; strong?: boolean }) {
  return <div className={`flex justify-between py-1.5 border-b border-border/40 ${strong ? "font-semibold text-foreground" : "text-muted-foreground"}`}><span>{k}</span><span className="tabular-nums">{money(v)}</span></div>;
}
function Confirm({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return <label className="flex items-start gap-3 text-sm leading-relaxed cursor-pointer"><Checkbox checked={checked} onCheckedChange={(c) => onChange(!!c)} className="mt-0.5" /><span className="text-foreground">{children}</span></label>;
}
