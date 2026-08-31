import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Camera, CheckCircle2, Upload, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Phone-side upload target for the seller quote form. The desktop form renders
// a QR code pointing here with its one-time intake id, so anything the seller
// photographs lands in the same folder the desktop submission will reference.
const MAX_FILE_MB = 20;
const ALLOWED = /\.(pdf|png|jpe?g|webp|heic|tiff?|gif|docx?|txt)$/i;

const SellerIntakeUpload = () => {
  const [params] = useSearchParams();
  const intakeId = params.get("s") ?? "";
  const validSession = /^[0-9a-f-]{16,}$/i.test(intakeId);

  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [done, setDone] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.title = "Upload your deed · Texas Cemetery Brokers";
  }, []);

  const handleFiles = async (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    if (!validSession) {
      setStatus("error");
      setErrorMsg("This upload link is invalid or has expired. Please rescan the code on your computer.");
      return;
    }
    setStatus("uploading");
    setErrorMsg("");

    const uploaded: string[] = [];
    for (const f of Array.from(picked)) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        setErrorMsg(`${f.name} is larger than ${MAX_FILE_MB}MB.`);
        continue;
      }
      if (!ALLOWED.test(f.name)) {
        setErrorMsg(`${f.name} isn't a supported file type.`);
        continue;
      }
      const safeName = f.name.replace(/[^\w.\-]+/g, "_");
      const path = `public-intake/${intakeId}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from("customer-files")
        .upload(path, f, { contentType: f.type || undefined, upsert: false });
      if (error) {
        setStatus("error");
        setErrorMsg(error.message);
        return;
      }
      uploaded.push(f.name);
    }

    setDone(prev => [...prev, ...uploaded]);
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="text-[10px] tracking-[0.28em] uppercase text-primary mb-2">
          Texas Cemetery Brokers
        </div>
        <h1 className="font-display text-3xl leading-tight text-foreground mb-2">
          Photograph your <em className="italic text-primary">deed</em>.
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Tap below to open your camera or photo library. Whatever you send
          appears instantly on the form still open on your computer — keep that
          window open and finish the form there.
        </p>

        <div className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-soft">
          <label className="block w-full">
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.tif,.tiff,.gif,.doc,.docx,.txt,image/*,application/pdf"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <span
              className={`flex flex-col items-center justify-center gap-3 w-full py-10 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                status === "uploading"
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              {status === "uploading" ? (
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              ) : (
                <Camera className="w-10 h-10 text-primary" />
              )}
              <span className="font-display text-xl text-foreground">
                {status === "uploading" ? "Sending…" : "Open camera"}
              </span>
              <span className="text-xs text-muted-foreground">
                {status === "uploading" ? "One moment." : "Lay the deed flat and fill the frame."}
              </span>
            </span>
          </label>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.removeAttribute("capture");
                  inputRef.current.click();
                  setTimeout(() => inputRef.current?.setAttribute("capture", "environment"), 500);
                }
              }}
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> Or choose a file already on your phone
            </button>
          </div>

          {errorMsg && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive px-4 py-3">
              {errorMsg}
            </div>
          )}

          {done.length > 0 && (
            <div className="mt-5 space-y-2">
              {done.map((n, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="truncate">{n}</span>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground pt-1">
                Sent. You can add more, or head back to your computer to finish.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
          <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
          <span>
            Uploads go straight into our private, encrypted broker portal — only
            our licensed Texas team can open them.
          </span>
        </div>
      </div>
    </div>
  );
};

export default SellerIntakeUpload;
