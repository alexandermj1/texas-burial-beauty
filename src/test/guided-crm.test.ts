import { describe, it, expect } from "vitest";
import { snapshotQueue, advanceQueue, queueOutcomeBody, guidedTaskCount } from "../lib/guidedCrm";

describe("one-record-at-a-time CRM", () => {
  it("counts each open staff task and an unanswered customer separately", () => {
    const tasks = [{ id: "call", status: "proposed", action_type: "flag_human" }, { id: "check", status: "proposed", action_type: "flag_human" }];
    expect(guidedTaskCount(tasks, true)).toBe(3);
    expect(guidedTaskCount(tasks, false)).toBe(2);
  });
  it("does not count closed tasks, AI work or duplicate tasks", () => {
    expect(guidedTaskCount([
      { id: "call", status: "proposed", action_type: "flag_human" },
      { id: "call", status: "proposed", action_type: "flag_human" },
      { id: "done", status: "acknowledged", action_type: "flag_human" },
      { id: "ai", status: "proposed", action_type: "update_fields" },
    ], false)).toBe(1);
    expect(guidedTaskCount([], false)).toBe(0);
  });
  it("preserves the supplied priority order and does not mutate it", () => {
    const source = ["unanswered", "urgent-task", "routine", "unanswered"];
    expect(snapshotQueue(source)).toEqual(["unanswered", "urgent-task", "routine"]);
    expect(source).toHaveLength(4);
  });
  it("cannot skip the first record", () => {
    expect(() => advanceQueue(["first", "second"], [], { recordId: "second", outcome: "worked", noteId: "saved" })).toThrow();
  });
  it("advances exactly one record with a saved outcome", () => {
    const first = advanceQueue(["first", "second"], [], { recordId: "first", outcome: "worked", noteId: "note-1" });
    const next = advanceQueue(["first", "second"], first, { recordId: "second", outcome: "waiting", noteId: "note-2" });
    expect(next.map(r => r.recordId)).toEqual(["first", "second"]);
    expect(first).toHaveLength(1);
  });
  it("does not advance without a saved note", () => {
    expect(() => advanceQueue(["first"], [], { recordId: "first", outcome: "reviewed", noteId: " " })).toThrow();
  });
  it("requires findings even for waiting or no-action records", () => {
    for (const outcome of ["worked", "waiting", "reviewed"] as const) {
      expect(() => queueOutcomeBody(outcome, " ")).toThrow();
    }
  });
  it("records waiting without claiming task or pipeline completion", () => {
    expect(queueOutcomeBody("waiting", "Cemetery callback due Monday.")).toBe("Guided work · Waiting / blocked\nCemetery callback due Monday.");
  });
});