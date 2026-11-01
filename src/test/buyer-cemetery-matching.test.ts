import { describe, expect, it } from "vitest";
import { resolveBuyerCemetery } from "../../supabase/functions/buyer-agent/cemeteryMatching";

const bluebonnet = { name: "Bluebonnet Hills Memorial Park", city: "Colleyville", region: "Dallas–Fort Worth" };
const directory = [bluebonnet, { name: "Forest Park East", city: "Houston" }, { name: "Forest Park West", city: "Houston" }];
describe("buyer cemetery identity", () => {
  it("resolves Bruce's typed Bluebonnet Memorial Park to the inventory cemetery", () => {
    expect(resolveBuyerCemetery("Bluebonnet Memorial Park", directory, "Dallas–Fort Worth")).toEqual(bluebonnet);
  });
  it("resolves Bluebonnet shortened to one word", () => {
    expect(resolveBuyerCemetery("Bluebonnet", directory)).toEqual(bluebonnet);
  });
  it("recognises a small typing error", () => {
    expect(resolveBuyerCemetery("Bluebonet Hills cemetery", directory)).toEqual(bluebonnet);
  });
  it("does not guess an ambiguous shortened cemetery", () => {
    expect(resolveBuyerCemetery("Forest Park", directory)).toBeNull();
  });
  it("keeps East and West separate", () => {
    expect(resolveBuyerCemetery("Forest Park West", directory)?.name).toBe("Forest Park West");
    expect(resolveBuyerCemetery("Forest Park North", directory)).toBeNull();
  });
  it("does not treat a genuinely unknown cemetery as Bluebonnet", () => {
    expect(resolveBuyerCemetery("New Meadow Cemetery", directory)).toBeNull();
  });
});