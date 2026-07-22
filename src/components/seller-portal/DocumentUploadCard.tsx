import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Smartphone,
  Monitor,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  FileText,
  QrCode,
  X,
  ArrowRight,
  Copy,
  Share2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DocRequirement {
  key: string;
  label: string;
  hint: string;
}

interface DocumentUploadCardProps {
  doc: DocRequirement;
  sessionId: string;
  file: { name: string; size: number } | null;
  onFile: (meta: { name: string; size: number; url?: string } | null) => void;
}

/**
 * A single required-document row with two upload modes:
 *   1. Upload from this computer (regular file picker)
 *   2. "Send it from my phone" — shows a QR the user scans; the phone
 *      opens /seller-portal/upload/mobile and pushes the photo into the
 *      shared portal-uploads bucket. Desktop polls for the file and marks
 *      the document complete when it lands.
 */
export const DocumentUploadCard = ({
  doc,
  sessionId,
  file,
  onFile,
}: DocumentUploadCardProps) => {
  const [mode, setMode] = useState<"idle" | "computer" | "phone">("idle");
  const [uploading, setUploading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [waitingForPhone, setWaitingForPhone] = useState(false);
  const pollRef = useRef<number | null>(null);

  const mobileUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/seller-portal/upload/mobile?session=${sessionId}&doc=${encodeURIComponent(doc.key)}&label=${encodeURIComponent(doc.label)}`
      : "";

  // Build the QR whenever the user opens the phone flow.
  useEffect(() => {
    if (mode !== "phone" || !mobileUrl) return;
    QRCode.toDataURL(mobileUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
      color: { dark: "#3f5d47", light: "#00000000" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [mode, mobileUrl]);

  // Poll the bucket for phone-side uploads while the QR panel is open.
  useEffect(() => {
    if (mode !== "phone") {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
      setWaitingForPhone(false);
      return;
    }
    setWaitingForPhone(true);
    let cancelled = false;
    const check = async () => {
      const { data, error } = await supabase.storage
        .from("portal-uploads")
        .list(sessionId, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      if (error || cancelled || !data) return;
      const match = data.find((entry) => entry.name.startsWith(`${doc.key}-`));
      if (match) {
        const path = `${sessionId}/${match.name}`;
        const { data: signed } = await supabase.storage
          .from("portal-uploads")
          .createSignedUrl(path, 60 * 60);
        onFile({
          name: match.name,
          size: (match.metadata as { size?: number } | null)?.size ?? 0,
          url: signed?.signedUrl,
        });
        setMode("idle");
        setWaitingForPhone(false);
      }
    };
    pollRef.current = window.setInterval(check, 2500);
    check();
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [mode, sessionId, doc.key, onFile]);

  const handleComputerFile = async (f: File) => {
    setUploading(true);
    try {
      const ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${sessionId}/${doc.key}-${Date.now()}.${ext || "bin"}`;
      const { error } = await supabase.storage
        .from("portal-uploads")
        .upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
      if (error) throw error;
      const { data: signed } = await supabase.storage
        .from("portal-uploads")
        .createSignedUrl(path, 60 * 60);
      onFile({ name: f.name, size: f.size, url: signed?.signedUrl });
    } catch (err) {
      // Fall back to just recording metadata so wizard progress isn't blocked.
      onFile({ name: f.name, size: f.size });
    } finally {
      setUploading(false);
      setMode("idle");
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-background/50 hover:border-primary/30 transition-colors overflow-hidden">
      <div className="flex items-center gap-4 p-5">
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
            file ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
          }`}
        >
          {file ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-foreground font-medium">{doc.label}</div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">
            {file ? `${file.name}` : doc.hint}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {file && (
            <button
              onClick={() => onFile(null)}
              className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
            >
              Remove
            </button>
          )}
          <button
            onClick={() => setMode(mode === "idle" ? "computer" : "idle")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs transition-all ${
              mode !== "idle"
                ? "bg-primary text-primary-foreground"
                : "border border-border/70 text-foreground hover:border-primary/50 hover:bg-primary/5"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            {file ? "Replace" : "Upload"}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {mode !== "idle" && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="border-t border-border/60 bg-muted/30"
          >
            <div className="p-5">
              {/* Mode tabs */}
              <div className="flex items-center gap-2 mb-5">
                <button
                  onClick={() => setMode("computer")}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] transition-all ${
                    mode === "computer"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Monitor className="w-3 h-3" /> From this computer
                </button>
                <button
                  onClick={() => setMode("phone")}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] transition-all ${
                    mode === "phone"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Smartphone className="w-3 h-3" /> Use my phone camera
                </button>
                <button
                  onClick={() => setMode("idle")}
                  className="ml-auto text-muted-foreground/70 hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {mode === "computer" ? (
                <div>
                  <label
                    className={`flex flex-col items-center justify-center gap-3 w-full py-10 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                      uploading
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleComputerFile(f);
                      }}
                    />
                    {uploading ? (
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-primary" />
                    )}
                    <div className="text-sm text-foreground font-medium">
                      {uploading ? "Uploading…" : "Click here to choose a file"}
                    </div>
                    <div className="text-[11px] text-muted-foreground max-w-xs text-center">
                      Photos of documents (JPG, PNG, HEIC) or PDFs work great. Max
                      one file per document — you can always replace it later.
                    </div>
                  </label>

                  <div className="mt-4 flex items-start gap-3 rounded-xl bg-background/60 border border-border/50 px-4 py-3 text-[11px] text-muted-foreground">
                    <ArrowRight className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                    <div>
                      <span className="text-foreground">Don't have it scanned?</span>{" "}
                      Switch to <em>Use my phone camera</em> above — you'll get a QR
                      code that opens your phone camera and beams the photo back to
                      this screen automatically.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-[240px_1fr] gap-6 items-center">
                  <div className="flex flex-col items-center justify-center bg-background rounded-xl border border-border/60 p-5">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Scan this QR code with your phone"
                        width={200}
                        height={200}
                        className="w-full max-w-[200px]"
                      />
                    ) : (
                      <div className="w-[200px] h-[200px] flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      </div>
                    )}
                    <div className="mt-3 text-[10px] tracking-[0.24em] uppercase text-primary flex items-center gap-1.5">
                      <QrCode className="w-3 h-3" /> Scan to continue
                    </div>
                  </div>

                  <div>
                    <h4 className="font-display text-xl text-foreground leading-tight mb-3">
                      How to send it from your phone
                    </h4>
                    <ol className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                      <li className="flex gap-3">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span>Open your phone camera and hover it over the QR code — a link will pop up.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span>Tap the link. A Texas Cemetery Brokers upload page will open.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span>Tap <em>Open camera</em>, take a clear picture of your document, and confirm.</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">4</span>
                        <span>This screen will update automatically the second the photo arrives.</span>
                      </li>
                    </ol>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(mobileUrl);
                          } catch { /* ignore */ }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] border border-border/70 text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
                      >
                        <Copy className="w-3 h-3" /> Copy link
                      </button>
                      {typeof navigator !== "undefined" && "share" in navigator && (
                        <button
                          onClick={() => {
                            navigator.share?.({
                              title: "Texas Cemetery Brokers — upload",
                              text: "Open this on your phone to upload a document photo.",
                              url: mobileUrl,
                            }).catch(() => { /* user cancelled */ });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] border border-border/70 text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
                        >
                          <Share2 className="w-3 h-3" /> Share to phone
                        </button>
                      )}
                      <a
                        href={`sms:?&body=${encodeURIComponent(`Texas Cemetery Brokers — upload here: ${mobileUrl}`)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] border border-border/70 text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all"
                      >
                        <Smartphone className="w-3 h-3" /> Text to my phone
                      </a>
                      <button
                        onClick={() => setMode("phone")}
                        className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                      >
                        <RefreshCcw className="w-3 h-3" /> Regenerate
                      </button>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-[11px]">
                      {waitingForPhone ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                          <span className="text-muted-foreground">Waiting for your phone to send the photo…</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Ready when you are.</span>
                      )}
                    </div>

                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocumentUploadCard;
