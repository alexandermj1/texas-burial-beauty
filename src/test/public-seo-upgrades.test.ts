import { describe, expect, it } from "vitest";
import { renderRouteHtml } from "../../scripts/prerender-plugin";
import { STATIC_ROUTES } from "../../scripts/route-meta";
import { COST_GUIDE_SEO, DIRECTORY_SEO, LAUREL_FORT_WORTH_SEO } from "../data/publicSeoUpgrades";
import { flagshipBySlug } from "../data/flagshipCemeteries";

const shell = '<title>Fallback</title><meta name="description" content="Fallback"><link rel="canonical" href="/"><meta property="og:title" content="Fallback"><meta property="og:url" content="/">';

describe("Muse SEO upgrades", () => {
  it("keeps the full directory title in crawler HTML", () => {
    const route = STATIC_ROUTES.find((r) => r.path === "/cemeteries");
    if (!route) throw new Error("Directory route missing");
    const html = renderRouteHtml(shell, route);
    expect(route.title).toBe(DIRECTORY_SEO.title);
    expect(html).toContain("Texas Cemetery Brokers</title>");
    expect(html).not.toContain("...");
    expect(html).toContain('href="https://texascemeterybrokers.com/cemeteries"');
  });

  it("shares guide and cemetery metadata with the crawler source", () => {
    const route = STATIC_ROUTES.find((r) => r.path === "/cemetery-plot-cost-texas");
    expect(route).toMatchObject(COST_GUIDE_SEO);
    expect(flagshipBySlug("laurel-land-memorial-park-fort-worth")?.seo).toMatchObject(LAUREL_FORT_WORTH_SEO);
    for (const meta of [COST_GUIDE_SEO, LAUREL_FORT_WORTH_SEO]) {
      expect(meta.title.length).toBeLessThanOrEqual(60);
      expect(meta.description.length).toBeLessThanOrEqual(155);
    }
  });

  it("preserves the protected homepage, Houston and Restland titles", () => {
    expect(STATIC_ROUTES.find((r) => r.path === "/")?.title).toBe("Texas Cemetery Brokers | Buy & Sell Cemetery Plots");
    expect(STATIC_ROUTES.find((r) => r.path === "/cemetery-plots-for-sale-houston")?.title).toBe("Cemetery Plots for Sale in Houston, TX | Below Retail");
    expect(flagshipBySlug("restland-memorial-park")?.seo.title).toBe("Restland Cemetery Plots for Sale, Dallas | Prices & Fees");
  });
});