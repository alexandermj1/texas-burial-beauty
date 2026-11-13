import { RefObject, useEffect } from "react";

/** Records film starts and watch time (seconds actually played) for site films. */
export function useFilmTracking(ref: RefObject<HTMLVideoElement>, film: string) {
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let watched = 0;
    let last = 0;
    let open = false;
    const page = window.location.pathname;
    const flush = () => {
      if (!open) return;
      open = false;
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      window.__lovableEvents?.track?.("project.video_watched", {
        film, page,
        seconds_watched: Math.round(watched),
        percent_watched: duration ? Math.min(100, Math.round((watched / duration) * 100)) : 0,
        completed: video.ended,
      });
      watched = 0;
    };
    const onPlay = () => {
      last = video.currentTime;
      if (!open) {
        open = true;
        window.__lovableEvents?.track?.("project.video_played", { film, page });
      }
    };
    const onTime = () => {
      const delta = video.currentTime - last;
      if (!video.paused && delta > 0 && delta < 2) watched += delta;
      last = video.currentTime;
    };
    const onSeek = () => { last = video.currentTime; };
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    video.addEventListener("play", onPlay);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("seeked", onSeek);
    video.addEventListener("pause", flush);
    video.addEventListener("ended", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      flush();
      video.removeEventListener("play", onPlay);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("seeked", onSeek);
      video.removeEventListener("pause", flush);
      video.removeEventListener("ended", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [ref, film]);
}
