import { describe, it, expect } from "vitest";
import {
  buildMortuarySheetEmailBlock,
  SAMPLE_SHEET_URL,
  SAMPLE_SHEET_WEB_URL,
} from "@/lib/buildListingOptionsBlock";

describe("buildMortuarySheetEmailBlock", () => {
  it("inserts one block carrying both mortuary sheet links", () => {
    const html = buildMortuarySheetEmailBlock();
    expect(html).toContain('data-mortuary-sheet="1"');
    expect((html.match(/data-mortuary-sheet="1"/g) || []).length).toBe(1);
    expect(html).toContain(SAMPLE_SHEET_URL);
    expect(html).toContain(SAMPLE_SHEET_WEB_URL);
  });
});
