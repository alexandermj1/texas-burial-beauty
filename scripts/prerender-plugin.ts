import type { Plugin } from "vite";
import { promises as fs } from "node:fs";
import path from "node:path";
import { STATIC_ROUTES, type RouteMeta } from "./route-meta";
import { bayCemeteries } from "../src/data/cemeteries";
import { slugify } from "../src/lib/cemeterySlug";

const SITE_URL = "https://texascemeterybrokers.com";
const DEFAULT_OG = `${SITE_URL}/images/og-default.jpg`;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Replace the <title>, description, canonical, and og:* tags in the built
// index.html with route-specific values. Other tags (geo, twitter, JSON-LD,
// script tags) pass through untouched so the SPA still hydrates normally.
function renderRouteHtml(shell: string, meta: RouteMeta): string {
  const url = SITE_URL + meta.path;
  const title = meta.title.length > 60 ? meta.title.slice(0, 57) + "..." : meta.title;
  const desc =
    meta.description.length > 160
      ? meta.description.slice(0, 157) + "..."
      : meta.description;
  const image = meta.ogImage ?? DEFAULT_OG;
  const type = meta.type ?? "website";

  let out = shell;

  // <title>
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);

  // meta description
  out = out.replace(
    /<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${esc(desc)}">`,
  );

  // canonical link
  out = out.replace(
    /<link\s+rel="canonical"[^>]*>/i,
    `<link rel="canonical" href="${esc(url)}" />`,
  );

  // og:url, og:title, og:description, og:image, og:type
  out = out.replace(
    /<meta\s+property="og:url"[^>]*>/i,
    `<meta property="og:url" content="${esc(url)}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:title"[^>]*>/i,
    `<meta property="og:title" content="${esc(title)}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:description"[^>]*>/i,
    `<meta property="og:description" content="${esc(desc)}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:image"(?![^>]*:)[^>]*>/i,
    `<meta property="og:image" content="${esc(image)}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:type"[^>]*>/i,
    `<meta property="og:type" content="${esc(type)}" />`,
  );

  // twitter title/description/image
  out = out.replace(
    /<meta\s+name="twitter:title"[^>]*>/i,
    `<meta name="twitter:title" content="${esc(title)}" />`,
  );
  out = out.replace(
    /<meta\s+name="twitter:description"[^>]*>/i,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
  );
  out = out.replace(
    /<meta\s+name="twitter:image"[^>]*>/i,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  );

  return out;
}

function cemeteryRoutes(): RouteMeta[] {
  return bayCemeteries.map((c) => {
    const title = `${c.name} | Cemetery Plots in ${c.city}, TX`;
    const description = `Cemetery plots, niches and crypts available at ${c.name} in ${c.city}, Texas. Below-market resale through trusted brokers.`;
    return {
      path: `/cemeteries/${slugify(c.name)}`,
      title,
      description,
    };
  });
}

export default function prerenderRoutes(): Plugin {
  return {
    name: "prerender-routes",
    apply: "build",
    async closeBundle() {
      const distDir = path.resolve(process.cwd(), "dist");
      const shellPath = path.join(distDir, "index.html");
      let shell: string;
      try {
        shell = await fs.readFile(shellPath, "utf8");
      } catch {
        return; // No build output (e.g. ssr build) — nothing to do.
      }

      const routes: RouteMeta[] = [...STATIC_ROUTES, ...cemeteryRoutes()];
      let written = 0;
      for (const route of routes) {
        const html = renderRouteHtml(shell, route);
        if (route.path === "/") {
          // Overwrite root index.html so the homepage gets the correct
          // og:url/canonical baked in (instead of falling through to the
          // generic shell).
          await fs.writeFile(shellPath, html, "utf8");
        } else {
          const outDir = path.join(distDir, route.path.replace(/^\//, ""));
          await fs.mkdir(outDir, { recursive: true });
          await fs.writeFile(path.join(outDir, "index.html"), html, "utf8");
        }
        written++;
      }
      // Log so the build output makes the work visible.
      // eslint-disable-next-line no-console
      console.log(`[prerender-routes] wrote ${written} route HTML files`);
    },
  };
}
