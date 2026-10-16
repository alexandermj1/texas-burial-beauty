import { describe, expect, it } from "vitest";
import { automaticReplyTiming } from "../../supabase/functions/buyer-agent/replyTiming";

describe("minimum automatic buyer reply delay", () => {
  const created = "2026-10-16T20:54:22.348Z";
  const start = Date.parse(created);

  it("blocks the observed 51-second immediate form reply", () => {
    expect(automaticReplyTiming(created, Date.parse("2026-10-16T20:55:13.259Z")).due).toBe(false);
  });

  it("waits at least 20 full minutes, including the last millisecond", () => {
    expect(automaticReplyTiming(created, start + 20 * 60 * 1000 - 1).due).toBe(false);
    expect(automaticReplyTiming(created, start + 20 * 60 * 1000).due).toBe(true);
    expect(automaticReplyTiming(created, start + 30 * 60 * 1000).due).toBe(true);
    expect(automaticReplyTiming(created, start).eligibleAt).toBe("2026-10-16T21:14:22.348Z");
  });

  it("blocks missing, invalid and future creation times", () => {
    for (const value of [null, undefined, "not a date", "2026-10-17T00:00:00Z"]) {
      expect(automaticReplyTiming(value, start).due).toBe(false);
    }
  });
});