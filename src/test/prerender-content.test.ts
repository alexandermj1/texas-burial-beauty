import { describe, expect, it } from "vitest";
import { injectPageContent } from "../../scripts/prerender-plugin";

const shell = '<html><body><div id="root"></div></body></html>';

describe("build-time page content", () => {
  it("places the page's content inside #root, tagged with the page it belongs to", () => {
    const out = injectPageContent(shell, "<h1>Buy a plot</h1>", "/buy");
    expect(out).toContain('<div id="root" data-prerendered="/buy"><h1>Buy a plot</h1></div>');
  });

  it("adds the guard that empties the content when the address is a different page", () => {
    const out = injectPageContent(shell, "<h1>Home</h1>", "/");
    expect(out).toContain('p!==r.getAttribute("data-prerendered")');
    expect(out).toContain('r.innerHTML=""');
  });

  it("leaves the shell untouched when a page could not be rendered", () => {
    expect(injectPageContent(shell, "", "/buy")).toBe(shell);
  });
});
