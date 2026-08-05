import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import QRCode from "qrcode";
import {
  CheckCircle2, Loader2, Upload, Smartphone, FileText, ShieldCheck,
  ChevronDown, Stamp, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DOC_GUIDE } from "@/lib/ownershipRules";
import hibiscusCoral from "@/assets/flowers/hibiscus-coral.png.asset.json";

/**
 * One curated page per seller, linked from a single email. Every document we
 * still need, explained in plain English, uploadable from the computer or by
 * scanning a QR with a phone camera.
 */

type PacketDoc = {
  id: string;
  code: string | null;
  label: string;
  person_name: string | null;
  why: string | null;
  needs_notary: boolean | null;
  issued_by_us: boolean | null;
  state: string;
  uploaded: boolean;
};

type Poa = { sign_token: string; notarized: boolean; signed: boolean } | null;
type ListingAgreement = { signed: boolean; completed: boolean; signed_at: string | null } | null;

type Packet = { seller_name: string | null; cemetery: string | null; documents: PacketDoc[]; poa?: Poa; listing_agreement?: ListingAgreement };

const DONE = ["received", "notarized", "complete"];
const PUBLIC_SITE_URL = "https://www.texascemeterybrokers.com";

const DocRow = ({
  doc, submissionId, onDone,
}: { doc: PacketDoc; submissionId: string; onDone: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const [phone, setPhone] = useState(false);
  const [qr, setQr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(doc.uploaded || DONE.includes(doc.state));
  const inputRef = useRef<HTMLInputElement | null>(null);
  const guide = DOC_GUIDE[doc.code ?? ""];

  const mobileUrl = typeof window !== "undefined"
    ? `${PUBLIC_SITE_URL}/seller-portal/upload/mobile?session=${submissionId}&doc=${encodeURIComponent(doc.id)}&label=${encodeURIComponent(doc.label)}`
    : "";

  useEffect(() => {
    if (!phone || !mobileUrl) return;
    QRCode.toDataURL(mobileUrl, { margin: 1, width: 240, color: { dark: "#3f5d47", light: "#00000000" } })
      .then(setQr).catch(() => setQr(""));
  }, [phone, mobileUrl]);

  const record = useCallback(async (path: string, name: string, size?: number, type?: string) => {
    await supabase.functions.invoke("seller-packet", {
      body: { action: "record", submission_id: submissionId, doc_id: doc.id, path, name, size, type },
    });
    setDone(true);
    setPhone(false);
    onDone();
  }, [doc.id, submissionId, onDone]);

  // While the QR panel is open, watch the bucket for the phone's upload.
  useEffect(() => {
    if (!phone) return;
    const check = async () => {
      const { data } = await supabase.storage
        .from("portal-uploads")
        .list(submissionId, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      const hit = (data ?? []).find((f) => f.name.startsWith(`${doc.id}-`));
      if (hit) await record(`${submissionId}/${hit.name}`, hit.name, (hit.metadata as { size?: number })?.size);
    };
    const t = window.setInterval(check, 2500);
    void check();
    return () => window.clearInterval(t);
  }, [phone, submissionId, doc.id, record]);

  const handleFile = async (f: File) => {
    setUploading(true);
    try {
      const ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${submissionId}/${doc.id}-${Date.now()}.${ext || "bin"}`;
      const { error } = await supabase.storage
        .from("portal-uploads")
        .upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
      if (error) throw error;
      await record(path, f.name, f.size, f.type);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`rounded-2xl border transition-colors overflow-hidden ${done ? "border-primary/40 bg-primary/[0.04]" : "border-border/70 bg-card/70"}`}>
      <div className="flex items-start gap-4 p-5">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
          {done ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg text-foreground leading-snug">{doc.label}</p>
          {doc.why && <p className="text-xs text-muted-foreground mt-0.5">{doc.why}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {doc.needs_notary && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary inline-flex items-center gap-1">
                <Stamp className="w-3 h-3" />Notary
              </span>
            )}
            {doc.issued_by_us && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                We send this to you
              </span>
            )}
            {guide && (
              <button onClick={() => setExpanded((v) => !v)} className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline">
                What is this? <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
          {expanded && guide && (
            <div className="mt-3 rounded-xl bg-muted/40 px-4 py-3 space-y-2">
              <p className="text-xs text-foreground/80 leading-relaxed">{guide.what}</p>
              <p className="text-xs text-muted-foreground leading-relaxed"><span className="font-medium text-foreground/70">How to get it: </span>{guide.how}</p>
            </div>
          )}
        </div>
        {!done && !doc.issued_by_us && (
          <div className="flex items-center gap-2 shrink-0">
            <input ref={inputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Upload
            </button>
            <button
              onClick={() => setPhone((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full border border-border hover:border-primary/40"
            >
              {phone ? <X className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />} Phone
            </button>
          </div>
        )}
      </div>

      {phone && (
        <div className="border-t border-border/60 px-5 py-6 text-center bg-muted/20">
          <p className="text-sm text-foreground mb-3">Scan with your phone camera, then take a photo of the document.</p>
          {qr ? <img src={qr} alt="QR code to upload from your phone" className="w-40 h-40 mx-auto" /> : <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />}
          <p className="text-[11px] text-muted-foreground mt-3 inline-flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> Waiting for the photo — this page updates itself.
          </p>
        </div>
      )}
    </div>
  );
};

const SellerDocuments = () => {
  const [params] = useSearchParams();
  const submissionId = params.get("s") ?? "";
  const [packet, setPacket] = useState<Packet | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!submissionId) { setError("This link is missing its reference."); setLoading(false); return; }
    const { data, error: err } = await supabase.functions.invoke("seller-packet", {
      body: { action: "get", submission_id: submissionId },
    });
    if (err || (data as { error?: string })?.error) {
      setError((data as { error?: string })?.error ?? "We couldn't open this link.");
    } else {
      setPacket(data as Packet);
    }
    setLoading(false);
  }, [submissionId]);

  useEffect(() => {
    document.title = "Your documents · Texas Cemetery Brokers";
    void load();
  }, [load]);

  const { done, total } = useMemo(() => {
    const docs = packet?.documents ?? [];
    return { done: docs.filter((d) => d.uploaded || DONE.includes(d.state)).length, total: docs.length };
  }, [packet]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div
        className="absolute -top-24 -right-24 w-96 h-96 opacity-20 pointer-events-none"
        style={{ backgroundImage: `url(${hibiscusCoral.url})`, backgroundSize: "contain", backgroundRepeat: "no-repeat" }}
      />
      <div className="relative max-w-3xl mx-auto px-5 py-16">
        <div className="text-[10px] tracking-[0.28em] uppercase text-primary mb-3">Texas Cemetery Brokers</div>
        {packet?.seller_name && (
          <p className="text-xs font-medium text-foreground mb-2">Private document page for {packet.seller_name}</p>
        )}
        <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] text-foreground mb-4">
          {packet?.seller_name ? `${packet.seller_name.split(" ")[0]}, here's` : "Here's"} everything we need to{" "}
          <em className="italic text-primary">complete your sale</em>.
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          One page, one list. Upload from this computer, or tap <span className="text-foreground">Phone</span> on any
          item and photograph it with your camera{packet?.cemetery ? ` — everything below is what ${packet.cemetery} requires` : ""}.
        </p>

        {total > 0 && (
          <div className="mt-8 mb-10">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> {done} of {total} received</span>
              <span>{Math.round((done / total) * 100)}%</span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${(done / total) * 100}%` }} />
            </div>
          </div>
        )}

        {packet?.listing_agreement?.signed && (
          <div className="mb-3 rounded-2xl border border-primary/30 bg-primary/[0.05] p-5 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-display text-lg text-foreground">Listing Agreement signed</p>
              <p className="text-xs text-muted-foreground mt-1">
                We already have your signed Listing Agreement on file{packet.listing_agreement.signed_at ? ` from ${new Date(packet.listing_agreement.signed_at).toLocaleDateString()}` : ""}. You do not need to sign it again.
              </p>
            </div>
          </div>
        )}

        {packet?.poa && !packet.poa.notarized && (
          <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/[0.05] p-5">
            <div className="text-[10px] uppercase tracking-[0.28em] text-primary mb-1">Also to do</div>
            <p className="font-display text-xl text-foreground leading-snug">Your Limited Power of Attorney</p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              This lets us handle the cemetery's transfer paperwork for you. Confirm your address, then sign it
              with an online notary in about fifteen minutes — or print it and use any bank or UPS Store notary.
            </p>
            <a
              href={`/sign/${packet.poa.sign_token}`}
              className="inline-flex items-center gap-1.5 mt-3 text-xs px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90"
            >
              <Stamp className="w-3.5 h-3.5" /> {packet.poa.signed ? "Finish notarizing" : "Prepare & notarize"}
            </a>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-10">
            <Loader2 className="w-4 h-4 animate-spin" /> Opening your file…
          </div>
        ) : error ? (
          <div className="mt-10 rounded-2xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">{error}</div>
        ) : (packet?.documents.length ?? 0) === 0 ? (
          <div className="mt-10 rounded-2xl border border-border/70 bg-card/70 px-5 py-6 text-sm text-muted-foreground">
            Nothing is outstanding right now — we'll email you the moment something is needed.
          </div>
        ) : (
          <div className="space-y-3">
            {packet!.documents.map((d) => (
              <DocRow key={d.id} doc={d} submissionId={submissionId} onDone={load} />
            ))}
          </div>
        )}

        <p className="mt-12 text-[11px] text-muted-foreground leading-relaxed">
          Your documents are stored privately and used only to transfer this plot. Questions? Reply to the email that
          brought you here and a broker will answer personally.
        </p>
      </div>
    </div>
  );
};

export default SellerDocuments;
