import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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

createRoot(document.getElementById("root")!).render(<App />);
