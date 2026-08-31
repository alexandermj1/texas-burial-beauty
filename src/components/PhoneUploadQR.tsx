import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Smartphone } from "lucide-react";

/**
 * Desktop-only helper: shows a QR code the seller can scan with their phone to
 * photograph a deed. The phone uploads into the same intake folder, so the
 * files appear back in this form (the parent polls storage).
 */
const PhoneUploadQR = ({ intakeId }: { intakeId: string }) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/seller-upload?s=${intakeId}`;

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, { width: 320, margin: 1, errorCorrectionLevel: "M" })
      .then((d) => { if (alive) setDataUrl(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [url]);

  return (
    <div className="mt-4 rounded-xl border border-primary/20 bg-background/70 p-4">
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt="QR code to upload your deed from your phone"
              className="w-[104px] h-[104px] rounded-lg bg-white p-1"
              width={104}
              height={104}
            />
          ) : (
            <div className="w-[104px] h-[104px] rounded-lg bg-foreground/5 animate-pulse" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Smartphone className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[11px] tracking-[0.22em] uppercase font-bold text-primary">
              No scanner? Use your phone
            </span>
          </div>
          <p className="text-[13px] text-foreground/70 leading-relaxed">
            Point your phone camera at this code and tap the link that pops up.
            Your camera opens — photograph the deed, and it appears here on this
            page automatically. Keep this window open while you do it.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-[11px] text-primary underline underline-offset-2"
          >
            Or open the upload page here
          </a>
        </div>
      </div>
    </div>
  );
};

export default PhoneUploadQR;
