import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Block search indexing on the Lovable preview/staging host so it
// doesn't compete with texascemeterybrokers.com as a duplicate.
if (typeof window !== "undefined" && /lovable\.app$/i.test(window.location.hostname)) {
  let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement("meta");
    robots.setAttribute("name", "robots");
    document.head.appendChild(robots);
  }
  robots.setAttribute("content", "noindex,nofollow");
}

createRoot(document.getElementById("root")!).render(<App />);
