import { useFilmTracking } from "@/hooks/useFilmTracking";
import { useRef, useState } from "react";
import { ArrowUpRight, Check, Clock3, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dallasFilm } from "@/data/dallasFilm";

interface DallasFilmProps {
  embedded?: boolean;
  ctaHref?: string;
}

const DallasFilm = ({ embedded = false, ctaHref = "/cemetery-plots-for-sale-dallas#cemeteries" }: DallasFilmProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useFilmTracking(videoRef, "dallas-cemeteries");
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);

  const play = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.ended) video.currentTime = 0;
    setFailed(false);
    // Reveal native controls before playback so blocked playback remains usable.
    setStarted(true);
    try { await video.play(); } catch { setFailed(true); }
  };

  return (
    <section id="dallas-film" aria-labelledby="dallas-film-title" className={cn("border-y border-border bg-secondary/25 py-7 md:py-12 scroll-mt-24", embedded && "bg-transparent")}>
      <div className={cn("mx-auto w-full max-w-screen-2xl px-6 lg:px-10", embedded && "max-w-none px-0 lg:px-0")}>
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="font-medium uppercase text-accent">The Dallas–Fort Worth film</span>
            <span className="inline-flex items-center gap-2"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />2 min 55 sec</span>
          </div>
          <h2 id="dallas-film-title" className={cn("mb-4 font-display text-3xl leading-tight text-foreground md:text-5xl", embedded && "md:text-4xl")}>
            Dallas–Fort Worth cemeteries.<br /><span className="italic text-primary">A guided tour of the memorial parks.</span>
          </h2>
          <p className="mb-6 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">See where each memorial park sits, the gardens families ask about most, and what sets each one apart.</p>
          <figure className="m-0">
            <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-secondary shadow-soft">
              <video ref={videoRef} src={dallasFilm.video} poster={dallasFilm.cover} controls={started} playsInline preload="none"
                title={dallasFilm.title} aria-label={`${dallasFilm.title}, 2 minutes 55 seconds`} aria-describedby="dallas-film-summary"
                onPlay={() => { setStarted(true); setFailed(false); }} onEnded={() => setStarted(false)}
                onError={() => setFailed(true)} className="h-full w-full object-contain">
                Read the Dallas–Fort Worth film summary below or download the video.
              </video>
              {!started && !failed && <Button type="button" variant="ghost" onClick={play} aria-label={`Play video: ${dallasFilm.title}`}
                className="group absolute inset-0 h-full w-full whitespace-normal rounded-none p-0 focus-visible:ring-inset focus-visible:ring-4">
                <img src={dallasFilm.cover} alt={dallasFilm.coverAlt} width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
                <span className="absolute bottom-3 left-3 flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-foreground shadow-soft md:bottom-6 md:left-6 md:px-4 md:py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground md:h-11 md:w-11"><Play className="h-4 w-4 fill-current" aria-hidden="true" /></span>
                  <span className="text-left"><span className="block text-sm font-semibold">Watch the Dallas–Fort Worth tour</span><span className="hidden text-xs text-muted-foreground sm:block">Restland, Sparkman-Hillcrest, Laurel Land and more</span></span>
                </span>
              </Button>}
            </div>
            {failed && <p role="status" className="mt-3 text-sm text-muted-foreground">The film could not start. <a href={dallasFilm.video} className="text-primary underline">Open the video</a> or read the summary below.</p>}
            <figcaption className="mt-5">
              <div className="flex flex-wrap items-center justify-between gap-5 border-b border-border pb-5">
                <ul className="flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted-foreground md:text-sm" aria-label="What the Dallas–Fort Worth film covers">
                  {["Where each cemetery sits", "Gardens families ask about", "History and notable features"].map(item => <li key={item} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />{item}</li>)}
                </ul>
                <Button asChild variant="link" className="h-auto whitespace-normal p-0 text-sm"><a href={ctaHref}>See Dallas–Fort Worth cemeteries <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a></Button>
              </div>
              <details className="mt-4 text-sm text-muted-foreground">
                <summary className="cursor-pointer text-primary">Read the film summary</summary>
                <p id="dallas-film-summary" className="mt-3 max-w-3xl leading-relaxed">{dallasFilm.summary}</p>
              </details>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
};

export default DallasFilm;