import { createRoot } from "react-dom/client";
import App, { preloadRouteFor } from "./App.tsx";
import "./index.css";

const fonts = document.createElement("link");
fonts.rel = "stylesheet";
fonts.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300;1,9..40,400&display=swap";
document.head.appendChild(fonts);

// On the Lovable preview/staging host (e.g. texas-burial-beauty.lovable.app),
// (1) tell search engines not to index this host, and
// (2) redirect real visitors to the canonical custom domain so Google's
//     cached lovable.app result gets replaced by texascemeterybrokers.com.
// The id-preview-* host is the in-editor preview — never redirect that one.
if (typeof window !== "undefined" && /lovable\.app$/i.test(window.location.hostname)) {
  let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement("meta");
    robots.setAttribute("name", "robots");
    document.head.appendChild(robots);
  }
  robots.setAttribute("content", "noindex,nofollow");

  const host = window.location.hostname;
  const isEditorPreview = /^id-preview--/i.test(host) || host.includes("lovableproject.com");
  if (!isEditorPreview) {
    const target =
      "https://texascemeterybrokers.com" +
      window.location.pathname +
      window.location.search +
      window.location.hash;
    window.location.replace(target);
  }
}

const root = document.getElementById("root");
if (root) {
  const start = () => createRoot(root).render(<App />);
  if (root.hasChildNodes()) {
    // This page was served with its content already in the HTML (for search
    // engines and AI readers). Load the page's code first so the live app
    // replaces that content in one step, with no blank frame.
    const giveUp = new Promise<void>((resolve) => window.setTimeout(resolve, 4000));
    Promise.race([preloadRouteFor(window.location.pathname), giveUp]).catch(() => undefined).then(start);
  } else {
    start();
  }
}
