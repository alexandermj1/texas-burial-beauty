import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, FileText } from "lucide-react";

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
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const down = (e: PointerEvent) => {
      drawing.current = true;
      has.current = true;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    };
    const move = (e: PointerEvent) => {
      if (!drawing.current) return;
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
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
      <Label>{label}</Label>
      <canvas
        ref={ref}
        width={520}
        height={140}
        className="w-full max-w-lg h-36 border-2 border-dashed rounded-md bg-background touch-none"
      />
      <button type="button" onClick={clear} className="text-xs text-muted-foreground underline">
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
  co_owner_name: string;
  plot_description: string;
};

export default function SignContract() {
  const { token } = useParams();
  const [info, setInfo] = useState<ContractInfo | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [fields, setFields] = useState<SellerFields>({
    seller_name: "", address: "", city_state_zip: "",
    phone: "", email: "", co_owner_name: "", plot_description: "",
  });
  const [refreshing, setRefreshing] = useState(false);

  const [initials, setInitials] = useState("");
  const [sig, setSig] = useState<string | null>(null);
  const [coSig, setCoSig] = useState<string | null>(null);
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
          co_owner_name: fd.co_owner_name ?? "",
          plot_description: fd.plot_description ?? "",
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

  const refreshContract = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ action: "refresh", token, fields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update contract");
      // Bust iframe cache with new URL from server (new signed URL each time)
      setPdfUrl(data.pdf_url);
      toast.success("Contract updated with your details");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  };

  const submit = async () => {
    if (!fields.seller_name.trim()) return toast.error("Enter your full legal name");
    if (!fields.address.trim() || !fields.city_state_zip.trim())
      return toast.error("Enter your address and city/state/ZIP");
    if (!initials.trim() || initials.trim().length < 2) return toast.error("Enter your initials (2+ letters)");
    if (!sig) return toast.error("Draw your signature");
    if (!consent) return toast.error("Please confirm your consent to sign electronically");

    setBusy(true);
    try {
      // Ensure contract PDF is up-to-date with the latest field values before signing
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
          co_owner_name: fields.co_owner_name || undefined,
          co_owner_image: coSig || undefined,
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold mb-2">Link not valid</h1>
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
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Texas Cemetery Brokers</p>
          <h1 className="text-2xl md:text-3xl font-serif mt-2">{title}</h1>
        </header>

        {!done && (
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Step 1 · Confirm your details</h2>
              <p className="text-sm text-muted-foreground">
                Review and complete the fields below. When you click <em>Update contract</em>, the preview
                below will refresh with your information filled in.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Full legal name</Label>
                <Input value={fields.seller_name} onChange={setField("seller_name")} />
              </div>
              <div>
                <Label>Co-owner name (if joint)</Label>
                <Input value={fields.co_owner_name} onChange={setField("co_owner_name")} />
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
            </div>
            <Button onClick={refreshContract} disabled={refreshing} variant="secondary">
              {refreshing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update contract preview
            </Button>
          </Card>
        )}

        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/40 text-sm">
            <FileText className="h-4 w-4" /> Step 2 · Review the full contract
          </div>
          <iframe
            key={pdfUrl}
            title="Contract"
            src={pdfUrl}
            className="w-full h-[70vh] bg-background"
          />
          <div className="px-4 py-2 border-t text-xs text-muted-foreground">
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="underline">
              Open contract in a new tab
            </a>
          </div>
        </Card>

        {done ? (
          <Card className="p-8 text-center border-emerald-300 bg-emerald-50">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
            <h2 className="text-xl font-semibold text-emerald-900">Thank you — your signature is recorded.</h2>
            <p className="text-sm text-emerald-800 mt-2">
              A copy has been emailed to you. Texas Cemetery Brokers will countersign and send you the fully executed document shortly.
            </p>
            {info.kind === "poa" && (
              <p className="text-sm text-emerald-900 mt-4">
                Reminder: this Power of Attorney becomes fully effective once it is notarized. Your broker will send a separate email with the notary link.
              </p>
            )}
          </Card>
        ) : (
          <Card className="p-6 space-y-6">
            <h2 className="text-lg font-semibold">Step 3 · Sign this document</h2>
            <p className="text-sm text-muted-foreground">
              By typing your name and drawing your signature you agree that your electronic signature is legally binding,
              equivalent to a handwritten signature under the U.S. E-Sign Act and Texas UETA.
            </p>

            <div>
              <Label>Your initials (for required sections)</Label>
              <Input
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="e.g. AJ"
                className="max-w-[160px]"
              />
            </div>

            <SignaturePad label="Draw your signature" onChange={setSig} />

            {fields.co_owner_name.trim() && (
              <SignaturePad label={`Co-owner signature (${fields.co_owner_name})`} onChange={setCoSig} />
            )}

            <div className="rounded-md border bg-muted/40 p-4 text-sm space-y-3">
              <label className="flex gap-3 items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  I have reviewed the entire document above. I agree my electronic signature and initials are the legal
                  equivalent of a handwritten signature under the U.S. E-Sign Act (15 U.S.C. §§ 7001+) and the Texas
                  Uniform Electronic Transactions Act. I consent to receive records of this transaction electronically.
                </span>
              </label>
            </div>

            <Button onClick={submit} disabled={busy} size="lg" className="w-full md:w-auto">
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Sign &amp; submit
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

