import { describe, expect, it } from "vitest";
import { loginIdentifier } from "../lib/loginIdentifier";
import { canUseAi } from "../lib/aiAccess";

describe("Susie staff identity", () => {
  it("accepts Susie as a mailbox-free username without exposing profile emails", () => {
    expect(loginIdentifier(" Susie ")).toBe("susie@staff.texascemeterybrokers.invalid");
    expect(loginIdentifier(" Cici@BayerBrokers.com ")).toBe("cici@bayerbrokers.com");
    expect(loginIdentifier("unknown")).toBe("unknown");
  });
  it("has the same AI restriction as Cici", () => {
    expect(canUseAi("fcb3b678-3ac9-4207-83fe-86fb7952ae41")).toBe(false);
    expect(canUseAi("e07b4a4c-56d1-4b2f-bc27-7989314d008f")).toBe(false);
    expect(canUseAi("8c6be60c-cfea-4f0d-a9de-09a68bc0c0a5")).toBe(true);
  });
});