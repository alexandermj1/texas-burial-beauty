import { useRef, useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import videoAsset from "@/assets/documents/tcb-documents-walkthrough-v2.mp4.asset.json";
import coverAsset from "@/assets/documents/tcb-documents-walkthrough-first-item-cover.jpg.asset.json";
import { DOCUMENT_WALKTHROUGH } from "../../supabase/functions/_shared/documentWalkthrough";

export default function DocumentWalkthrough() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const play = async () => {
    try { await videoRef.current?.play(); } catch { setFailed(true); }
  };
  return (
    <section id="document-walkthrough" aria-labelledby="document-film-title" className="scroll-mt-24 mb-8 border-b border-border pb-8">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="document-film-title" className="font-display text-2xl text-foreground sm:text-3xl">Your documents, explained.</h2>
        <span className="text-xs text-muted-foreground">3 min 52 sec</span>
      </div>
      <figure className="mx-auto max-w-4xl">
        <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted shadow-sm">
          <video ref={videoRef} src={videoAsset.url} poster={coverAsset.url} controls={started} playsInline preload="none"
            aria-label={DOCUMENT_WALKTHROUGH.title} aria-describedby="document-film-summary" title={DOCUMENT_WALKTHROUGH.title}
            onPlay={() => setStarted(true)} onError={() => setFailed(true)} className="h-full w-full object-contain">
            <a href={videoAsset.url}>Open the document walkthrough film</a>
          </video>
          {!started && <Button variant="ghost" onClick={play} aria-label="Play the document walkthrough" className="absolute inset-0 h-full w-full whitespace-normal rounded-none p-0">
            <img src={coverAsset.url} alt={DOCUMENT_WALKTHROUGH.coverAlt} width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2 rounded-md bg-background/95 px-3 py-3 text-sm font-semibold text-foreground shadow-sm sm:left-5 sm:right-auto">
              <Play className="h-4 w-4 fill-current text-primary" aria-hidden="true" /> Watch the document walkthrough
            </span>
          </Button>}
        </div>
        <figcaption id="document-film-summary" className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Why we need your documents, how to sign and notarise them, and how to return copies and originals. Follow your personal checklist below; not every document in the film applies to your property.
        </figcaption>
        {failed && <a href={videoAsset.url} className="mt-2 inline-block text-sm text-primary underline">Open the film directly</a>}
      </figure>
    </section>
  );
}