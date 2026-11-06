import { describe, expect, it } from "vitest";
import { routeWake, replySendAt, isQuietTime, clampCheckBackDays, diffFingerprint, type Fingerprint } from "../../supabase/functions/_shared/autopilotPolicy";

const fp: Fingerprint = { seller_email: "a", our_email: "b", staff_note: "c", files: "d", payments: "e", contracts: "f", documents: "g", family_tree: "h", record: "i" };
const now = Date.parse("2026-11-10T18:00:00Z"); // Tue 12:00 Texas
const mem = (o: Partial<any> = {}) => ({ due_at: null, suspect_problem: false, reminder_count: 0, last_full_review_at: new Date(now - 86400_000).toISOString(), fingerprint: fp, ...o });

describe("autopilot wake routing", () => {
  it("does nothing while a person is handling the record", () => {
    expect(routeWake({ memory: mem(), now: { ...fp, seller_email: "x" }, at: now, humanOpen: true }).kind).toBe("human");
  });
  it("waits when nothing changed and the check-back isn't due", () => {
    expect(routeWake({ memory: mem({ due_at: new Date(now + 3600_000).toISOString() }), now: fp, at: now, humanOpen: false }).kind).toBe("wait");
  });
  it("reviews a new unanswered email even when the silent follow-up is days away", () => {
    expect(routeWake({ memory: mem({ due_at: "2026-11-13T18:00:00Z" }), now: { ...fp, seller_email: "unanswered" }, at: now, humanOpen: false }).kind).toBe("catch_up");
  });
  it("checks back when due and nothing changed", () => {
    expect(routeWake({ memory: mem({ due_at: new Date(now - 1).toISOString() }), now: fp, at: now, humanOpen: false }).kind).toBe("checkback");
  });
  it("hands to a person after 3 unanswered reminders", () => {
    expect(routeWake({ memory: mem({ due_at: new Date(now - 1).toISOString(), reminder_count: 3 }), now: fp, at: now, humanOpen: false }).kind).toBe("escalate_reminders");
  });
  it("only a staff note or seller email → quick catch-up", () => {
    expect(routeWake({ memory: mem(), now: { ...fp, staff_note: "z" }, at: now, humanOpen: false }).kind).toBe("catch_up");
    expect(routeWake({ memory: mem(), now: { ...fp, seller_email: "z" }, at: now, humanOpen: false }).kind).toBe("catch_up");
  });
  it("uploads, signatures, payments and paperwork changes → full review", () => {
    for (const k of ["files", "contracts", "payments", "documents", "family_tree"] as const) {
      expect(routeWake({ memory: mem(), now: { ...fp, [k]: "z" }, at: now, humanOpen: false }).kind).toBe("full");
    }
  });
  it("a lot changed, a suspected problem, or 14+ days since a full review → full review", () => {
    expect(routeWake({ memory: mem(), now: { ...fp, seller_email: "1", staff_note: "2", record: "3" }, at: now, humanOpen: false }).kind).toBe("full");
    expect(routeWake({ memory: mem({ suspect_problem: true }), now: { ...fp, staff_note: "z" }, at: now, humanOpen: false }).kind).toBe("full");
    expect(routeWake({ memory: mem({ last_full_review_at: new Date(now - 15 * 86400_000).toISOString() }), now: { ...fp, staff_note: "z" }, at: now, humanOpen: false }).kind).toBe("full");
  });
  it("no memory yet → full review", () => {
    expect(routeWake({ memory: null, now: fp, at: now, humanOpen: false }).kind).toBe("full");
    expect(diffFingerprint(null, fp).length).toBe(9);
  });
});

describe("natural reply timing", () => {
  it("new email: 8–25 minutes", () => {
    expect(replySendAt({ now, inConversation: false, words: 0, rand: 0 }) - now).toBe(8 * 60_000);
    expect(replySendAt({ now, inConversation: false, words: 0, rand: 1 }) - now).toBe(25 * 60_000);
  });
  it("in a conversation: 3–9 minutes", () => {
    expect(replySendAt({ now, inConversation: true, words: 0, rand: 0 }) - now).toBe(3 * 60_000);
    expect(replySendAt({ now, inConversation: true, words: 0, rand: 1 }) - now).toBe(9 * 60_000);
  });
  it("long replies wait longer, capped at 10 extra minutes", () => {
    expect(replySendAt({ now, inConversation: false, words: 400, rand: 0 }) - now).toBe(13 * 60_000);
    expect(replySendAt({ now, inConversation: false, words: 5000, rand: 0 }) - now).toBe(18 * 60_000);
  });
  it("never sends at night or on Sunday (Texas time)", () => {
    expect(isQuietTime(Date.parse("2026-11-11T04:00:00Z"))).toBe(true); // 10pm Tue
    expect(isQuietTime(Date.parse("2026-11-15T18:00:00Z"))).toBe(true); // Sunday noon
    const late = Date.parse("2026-11-11T02:50:00Z"); // 8:50pm Tue
    const at = replySendAt({ now: late, inConversation: false, words: 0, rand: 1, rand2: 0 });
    expect(new Date(at).toISOString()).toBe("2026-11-11T13:30:00.000Z"); // 7:30am Wed
  });
  it("check-back days are kept between 1 and 14", () => {
    expect(clampCheckBackDays(0)).toBe(1);
    expect(clampCheckBackDays(30)).toBe(14);
    expect(clampCheckBackDays("x")).toBe(3);
  });
});
