import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { FileViewerSource } from "@/lib/fileViewer";
import PdfCanvasViewer from "@/components/PdfCanvasViewer";

export default function FileViewer() {
  const [params] = useSearchParams();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("Document");
  const [mime, setMime] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // New-style links carry the source encoded in the URL; fall back to the
    // legacy sessionStorage hand-off for any tabs opened before the change.
    let raw: string | null = null;
    const encoded = params.get("f");
    if (encoded) {
      const decoded = decodeViewerSource(encoded);
      if (decoded) raw = JSON.stringify(decoded);
    } else {
      const id = params.get("id");
      if (id) raw = sessionStorage.getItem(`file-viewer:${id}`);
    }
    if (!raw) { setError("This file link is incomplete. Close this tab and open the file again."); return; }

    let objectUrl = "";
    (async () => {
      try {
        const source = JSON.parse(raw) as FileViewerSource;
        const sourceName = source.name || ("path" in source ? source.path.split("/").pop() || "Document" : "Document");
        setName(sourceName);
        const result = "url" in source
          ? await fetch(source.url).then(async (response) => {
              if (!response.ok) throw new Error("The file could not be downloaded.");
              return response.blob();
            })
          : await supabase.storage.from(source.bucket).download(source.path).then(({ data, error: downloadError }) => {
              if (downloadError || !data) throw downloadError ?? new Error("The file could not be downloaded.");
              return data;
            });
        const finalMime = source.mime || result.type || (sourceName.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream");
        const blob = result.type === finalMime ? result : new Blob([result], { type: finalMime });
        setMime(finalMime);
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "The file could not be opened.");
      }
    })();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [params]);

  const image = mime.startsWith("image/");
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-14 border-b border-border px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0"><FileText className="w-4 h-4 shrink-0" /><span className="text-sm truncate">{name}</span></div>
        {url && <Button size="sm" variant="outline" asChild><a href={url} download={name}><Download className="w-4 h-4 mr-1.5" />Download</a></Button>}
      </header>
      <section className="flex-1 min-h-0 flex items-center justify-center bg-muted/30 p-3">
        {error ? <div className="max-w-md text-center"><FileText className="w-9 h-9 mx-auto mb-3 text-muted-foreground" /><p className="font-medium">File could not be opened</p><p className="text-sm text-muted-foreground mt-1">{error}</p></div>
          : !url ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Opening file…</div>
          : image ? <img src={url} alt={name} className="max-w-full max-h-[calc(100vh-5rem)] object-contain" />
          : mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")
            ? <div className="w-full self-stretch"><PdfCanvasViewer url={url} title={name} /></div>
            : <iframe src={url} title={name} className="w-full h-full min-h-[calc(100vh-5rem)] bg-background border border-border rounded-md" />}
      </section>
    </main>
  );
}