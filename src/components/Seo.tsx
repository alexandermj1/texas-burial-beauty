import { useEffect } from "react";

const SITE_URL = "https://texascemeterybrokers.com";
const DEFAULT_OG = `${SITE_URL}/images/og-default.jpg`;
const SITE_NAME = "Texas Cemetery Brokers";

export interface SeoProps {
  title: string;
  description: string;
  /** Canonical path beginning with "/" — full URL is built from SITE_URL. */
  path?: string;
  image?: string;
  /** Either "website" or "article". */
  type?: "website" | "article";
  /** Optional structured data objects (JSON-LD). */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Set true for auth/dashboard pages so search engines do not index them. */
  noindex?: boolean;
}

const upsertMeta = (
  attr: "name" | "property",
  key: string,
  content: string,
) => {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const upsertLink = (rel: string, href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

const setJsonLd = (data: Record<string, unknown> | Record<string, unknown>[]) => {
  // Remove previous page-level JSON-LD blocks (keep org block from index.html)
  document.head
    .querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"][data-seo="page"]')
    .forEach((s) => s.remove());
  const arr = Array.isArray(data) ? data : [data];
  arr.forEach((d) => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.seo = "page";
    script.text = JSON.stringify(d);
    document.head.appendChild(script);
  });
};

/**
 * Per-route SEO. Mutates document.head to set title, description, canonical,
 * Open Graph, Twitter Card, robots, and optional JSON-LD structured data.
 *
 * Use one <Seo /> per page near the top of the returned tree.
 */
const Seo = ({
  title,
  description,
  path = "/",
  image = DEFAULT_OG,
  type = "website",
  jsonLd,
  noindex = false,
}: SeoProps) => {
  useEffect(() => {
    const fullTitle =
      title.length > 60 ? title.slice(0, 57) + "..." : title;
    const desc =
      description.length > 160 ? description.slice(0, 157) + "..." : description;
    const url = SITE_URL + (path.startsWith("/") ? path : "/" + path);

    document.title = fullTitle;

    upsertMeta("name", "description", desc);
    upsertMeta("name", "robots", noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1");

    upsertLink("canonical", url);

    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:locale", "en_US");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", desc);
    upsertMeta("name", "twitter:image", image);

    if (jsonLd) setJsonLd(jsonLd);
  }, [title, description, path, image, type, jsonLd, noindex]);

  return null;
};

export default Seo;
export { SITE_URL, SITE_NAME };
