import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Camera, CheckCircle2, Upload, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import hibiscusCoral from "@/assets/flowers/hibiscus-coral.png.asset.json";

// Cross-device upload target. Opened from a QR code the desktop wizard
// renders. The session id + doc key together define the storage path,
// so the desktop can poll for the file appearing.
const SellerPortalMobileUpload = () => {
  const [params] = useSearchParams();
  const session = params.get("session") ?? "";
  const docKey = params.get("doc") ?? "";
  const docLabel = params.get("label") ?? "your document";
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const validSession = /^[0-9a-f-]{16,}$/i.test(session);

  useEffect(() => {
    document.title = "Upload photo · Texas Cemetery Brokers";
  }, []);

  const handleFile = async (file: File) => {
    if (!validSession) {
      setStatus("error");
      setErrorMsg("This upload link is invalid or has expired.");
      return;
    }
    setStatus("uploading");
    setErrorMsg("");
    setPreview(URL.createObjectURL(file));

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${session}/${docKey || "photo"}-${Date.now()}.${ext || "jpg"}`;

    const { error } = await supabase.storage
      .from("portal-uploads")
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("done");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-5 py-10 relative overflow-hidden">
      <div
        className="absolute -top-10 -right-10 w-56 h-56 opacity-25 pointer-events-none"
        style={{
          backgroundImage: `url(${hibiscusCoral.url})`,
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="text-[10px] tracking-[0.28em] uppercase text-primary mb-2">
          Texas Cemetery Brokers
        </div>
        <h1 className="font-display text-3xl leading-tight text-foreground mb-2">
          Snap a photo of{" "}
          <em className="italic text-primary">{decodeURIComponent(docLabel)}</em>.
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Once you tap the button below, your phone camera will open. Take a
          clear picture — we'll deliver it straight back to your computer.
        </p>

        {status === "done" ? (
          <div className="rounded-3xl border border-primary/30 bg-primary/5 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="font-display text-2xl text-foreground mb-2">Uploaded.</h2>
            <p className="text-sm text-muted-foreground mb-6">
              You can close this tab. Your desktop wizard is already updating.
            </p>
            {preview && (
              <img
                src={preview}
                alt=""
                className="w-full max-h-56 object-cover rounded-2xl mb-4"
              />
            )}
            <button
              onClick={() => {
                setStatus("idle");
                setPreview(null);
              }}
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Take another
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-border/70 bg-card/80 backdrop-blur-lg p-6 shadow-soft">
            <label className="block w-full">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
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
                  {status === "uploading" ? "Uploading…" : "Open camera"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {status === "uploading"
                    ? "Hold tight — this usually takes a second."
                    : "Tap here to take the photo now."}
                </span>
              </span>
            </label>

            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  if (inputRef.current) {
                    inputRef.current.removeAttribute("capture");
                    inputRef.current.click();
                    // Restore capture for the next tap.
                    setTimeout(() => inputRef.current?.setAttribute("capture", "environment"), 500);
                  }
                }}
                className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Or upload an existing photo
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive px-4 py-3">
                {errorMsg}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-[11px] text-muted-foreground text-center leading-relaxed">
          Your photo travels privately between this phone and your desktop
          session — nobody else can see it.
        </div>
      </div>
    </div>
  );
};

export default SellerPortalMobileUpload;
