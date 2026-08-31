import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfCanvasViewer({ url, title }: { url: string; title: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !url) return;
    let cancelled = false;
    const task = pdfjs.getDocument({ url });
    // Render into a detached container first so the currently visible pages
    // stay on screen (and keep their scroll position) while the new version
    // loads — no blank flash while the seller is reading.
    const staging = document.createElement("div");
    staging.className = "flex flex-col items-center gap-4";
    const hadContent = host.childElementCount > 0;
    setLoading(!hadContent);
    setError("");

    void task.promise.then(async (pdf) => {
      for (let pageNumber = 1; pageNumber <= pdf.numPages && !cancelled; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const base = page.getViewport({ scale: 1 });
        const available = Math.max(280, Math.min(host.clientWidth - 24, 900));
        const viewport = page.getViewport({ scale: available / base.width });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Your browser could not display this page.");
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.className = "block max-w-full bg-background shadow-sm";
        canvas.setAttribute("aria-label", `${title}, page ${pageNumber} of ${pdf.numPages}`);
        staging.appendChild(canvas);
        await page.render({ canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] }).promise;
      }
      if (cancelled) return;
      const keep = host.scrollTop;
      host.replaceChildren(...Array.from(staging.childNodes));
      host.scrollTop = keep;
      setLoading(false);
    }).catch((cause: unknown) => {
      if (!cancelled) {
        setLoading(false);
        setError(cause instanceof Error ? cause.message : "This PDF could not be displayed.");
      }
    });

    return () => {
      cancelled = true;
      void task.destroy();
    };
  }, [title, url]);


  return (
    <div className="relative min-h-80 bg-muted/30">
      {loading && <div className="absolute inset-x-0 top-8 z-10 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading document…</div>}
      {error && <div role="alert" className="p-8 text-center text-sm text-destructive">{error}</div>}
      <div ref={hostRef} className="flex flex-col items-center gap-4 overflow-auto p-3" />
    </div>
  );
}