import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, FileText, ShieldCheck, PenLine, Lock, Upload, Smartphone, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const FN_URL = `https://mceguxfdoikjthsrbmzx.supabase.co/functions/v1/sign-contract`;
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZWd1eGZkb2lranRoc3JibXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3OTI4MDYsImV4cCI6MjA5MjM2ODgwNn0.YDuw7oQqllDnunSA0Fv4eENslzol1Lni7n6kfSRa9T0";

type ContractInfo = {
  kind: "listing_agreement" | "poa" | "affidavit_heirship" | "spousal_consent";
  status: string;
  fill_data: Record<string, unknown>;
  pdf_url: string;
  already_signed: boolean;
  submission_id?: string;
};

function SignaturePad({
  onChange, label,
}: { onChange: (dataUrl: string | null) => void; label: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const has = useRef(false);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * (c.width / r.width),
        y: (e.clientY - r.top) * (c.height / r.height),
      };
    };

    const down = (e: PointerEvent) => {
      drawing.current = true; has.current = true;
      const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
    };
    const move = (e: PointerEvent) => {
      if (!drawing.current) return;
      const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke();
    };
    const up = () => {
      drawing.current = false;
      onChange(has.current ? c.toDataURL("image/png") : null);
    };
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [onChange]);

  const clear = () => {
    const c = ref.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    has.current = false;
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="relative rounded-lg border border-border bg-white shadow-inner">
        <canvas
          ref={ref}
          width={720}
          height={160}
          className="w-full h-40 touch-none rounded-lg"
        />
        <div className="pointer-events-none absolute inset-x-6 bottom-6 border-b border-dashed border-muted-foreground/40" />
        <span className="pointer-events-none absolute left-6 bottom-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          Sign above the line
        </span>
      </div>
      <button type="button" onClick={clear} className="text-xs text-muted-foreground underline hover:text-foreground">
        Clear signature
      </button>
    </div>
  );
}

type SellerFields = {
  seller_name: string;
  address: string;
  city_state_zip: string;
  phone: string;
  email: string;
  plot_description: string;
  listing_option: string;
  /** Only used by the "Set your own price" package — the seller's own floor. */
  authorized_min_per_plot: string;
};

const listingOptions = [
  { id: "Starter", tagline: "Essential listing on our marketplace with standard exposure." },
  { id: "Pro", tagline: "Wider marketing, faster time-to-buyer." },
  { id: "Featured", tagline: "Full marketing package with priority placement." },
  { id: "Set your own price", tagline: "Everything in Featured, and you set the minimum price." },
] as const;

export default function SignContract() {
  const { token } = useParams();
  const [info, setInfo] = useState<ContractInfo | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  /** Finished notary-ready PDF, returned when the document is completed. */
  const [finalPdfUrl, setFinalPdfUrl] = useState<string | null>(null);

  const [fields, setFields] = useState<SellerFields>({
    seller_name: "", address: "", city_state_zip: "",
    phone: "", email: "", plot_description: "", listing_option: "Starter",
    authorized_min_per_plot: "",
  });
  // Fields the admin already filled in on the contract — the seller sees them
  // as read-only so they cannot alter details we've verified (name, plots,
  // cemetery, listing option, etc.). The two address fields are always editable
  // because that's what we need the seller to supply.
  const [locked, setLocked] = useState<Record<keyof SellerFields, boolean>>({
    seller_name: false, address: false, city_state_zip: false,
    phone: false, email: false, plot_description: false, listing_option: false,
    authorized_min_per_plot: false,
  });
  const [refreshing, setRefreshing] = useState(false);

  const [initials, setInitials] = useState("");
  const [sig, setSig] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sectionInitials, setSectionInitials] = useState<boolean[]>([false, false, false, false, false]);

  const [submissionId, setSubmissionId] = useState<string>("");
  const [notaryUploading, setNotaryUploading] = useState(false);
  const [notaryUploaded, setNotaryUploaded] = useState(false);
  const notaryInputRef = useRef<HTMLInputElement | null>(null);

  const uploadNotarizedCopy = async (f: File) => {
    if (!submissionId) return;
    setNotaryUploading(true);
    try {
      const ext = (f.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${submissionId}/poa-notarized-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext || "pdf"}`;
      const { error } = await supabase.storage
        .from("portal-uploads")
        .upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
      if (error) throw error;
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ action: "record_poa", path, name: f.name, submission_id: submissionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      setNotaryUploaded(true);
      toast.success("Notarized copy uploaded — our team has been notified.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setNotaryUploading(false);
    }
  };

  // ---- After signing: photo of the paperwork + "originals are in the post" ----
  const [followUploading, setFollowUploading] = useState(false);
  const [followUploaded, setFollowUploaded] = useState(false);
  const [mailingBusy, setMailingBusy] = useState(false);
  const [mailingConfirmed, setMailingConfirmed] = useState(false);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const followInputRef = useRef<HTMLInputElement | null>(null);

  const postFollowUp = async (payload: Record<string, unknown>) => {
    const res = await fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
      body: JSON.stringify({ action: "seller_followup", token, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not save");
    return data;
  };

  const uploadSignedPhoto = async (f: File) => {
    if (!submissionId) return;
    setFollowUploading(true);
    try {
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${submissionId}/signed-docs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext || "jpg"}`;
      const { error } = await supabase.storage
        .from("portal-uploads")
        .upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
      if (error) throw error;
      await postFollowUp({ path, name: f.name });
      setFollowUploaded(true);
      toast.success("Photo received — thank you.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setFollowUploading(false);
    }
  };

  const confirmMailing = async () => {
    setMailingBusy(true);
    try {
      await postFollowUp({ mailing_confirmed: true, carrier, tracking });
      setMailingConfirmed(true);
      toast.success("Thank you — we'll let Bayer Cemetery Brokers know to expect them.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setMailingBusy(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${FN_URL}?token=${token}`, {
          headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load");
        setInfo(data);
        setSubmissionId(data.submission_id ?? "");
        setPdfUrl(data.pdf_url);
        const fd = (data.fill_data ?? {}) as Record<string, string>;
        const next: SellerFields = {
          seller_name: fd.seller_name ?? "",
          address: fd.address ?? "",
          city_state_zip: fd.city_state_zip ?? "",
          phone: fd.phone ?? "",
          email: fd.email ?? "",
          plot_description: fd.plot_description ?? "",
          listing_option: fd.listing_option ?? "Starter",
          authorized_min_per_plot: fd.authorized_min_per_plot != null ? String(fd.authorized_min_per_plot) : "",
        };
        setFields(next);
        // Lock anything the admin pre-filled. Mailing address + city/state/zip
        // are never locked — those are the seller's job to complete.
        setLocked({
          seller_name: !!next.seller_name.trim(),
          address: false,
          city_state_zip: false,
          phone: !!next.phone.trim(),
          email: !!next.email.trim(),
          plot_description: !!next.plot_description.trim(),
          listing_option: !!fd.listing_option,
          authorized_min_per_plot: false,
        });
        setDone(data.already_signed);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Carry the seller straight from a signed listing agreement into the family
  // tree questions instead of waiting on an email.
  useEffect(() => {
    if (!done || info?.kind !== "listing_agreement" || !submissionId) return;
    navigate(`/confirm?s=${submissionId}`, { replace: true });
  }, [done, info?.kind, submissionId, navigate]);

  const ownPrice = /own price/i.test(fields.listing_option);
  const plotsOnContract = Math.max(
    1,
    Number(((info?.fill_data ?? {}) as Record<string, unknown>).plot_count) || 1,
  );

  /** What we actually post to the function: the seller's own price only counts
   *  on the "Set your own price" package, and it drives the contract total. */
  const outboundFields = () => {
    const out: Record<string, unknown> = { ...fields };
    const per = Number(fields.authorized_min_per_plot) || 0;
    if (ownPrice && per > 0) {
      out.authorized_min_per_plot = per;
      out.authorized_min_total = per * plotsOnContract;
    } else {
      delete out.authorized_min_per_plot;
    }
    return out;
  };

  const setField = (k: keyof SellerFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const refreshContract = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ action: "refresh", token, fields: outboundFields() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update contract");
      setPdfUrl(data.pdf_url);
      if (!silent) toast.success("Contract updated with your details");
    } catch (e) {
      if (!silent) toast.error((e as Error).message);
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  const firstLoadRef = useRef(true);
  useEffect(() => {
    if (loading || done) return;
    if (firstLoadRef.current) { firstLoadRef.current = false; return; }
    // Long enough that a half-typed address is never what gets autosaved.
    const t = setTimeout(() => { void refreshContract(true); }, 1800);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.seller_name, fields.address, fields.city_state_zip, fields.phone, fields.email, fields.plot_description, fields.listing_option, fields.authorized_min_per_plot, loading, done]);

  const submit = async () => {
    if (!fields.seller_name.trim()) return toast.error("Enter your full legal name");
    if (!fields.address.trim()) return toast.error("Enter your mailing address");
    if (!fields.city_state_zip.trim()) return toast.error("Enter your city, state, and ZIP");
    if (!fields.phone.trim()) return toast.error("Enter your phone number");
    if (!fields.email.trim()) return toast.error("Enter your email");
    if (!fields.plot_description.trim()) return toast.error("Enter the plot description (section / block / spaces)");
    if (!fields.listing_option) return toast.error("Choose a listing option");
    if (ownPrice && !(Number(fields.authorized_min_per_plot) > 0))
      return toast.error("Enter your own minimum price per space");
    if (!initials.trim() || initials.trim().length < 2) return toast.error("Enter your initials (2+ letters)");
    if (info?.kind === "listing_agreement" && sectionInitials.some((v) => !v))
      return toast.error("Please initial each highlighted section of the agreement");
    if (!sig) return toast.error("Draw your signature");
    if (!consent) return toast.error("Please confirm your consent to sign electronically");

    setBusy(true);
    try {
      await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ action: "refresh", token, fields: outboundFields() }),
      });

      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({
          token,
          signature_name: fields.seller_name.trim(),
          signature_image: sig,
          initials: initials.trim().toUpperCase(),
          consent: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sign failed");
      setDone(true);
      toast.success("Signed! A copy has been emailed to you.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitPoa = async () => {
    if (!fields.address.trim() || !fields.city_state_zip.trim())
      return toast.error("Enter your mailing address and city/state/ZIP");
    setBusy(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({
          action: "poa_finalize",
          token,
          fields: {
            seller_name: fields.seller_name,
            address: fields.address,
            city_state_zip: fields.city_state_zip,
            phone: fields.phone,
            email: fields.email,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not complete document");
      if (data.pdf_url) setFinalPdfUrl(data.pdf_url as string);
      setDone(true);
      toast.success("Your document is ready — next steps are on this page.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f1ea]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f5f1ea]">
        <Card className="p-10 max-w-md text-center">
          <h1 className="text-xl font-serif mb-2">Link not valid</h1>
          <p className="text-muted-foreground">
            {error ?? "This signing link is invalid or has expired. Please contact Texas Cemetery Brokers."}
          </p>
        </Card>
      </div>
    );
  }

  const isNotaryDoc = info.kind === "poa" || info.kind === "affidavit_heirship" || info.kind === "spousal_consent";
  const title = info.kind === "poa"
    ? "Limited Special Power of Attorney"
    : info.kind === "affidavit_heirship"
      ? "Affidavit of Heirship"
      : info.kind === "spousal_consent"
        ? "Spousal Consent and Waiver"
        : "Exclusive Right-to-Sell Agreement";

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      {/* Masthead */}
      <div className="bg-[#1f2a37] text-white">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col items-center text-center">
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#d9c7a3]">Texas Cemetery Brokers</p>
          <h1 className="mt-3 text-3xl md:text-4xl font-serif">{title}</h1>
          <p className="mt-3 text-sm text-white/70 max-w-xl">
            A private, secure signing session for {isNotaryDoc ? `your notary-ready ${title}` : "your listing agreement"}.
            Fill in the details on the left, review the live contract, then sign at the bottom.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-[11px] text-white/70">
            <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Encrypted signing session</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> E-Sign Act &amp; Texas UETA compliant</span>
            <span className="inline-flex items-center gap-1.5"><PenLine className="h-3.5 w-3.5" /> Tamper-evident audit trail</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 space-y-8">
        {!done && (
          <Card className="p-8 md:p-10 bg-white border-border/70 shadow-sm">
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Step 1</span>
              <h2 className="text-xl font-serif">Confirm your details</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
              The details we already have on file are shown below and locked — please review them for accuracy.
              Only your <strong>mailing address</strong> is editable; if anything else looks wrong, reply to the
              email that sent you this link and we'll update it for you.
            </p>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <Label>Full legal name</Label>
                <Input value={fields.seller_name} onChange={setField("seller_name")} readOnly={locked.seller_name} disabled={locked.seller_name} />
              </div>
              <div className="md:col-span-2">
                <Label>Mailing address <span className="text-[10px] uppercase tracking-widest text-[#8a6d3b] ml-1">Required</span></Label>
                <Input value={fields.address} onChange={setField("address")} placeholder="1234 Example Street" autoFocus />
              </div>
              <div>
                <Label>City, State, ZIP <span className="text-[10px] uppercase tracking-widest text-[#8a6d3b] ml-1">Required</span></Label>
                <Input value={fields.city_state_zip} onChange={setField("city_state_zip")} placeholder="Austin, TX 78701" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={fields.phone} onChange={setField("phone")} readOnly={locked.phone} disabled={locked.phone} />
              </div>
              <div className="md:col-span-2">
                <Label>Email</Label>
                <Input value={fields.email} onChange={setField("email")} type="email" readOnly={locked.email} disabled={locked.email} />
              </div>
              <div className="md:col-span-2">
                <Label>Plot description (section / block / spaces)</Label>
                <Input value={fields.plot_description} onChange={setField("plot_description")} readOnly={locked.plot_description} disabled={locked.plot_description} />
              </div>
              {info.kind === "listing_agreement" && (
                <div className="md:col-span-2 space-y-3 pt-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Listing option {locked.listing_option && <span className="normal-case tracking-normal text-muted-foreground/80">— set by Texas Cemetery Brokers</span>}
                  </Label>
                  <div className="grid sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Listing option">
                    {listingOptions.map(({ id, tagline }) => {
                      const selected = fields.listing_option === id;
                      const disabled = locked.listing_option && !selected;
                      return (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={disabled}
                          onClick={() => { if (!locked.listing_option) setFields((f) => ({ ...f, listing_option: id })); }}
                          className={`rounded-xl border p-4 text-left transition-all ${
                            selected
                              ? "border-[#1f2a37] bg-[#1f2a37] text-white shadow-md"
                              : disabled
                              ? "border-border bg-muted/40 opacity-50 cursor-not-allowed"
                              : "border-border bg-background hover:border-[#1f2a37]/40 hover:bg-muted/40"
                          }`}
                        >
                          <span className="block text-sm font-serif text-base">{id}</span>
                          <span className={`block text-[11px] mt-1 leading-snug ${selected ? "text-white/70" : "text-muted-foreground"}`}>
                            {tagline}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {ownPrice && (
                    <div className="rounded-xl border border-[#8a6d3b]/40 bg-[#8a6d3b]/5 p-4">
                      <Label>
                        Your own minimum price per space
                        <span className="text-[10px] uppercase tracking-widest text-[#8a6d3b] ml-2">Set your own price</span>
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="50"
                        value={fields.authorized_min_per_plot}
                        onChange={setField("authorized_min_per_plot")}
                        placeholder="e.g. 5200"
                      />
                      <p className="text-[11px] text-muted-foreground mt-2">
                        This replaces our suggested figure in the agreement. Across {plotsOnContract} space
                        {plotsOnContract === 1 ? "" : "s"} that is an authorized minimum of{" "}
                        <strong className="text-foreground">
                          {(((Number(fields.authorized_min_per_plot) || 0) * plotsOnContract) || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}
                        </strong>
                        . We will never sell below it.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <Button
                onClick={() => refreshContract(false)}
                disabled={refreshing}
                variant="outline"
                className="border-[#1f2a37]/30"
              >
                {refreshing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Refresh preview now
              </Button>
              <p className="text-xs text-muted-foreground">The preview below fills in automatically as you type.</p>
            </div>
          </Card>
        )}

        <Card className="overflow-hidden bg-white border-border/70 shadow-sm">
          <div className="flex items-center justify-between px-6 py-3 border-b bg-[#f5f1ea]/60">
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Step 2</span>
              <h2 className="text-sm font-serif flex items-center gap-2">
                <FileText className="h-4 w-4" /> Review the full contract
              </h2>
            </div>
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline hover:text-foreground">
              Open in new tab
            </a>
          </div>
          <iframe
            key={pdfUrl}
            title="Contract"
            src={pdfUrl}
            className="w-full h-[75vh] bg-background"
          />
        </Card>

        {done ? (
          isNotaryDoc ? (
            <Card className="p-8 md:p-10 bg-white border-emerald-300 shadow-sm space-y-7">
              <div className="text-center">
                <CheckCircle2 className="h-11 w-11 text-emerald-600 mx-auto mb-3" />
                <h2 className="text-2xl font-serif text-[#1f2a37]">Your {title} is complete and filled in.</h2>
                <p className="text-sm text-muted-foreground mt-3 max-w-xl mx-auto">
                  Everything you need is right here — download it, then choose one of the two ways below to have it
                  notarized. We've also emailed a copy with these same instructions
                  {fields.email ? <> to <strong>{fields.email}</strong></> : null}, so nothing is lost.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#1f2a37] hover:bg-[#111827] text-white px-8 h-12"
                  disabled={!finalPdfUrl}
                >
                  <a href={finalPdfUrl ?? pdfUrl} target="_blank" rel="noreferrer" download>
                    Download your {title} (PDF)
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 border-[#1f2a37]/30">
                  <a href={finalPdfUrl ?? pdfUrl} target="_blank" rel="noreferrer">Open in a new tab</a>
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border p-6 bg-[#fbf8f2] flex flex-col">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-[#8a6d3b] mb-1">Option 1 — fastest</div>
                  <div className="font-serif text-lg mb-2">Notarize online in about 15 minutes</div>
                  <ol className="text-xs text-muted-foreground leading-relaxed space-y-1.5 list-decimal pl-4 flex-1">
                    <li>Download the PDF above.</li>
                    <li>Open the notary link below and upload that PDF.</li>
                    <li>Meet a commissioned notary over video from your phone with a photo ID (about $25).</li>
                    <li>Email the notarized copy back to us, or reply to our email with it attached.</li>
                  </ol>
                  <Button asChild className="mt-4 bg-[#1f2a37] hover:bg-[#111827] text-white">
                    <a href="https://app.proof.com/signup/upload" target="_blank" rel="noreferrer">
                      Start online notarization →
                    </a>
                  </Button>
                </div>
                <div className="rounded-xl border border-border p-6 flex flex-col">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-[#8a6d3b] mb-1">Option 2 — in person</div>
                  <div className="font-serif text-lg mb-2">Any local notary works</div>
                  <ol className="text-xs text-muted-foreground leading-relaxed space-y-1.5 list-decimal pl-4 flex-1">
                    <li>Print the downloaded PDF — do not sign it yet.</li>
                    <li>Take it, with your photo ID, to your bank, a UPS Store, AAA branch, courthouse or public library.</li>
                    <li>Sign it in front of the notary.</li>
                    <li>Photograph or scan every page and email it to us.</li>
                  </ol>
                  <Button asChild variant="outline" className="mt-4 border-[#1f2a37]/30">
                    <a href="https://www.google.com/maps/search/notary+public+near+me" target="_blank" rel="noreferrer">
                      Find a notary near me →
                    </a>
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-[#1f2a37]/20 bg-[#f7f3ec] p-6">
                <div className="text-[10px] uppercase tracking-[0.3em] text-[#8a6d3b] mb-3 text-center">When you have the notarized copy</div>
                {notaryUploaded ? (
                  <div className="text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                    <p className="text-sm font-medium text-[#1f2a37]">Your notarized {title} is back with us.</p>
                    <p className="text-xs text-muted-foreground mt-1">Our team has been notified and will review it shortly.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-[1fr_1px_1fr] gap-6 items-stretch">
                    <div className="text-center">
                      <div className="w-10 h-10 rounded-full bg-[#1f2a37] text-white flex items-center justify-center mx-auto mb-3">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="font-serif text-[#1f2a37] mb-1">Upload it here</p>
                      <p className="text-xs text-muted-foreground mb-4">Fastest — a photo or PDF of every page is fine.</p>
                      <input
                        ref={notaryInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadNotarizedCopy(f); }}
                      />
                      <Button
                        onClick={() => notaryInputRef.current?.click()}
                        disabled={notaryUploading}
                        className="bg-[#1f2a37] hover:bg-[#111827] text-white"
                      >
                        {notaryUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {notaryUploading ? "Uploading…" : "Upload notarized copy"}
                      </Button>
                    </div>
                    <div className="hidden md:block w-px bg-[#1f2a37]/10" />
                    <div className="text-center">
                      <div className="w-10 h-10 rounded-full bg-[#1f2a37]/10 text-[#1f2a37] flex items-center justify-center mx-auto mb-3">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <p className="font-serif text-[#1f2a37] mb-1">Send it from your phone</p>
                      <p className="text-xs text-muted-foreground mb-4">Open your document page on your phone and photograph it.</p>
                      <Button asChild variant="outline" className="border-[#1f2a37]/30">
                        <a href={`/documents?s=${submissionId}`} target="_blank" rel="noreferrer">
                          Open phone upload page →
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-5 text-center">
                  Any questions — call <a href="tel:+12142304740" className="underline text-[#1f2a37]">(214) 230-4740</a> or
                  email <a href="mailto:info@texascemeterybrokers.com" className="underline text-[#1f2a37]">info@texascemeterybrokers.com</a>.
                </p>
              </div>
            </Card>
          ) : info?.kind === "listing_agreement" ? (
            <Card className="p-10 text-center border-emerald-300 bg-emerald-50">
              <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
              <h2 className="text-2xl font-serif text-emerald-900">Signature recorded — taking you to the family tree…</h2>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="p-10 text-center border-emerald-300 bg-emerald-50">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
                <h2 className="text-2xl font-serif text-emerald-900">Thank you — your signature is recorded.</h2>
                <p className="text-sm text-emerald-800 mt-3 max-w-md mx-auto">
                  A copy has been emailed to you. Texas Cemetery Brokers will countersign and send you the fully executed document shortly.
                </p>
              </Card>


              {!!info && (
              <Card className="p-8 md:p-10 bg-white border-border/70 shadow-sm space-y-8">
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-[#8a6d3b] mb-2">Two last things</div>
                  <h3 className="text-xl font-serif text-[#1f2a37]">Send us a photo, then post the originals</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
                    A photo lets us start work today, and telling us the originals are on their way means we can ask
                    Bayer Cemetery Brokers — our partner who stores originals securely — to watch out for your envelope.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="rounded-xl border border-[#1f2a37]/15 bg-[#fbf8f2] p-6 text-center">
                    <div className="w-10 h-10 rounded-full bg-[#1f2a37] text-white flex items-center justify-center mx-auto mb-3">
                      {followUploaded ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                    </div>
                    <p className="font-serif text-[#1f2a37] mb-1">1. Photograph the signed documents</p>
                    {followUploaded ? (
                      <p className="text-xs text-emerald-700 mt-2">Received — it's saved to your file with us.</p>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground mb-4">A clear phone photo or scan of every page is fine.</p>
                        <input
                          ref={followInputRef}
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadSignedPhoto(f); }}
                        />
                        <Button
                          onClick={() => followInputRef.current?.click()}
                          disabled={followUploading}
                          className="bg-[#1f2a37] hover:bg-[#111827] text-white"
                        >
                          {followUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {followUploading ? "Uploading…" : "Upload photo"}
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#1f2a37]/15 bg-[#fbf8f2] p-6">
                    <div className="w-10 h-10 rounded-full bg-[#1f2a37]/10 text-[#1f2a37] flex items-center justify-center mx-auto mb-3">
                      {mailingConfirmed ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Smartphone className="w-5 h-5" />}
                    </div>
                    <p className="font-serif text-[#1f2a37] mb-1 text-center">2. Post the originals</p>
                    <div className="text-xs text-muted-foreground text-center leading-relaxed mb-4">
                      Mail every original (ID excepted) to:
                      <div className="mt-2 text-[#1f2a37] font-medium not-italic">
                        Bayer Cemetery Brokers<br />100 N Brand Blvd, Ste 213<br />Glendale, CA 91203
                      </div>
                    </div>
                    {mailingConfirmed ? (
                      <p className="text-xs text-emerald-700 text-center">
                        Thank you — Bayer Cemetery Brokers has been told to expect your envelope.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Carrier (USPS, FedEx…) — optional" />
                        <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number — optional" />
                        <Button onClick={() => void confirmMailing()} disabled={mailingBusy} variant="outline" className="w-full border-[#1f2a37]/30">
                          {mailingBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          I've posted the originals
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Any questions — call <a href="tel:+12142304740" className="underline text-[#1f2a37]">(214) 230-4740</a> or
                  email <a href="mailto:info@texascemeterybrokers.com" className="underline text-[#1f2a37]">info@texascemeterybrokers.com</a>.
                </p>
              </Card>
              )}
            </div>
          )
        ) : isNotaryDoc ? (
          <Card className="p-8 md:p-10 bg-white border-border/70 shadow-sm space-y-6">
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Step 3</span>
              <h2 className="text-xl font-serif">Finish your document</h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Because the {title} is a sworn document, Texas law requires it to be <strong>notarized</strong>. Click below and
              we'll finish the document with your details — you'll then be able to download it and follow the notary steps
              right here on this page. We'll email you a copy as well, just in case.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border p-5 bg-[#fbf8f2]">
                <div className="text-[10px] uppercase tracking-[0.3em] text-[#8a6d3b] mb-1">Fastest</div>
                <div className="font-serif text-base mb-1">Notarize online in ~15 min</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Meet a commissioned notary over video from your phone. You'll need a photo ID and about $25.
                  The direct link appears on the next screen.
                </p>
              </div>
              <div className="rounded-xl border border-border p-5">
                <div className="text-[10px] uppercase tracking-[0.3em] text-[#8a6d3b] mb-1">In person</div>
                <div className="font-serif text-base mb-1">Any local notary works</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Print the PDF and take it to your bank, a UPS Store, AAA branch, courthouse, or public library.
                  Bring photo ID.
                </p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-2">
              <p className="text-[11px] text-muted-foreground max-w-sm">
                Your finished PDF appears here to download straight away, and is emailed
                to <strong>{fields.email || "your address on file"}</strong> as a backup.
              </p>
              <Button
                onClick={submitPoa}
                disabled={busy}
                size="lg"
                className="bg-[#1f2a37] hover:bg-[#111827] text-white px-8 h-12"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Finish &amp; get my document
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-8 md:p-10 bg-white border-border/70 shadow-sm space-y-6">
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Step 3</span>
              <h2 className="text-xl font-serif">Sign this document</h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              By typing your name and drawing your signature you agree that your electronic signature is legally binding —
              equivalent to a handwritten signature under the U.S. E-Sign Act and Texas UETA. Your initials will be applied
              to every required section of the contract.
            </p>

            <div className="grid md:grid-cols-[200px_1fr] gap-6 items-start">
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Your initials</Label>
                <Input
                  value={initials}
                  onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 4))}
                  placeholder="e.g. AJ"
                  className="text-center font-serif text-xl tracking-widest h-14"
                />
                <p className="text-[11px] text-muted-foreground mt-2">Stamped onto every page of the contract.</p>
              </div>
              <SignaturePad label="Your signature" onChange={setSig} />
            </div>

            {info?.kind === "listing_agreement" && (
              <div className="rounded-lg border border-border bg-white p-5 space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Section acknowledgements</div>
                    <p className="text-sm font-serif mt-1">Initial each section below to affirm you've read and agree to it.</p>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {sectionInitials.filter(Boolean).length} / {sectionInitials.length} initialed
                  </div>
                </div>
                <ul className="divide-y divide-border/70">
                  {[
                    "Authorized Minimum Price — I set the minimum acceptable price and understand the broker may not accept less without my consent.",
                    "Sales At or Above Minimum — I authorize the broker to accept any offer at or above the authorized minimum without further approval.",
                    "Buyer-Paid Broker Charges (Section 2.2) — I acknowledge the broker may collect additional buyer-paid charges on top of the Gross Sale Price, that these charges are earned by and belong to the broker, and that they do not reduce my Net Proceeds.",
                    "Warranty of Ownership — I warrant that I am the lawful owner of the interment property described and have full authority to sell.",
                    "Warranty of Condition — I warrant that the interment property is free of encumbrances and has not been previously used for burial.",
                  ].map((label, i) => {
                    const done = sectionInitials[i];
                    const canInitial = initials.trim().length >= 2;
                    return (
                      <li key={i} className="flex items-start gap-4 py-3">
                        <div className="flex-1 text-sm text-foreground/90 leading-relaxed">{label}</div>
                        <button
                          type="button"
                          disabled={!canInitial || done}
                          onClick={() =>
                            setSectionInitials((s) => s.map((v, idx) => (idx === i ? true : v)))
                          }
                          className={`min-w-[92px] h-10 px-3 rounded-md text-xs font-serif tracking-widest border transition ${
                            done
                              ? "bg-[#1f2a37] text-white border-[#1f2a37]"
                              : canInitial
                              ? "bg-white text-[#1f2a37] border-[#1f2a37] hover:bg-[#1f2a37] hover:text-white"
                              : "bg-muted text-muted-foreground border-border cursor-not-allowed"
                          }`}
                        >
                          {done ? initials.trim().toUpperCase() : "Initial"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {initials.trim().length < 2 && (
                  <p className="text-[11px] text-muted-foreground">Enter your initials above to enable these buttons.</p>
                )}
              </div>
            )}

            <div className="rounded-lg border border-border bg-[#f5f1ea]/50 p-5 text-sm">
              <label className="flex gap-3 items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-[#1f2a37]"
                />
                <span className="leading-relaxed">
                  I have reviewed the entire document above. I agree my electronic signature and initials are the legal
                  equivalent of a handwritten signature under the U.S. E-Sign Act (15 U.S.C. §§ 7001+) and the Texas
                  Uniform Electronic Transactions Act. I consent to receive records of this transaction electronically.
                </span>
              </label>
            </div>

            {(() => {
              const allFilled =
                fields.seller_name.trim() &&
                fields.address.trim() &&
                fields.city_state_zip.trim() &&
                fields.phone.trim() &&
                fields.email.trim() &&
                fields.plot_description.trim() &&
                fields.listing_option;
              const sectionsOk = info?.kind !== "listing_agreement" || sectionInitials.every(Boolean);
              const ready = allFilled && initials.trim().length >= 2 && sig && consent && sectionsOk;
              return (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-2">
                  <p className="text-[11px] text-muted-foreground max-w-sm">
                    {allFilled
                      ? (info?.kind === "listing_agreement"
                          ? <>A fully signed PDF is emailed to you straight away, then we take you to the family tree — the final step before broker review and documents.</>
                          : <>A fully signed PDF will be emailed to you the moment you click <em>Sign &amp; submit</em>.</>)
                      : <>Please complete every field in Step 1 before signing.</>}
                  </p>
                  <Button
                    onClick={submit}
                    disabled={busy || !ready}
                    size="lg"
                    className="bg-[#1f2a37] hover:bg-[#111827] text-white px-8 h-12"
                  >
                    {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {info?.kind === "listing_agreement"
                      ? "Sign & complete last step (family tree)"
                      : "Sign & submit"}
                  </Button>
                </div>
              );
            })()}
          </Card>
        )}

        <footer className="text-center text-[11px] text-muted-foreground py-6">
          Texas Cemetery Brokers · www.texascemeterybrokers.com · Secure signing powered by our in-house e-signature platform.
        </footer>
      </div>
    </div>
  );
}
