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

export default function SignContract() {
  const { token } = useParams();
  const [info, setInfo] = useState<ContractInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [name, setName] = useState("");
  const [initials, setInitials] = useState("");
  const [sig, setSig] = useState<string | null>(null);
  const [coName, setCoName] = useState("");
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
        setName((data.fill_data?.seller_name as string) ?? "");
        setDone(data.already_signed);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const nameMatches = () => {
    const expected = ((info?.fill_data?.seller_name as string) ?? "").trim().toLowerCase();
    return expected.length === 0 || expected === name.trim().toLowerCase();
  };

  const submit = async () => {
    if (!name.trim()) return toast.error("Type your full legal name");
    if (!nameMatches()) return toast.error("The name you typed does not match the seller name on the contract");
    if (!initials.trim() || initials.trim().length < 2) return toast.error("Enter your initials (2+ letters)");
    if (!sig) return toast.error("Draw your signature");
    if (!consent) return toast.error("Please confirm your consent to sign electronically");
    setBusy(true);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({
          token,
          signature_name: name.trim(),
          signature_image: sig,
          initials: initials.trim().toUpperCase(),
          consent: true,
          co_owner_name: coName || undefined,
          co_owner_image: coSig || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sign failed");
      setDone(true);
      toast.success("Signature recorded");
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

        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/40 text-sm">
            <FileText className="h-4 w-4" /> Full contract preview
          </div>
          <iframe
            title="Contract"
            src={info.pdf_url}
            className="w-full h-[70vh] bg-background"
          />
          <div className="px-4 py-2 border-t text-xs text-muted-foreground">
            <a href={info.pdf_url} target="_blank" rel="noreferrer" className="underline">
              Open contract in a new tab
            </a>
          </div>
        </Card>

        {done ? (
          <Card className="p-8 text-center border-emerald-300 bg-emerald-50">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
            <h2 className="text-xl font-semibold text-emerald-900">Thank you — your signature is recorded.</h2>
            <p className="text-sm text-emerald-800 mt-2">
              A copy has been sent to Texas Cemetery Brokers. You may close this window.
            </p>
            {info.kind === "poa" && (
              <p className="text-sm text-emerald-900 mt-4">
                Reminder: this Power of Attorney is not effective until it is also notarized. Your broker will send you a link to complete online notarization with BlueNotary.
              </p>
            )}
          </Card>
        ) : (
          <Card className="p-6 space-y-6">
            <h2 className="text-lg font-semibold">Sign this document</h2>
            <p className="text-sm text-muted-foreground">
              By typing your name and drawing your signature you agree that your electronic signature is legally binding, equivalent to a handwritten signature under the U.S. E-Sign Act and Texas UETA.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Full legal name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Initials (for required sections)</Label>
                <Input value={initials} onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 4))} placeholder="e.g. DC" />
              </div>
            </div>

            <SignaturePad label="Draw your signature" onChange={setSig} />

            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Add a co-owner signature (if the property is jointly owned)</summary>
              <div className="mt-4 space-y-4">
                <div>
                  <Label>Co-owner full name</Label>
                  <Input value={coName} onChange={(e) => setCoName(e.target.value)} />
                </div>
                <SignaturePad label="Co-owner signature" onChange={setCoSig} />
              </div>
            </details>

            <Button onClick={submit} disabled={busy} size="lg" className="w-full md:w-auto">
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Sign contract
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
