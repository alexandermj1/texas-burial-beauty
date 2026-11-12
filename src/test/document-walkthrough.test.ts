import { describe, expect, it } from "vitest";
import { documentWalkthroughLink } from "../../supabase/functions/_shared/documentWalkthrough";

describe("document walkthrough links", () => {
  it("keeps the customer's existing request reference when opening the film", () => {
    const result = new URL(documentWalkthroughLink("https://www.texascemeterybrokers.com/documents?s=alexander-test"));
    expect(result.searchParams.get("s")).toBe("alexander-test");
    expect(result.pathname).toBe("/documents");
    expect(result.hash).toBe("#document-walkthrough");
  });
});