import { describe, expect, it } from "vitest";
import { requestedSpaces } from "../../supabase/functions/buyer-agent/requestedSpaces";

describe("buyer requested space count", () => {
  it("reads '2 plots for husband and wife' from the notes (Marinell Turnage)", () => {
    expect(requestedSpaces(null, "Property type: Burial Plot(s)\nNotes: 2 plots for husband and wife")).toBe(2);
  });
  it("treats a companion crypt request as two spaces", () => {
    expect(requestedSpaces(null, "Looking for a companion crypt")).toBe(2);
  });
  it("prefers the form field when filled", () => {
    expect(requestedSpaces("3", "2 plots")).toBe(3);
  });
  it("reads written numbers", () => {
    expect(requestedSpaces(null, "we need two spaces")).toBe(2);
  });
  it("returns 0 when no count is given", () => {
    expect(requestedSpaces(null, "Looking at Grove Hill")).toBe(0);
  });
});
