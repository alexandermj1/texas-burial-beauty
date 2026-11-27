import type { Plugin } from "vite";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { STATIC_ROUTES, type RouteMeta } from "./route-meta";
import { bayCemeteries } from "../src/data/cemeteries";
import { FLAGSHIP_CEMETERIES } from "../src/data/flagshipCemeteries";


const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const SITE_URL = "https://texascemeterybrokers.com";
const DEFAULT_OG = `${SITE_URL}/images/og-default.jpg`;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Replace the <title>, description, canonical, and og:* tags in the built
// index.html with route-specific values. Other tags (geo, twitter, JSON-LD,
// script tags) pass through untouched so the SPA still hydrates normally.
export function renderRouteHtml(shell: string, meta: RouteMeta): string {
  const url = SITE_URL + meta.path;
  const title = !meta.preserveTitle && meta.title.length > 60 ? meta.title.slice(0, 57) + "..." : meta.title;
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
    const slug = slugify(c.name);
    const flagship = FLAGSHIP_CEMETERIES.find((f) => f.slug === slug);
    if (flagship) {
      return { path: `/cemeteries/${slug}`, title: flagship.seo.title, description: flagship.seo.description };
    }
    const title = `${c.name} | Cemetery Plots in ${c.city}, TX`;
    const description = `Cemetery plots, niches and crypts available at ${c.name} in ${c.city}, Texas. Below-market resale through trusted brokers.`;
    return {
      path: `/cemeteries/${slug}`,
      title,
      description,
    };
  });
}


const ROOT_TAG = '<div id="root"></div>';

type PageRenderer = (pathname: string) => Promise<string>;

// Node has no browser storage; the app only needs these to exist while its
// pages are rendered to HTML at build time.
function installStorageStubs() {
  const g = globalThis as Record<string, unknown>;
  for (const name of ["localStorage", "sessionStorage"]) {
    if (g[name]) continue;
    const data = new Map<string, string>();
    g[name] = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, String(v)),
      removeItem: (k: string) => void data.delete(k),
      clear: () => data.clear(),
      key: (i: number) => [...data.keys()][i] ?? null,
      get length() {
        return data.size;
      },
    };
  }
}

// Bundles src/entry-prerender.tsx for Node and returns its render function.
// Any failure returns null, so a publish never breaks: pages then ship with
// the metadata-only shell as before.
async function loadPageRenderer(root: string): Promise<PageRenderer | null> {
  try {
    const { build } = await import("vite");
    const react = (await import("@vitejs/plugin-react-swc")).default;
    const outDir = path.join(root, "node_modules", ".prerender-ssr");
    await build({
      root,
      configFile: false,
      logLevel: "error",
      plugins: [react()],
      resolve: {
        alias: [
          { find: "@", replacement: path.join(root, "src") },
          { find: /^leaflet$/, replacement: path.join(root, "scripts", "ssr-stubs", "leaflet.ts") },
        ],
      },
      build: {
        ssr: path.join(root, "src", "entry-prerender.tsx"),
        outDir,
        emptyOutDir: true,
        minify: false,
        rollupOptions: { output: { format: "esm", entryFileNames: "entry-prerender.mjs" } },
      },
    });
    installStorageStubs();
    const mod = await import(pathToFileURL(path.join(outDir, "entry-prerender.mjs")).href + `?t=${Date.now()}`);
    return mod.render as PageRenderer;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[prerender-routes] page content rendering unavailable:", (error as Error)?.message ?? error);
    return null;
  }
}

// Places a page's rendered content inside #root. The homepage file is also
// what the host serves for addresses with no file of their own (admin, signing
// links), so a tiny inline script empties the content whenever the address in
// the browser is not the page it was rendered for.
export function injectPageContent(html: string, content: string, routePath: string): string {
  if (!content || !html.includes(ROOT_TAG)) return html;
  const guard =
    `<script>(function(){var r=document.getElementById("root"),p=location.pathname.replace(/\\/+$/,"")||"/";` +
    `if(r&&p!==r.getAttribute("data-prerendered"))r.innerHTML="";})()</script>`;
  return html.replace(ROOT_TAG, () => `<div id="root" data-prerendered="${esc(routePath)}">${content}</div>${guard}`);
}

export default function prerenderRoutes(): Plugin {
  let outDirConfig = "dist";
  let rootDir = process.cwd();
  return {
    name: "prerender-routes",
    apply: "build",
    configResolved(config) {
      outDirConfig = config.build.outDir;
      rootDir = config.root;
    },
    async closeBundle() {
      const distDir = path.resolve(rootDir, outDirConfig);
      const shellPath = path.join(distDir, "index.html");
      let shell: string;
      try {
        shell = await fs.readFile(shellPath, "utf8");
      } catch {
        return; // No build output (e.g. ssr build) — nothing to do.
      }

      const renderPage = await loadPageRenderer(rootDir);
      const routes: RouteMeta[] = [...STATIC_ROUTES, ...cemeteryRoutes()];
      let written = 0;
      let withContent = 0;
      const failures: string[] = [];
      for (const route of routes) {
        let html = renderRouteHtml(shell, route);
        if (renderPage) {
          try {
            html = injectPageContent(html, await renderPage(route.path), route.path);
            withContent++;
          } catch (error) {
            failures.push(`${route.path}: ${(error as Error)?.message ?? error}`);
          }
        }
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
      console.log(`[prerender-routes] wrote ${written} route HTML files, ${withContent} with page content`);
      for (const f of failures.slice(0, 20)) {
        // eslint-disable-next-line no-console
        console.warn(`[prerender-routes] no content for ${f}`);
      }
    },
  };
}
