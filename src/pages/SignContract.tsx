import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, FileText, ShieldCheck, PenLine, Lock } from "lucide-react";

const FN_URL = `https://mceguxfdoikjthsrbmzx.supabase.co/functions/v1/sign-contract`;
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZWd1eGZkb2lranRoc3JibXp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3OTI4MDYsImV4cCI6MjA5MjM2ODgwNn0.YDuw7oQqllDnunSA0Fv4eENslzol1Lni7n6kfSRa9T0";

type ContractInfo = {
  kind: "listing_agreement" | "poa";
  status: string;
  fill_data: Record<string, unknown>;
  pdf_url: string;
  already_signed: boolean;
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
};

const listingOptions = [
  { id: "Starter", tagline: "Essential listing on our marketplace with standard exposure." },
  { id: "Pro", tagline: "Wider marketing, faster time-to-buyer." },
  { id: "Featured", tagline: "Full marketing package with priority placement." },
] as const;

export default function SignContract() {
  const { token } = useParams();
  const [info, setInfo] = useState<ContractInfo | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [fields, setFields] = useState<SellerFields>({
    seller_name: "", address: "", city_state_zip: "",
    phone: "", email: "", plot_description: "", listing_option: "Starter",
  });
  const [refreshing, setRefreshing] = useState(false);

  const [initials, setInitials] = useState("");
  const [sig, setSig] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${FN_URL}?token=${token}`, {
          headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load");
        setInfo(data);
        setPdfUrl(data.pdf_url);
        const fd = (data.fill_data ?? {}) as Record<string, string>;
        setFields({
          seller_name: fd.seller_name ?? "",
          address: fd.address ?? "",
          city_state_zip: fd.city_state_zip ?? "",
          phone: fd.phone ?? "",
          email: fd.email ?? "",
          plot_description: fd.plot_description ?? "",
          listing_option: fd.listing_option ?? "Starter",
        });
        setDone(data.already_signed);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const setField = (k: keyof SellerFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const refreshContract = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ action: "refresh", token, fields }),
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
    const t = setTimeout(() => { void refreshContract(true); }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.seller_name, fields.address, fields.city_state_zip, fields.phone, fields.email, fields.plot_description, fields.listing_option, loading, done]);

  const submit = async () => {
    if (!fields.seller_name.trim()) return toast.error("Enter your full legal name");
    if (!fields.address.trim() || !fields.city_state_zip.trim())
      return toast.error("Enter your address and city/state/ZIP");
    if (!initials.trim() || initials.trim().length < 2) return toast.error("Enter your initials (2+ letters)");
    if (!sig) return toast.error("Draw your signature");
    if (!consent) return toast.error("Please confirm your consent to sign electronically");

    setBusy(true);
    try {
      await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ action: "refresh", token, fields }),
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
      if (!res.ok) throw new Error(data.error ?? "Could not send packet");
      setDone(true);
      toast.success("Notary packet emailed to you — check your inbox.");
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

  const title = info.kind === "poa"
    ? "Limited Special Power of Attorney"
    : "Exclusive Right-to-Sell Agreement";

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      {/* Masthead */}
      <div className="bg-[#1f2a37] text-white">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col items-center text-center">
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#d9c7a3]">Texas Cemetery Brokers</p>
          <h1 className="mt-3 text-3xl md:text-4xl font-serif">{title}</h1>
          <p className="mt-3 text-sm text-white/70 max-w-xl">
            A private, secure signing session for {info.kind === "poa" ? "your notary-ready Power of Attorney" : "your listing agreement"}.
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
              These details will fill directly into the contract as you type. Take a moment to make sure everything is exactly as you want it on the record.
            </p>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <Label>Full legal name</Label>
                <Input value={fields.seller_name} onChange={setField("seller_name")} />
              </div>
              <div className="md:col-span-2">
                <Label>Mailing address</Label>
                <Input value={fields.address} onChange={setField("address")} placeholder="1234 Example Street" />
              </div>
              <div>
                <Label>City, State, ZIP</Label>
                <Input value={fields.city_state_zip} onChange={setField("city_state_zip")} placeholder="Austin, TX 78701" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={fields.phone} onChange={setField("phone")} />
              </div>
              <div className="md:col-span-2">
                <Label>Email</Label>
                <Input value={fields.email} onChange={setField("email")} type="email" />
              </div>
              <div className="md:col-span-2">
                <Label>Plot description (section / block / spaces)</Label>
                <Input value={fields.plot_description} onChange={setField("plot_description")} />
              </div>
              {info.kind === "listing_agreement" && (
                <div className="md:col-span-2 space-y-3 pt-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Choose your listing option</Label>
                  <div className="grid sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Listing option">
                    {listingOptions.map(({ id, tagline }) => {
                      const selected = fields.listing_option === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setFields((f) => ({ ...f, listing_option: id }))}
                          className={`rounded-xl border p-4 text-left transition-all ${
                            selected
                              ? "border-[#1f2a37] bg-[#1f2a37] text-white shadow-md"
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
          <Card className="p-10 text-center border-emerald-300 bg-emerald-50">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
            {info.kind === "poa" ? (
              <>
                <h2 className="text-2xl font-serif text-emerald-900">Your notary packet is on its way.</h2>
                <p className="text-sm text-emerald-800 mt-3 max-w-md mx-auto">
                  We've emailed you the finished Power of Attorney PDF along with a one-click link to notarize
                  it online, plus instructions if you'd rather use a local notary in person.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-serif text-emerald-900">Thank you — your signature is recorded.</h2>
                <p className="text-sm text-emerald-800 mt-3 max-w-md mx-auto">
                  A copy has been emailed to you. Texas Cemetery Brokers will countersign and send you the fully executed document shortly.
                </p>
              </>
            )}
          </Card>
        ) : info.kind === "poa" ? (
          <Card className="p-8 md:p-10 bg-white border-border/70 shadow-sm space-y-6">
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Step 3</span>
              <h2 className="text-xl font-serif">Get your notary packet</h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Because a Power of Attorney authorises us to sign transfer paperwork on your behalf, Texas law
              requires it to be <strong>notarized</strong>. Once you click below, we'll email you the finished
              PDF along with two easy ways to get it notarized:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border p-5 bg-[#fbf8f2]">
                <div className="text-[10px] uppercase tracking-[0.3em] text-[#8a6d3b] mb-1">Fastest</div>
                <div className="font-serif text-base mb-1">Notarize online in ~15 min</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Meet a commissioned notary over video from your phone. You'll need a photo ID and about $25.
                  We'll include a direct link in the email.
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
                The PDF will be emailed to <strong>{fields.email || "your address on file"}</strong> the moment you click.
              </p>
              <Button
                onClick={submitPoa}
                disabled={busy}
                size="lg"
                className="bg-[#1f2a37] hover:bg-[#111827] text-white px-8 h-12"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Email me my notary packet
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

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-2">
              <p className="text-[11px] text-muted-foreground max-w-sm">
                A fully signed PDF will be emailed to you the moment you click <em>Sign &amp; submit</em>.
              </p>
              <Button
                onClick={submit}
                disabled={busy}
                size="lg"
                className="bg-[#1f2a37] hover:bg-[#111827] text-white px-8 h-12"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Sign &amp; submit
              </Button>
            </div>
          </Card>
        )}

        <footer className="text-center text-[11px] text-muted-foreground py-6">
          Texas Cemetery Brokers · www.texascemeterybrokers.com · Secure signing powered by our in-house e-signature platform.
        </footer>
      </div>
    </div>
  );
}
