import { describe, expect, it } from "vitest";
import { DAILY_UPDATE_RECIPIENTS } from "../../supabase/functions/_shared/dailyUpdateRecipients";

describe("daily staff update recipients", () => {
  it("includes Cici on Alexander's daily updates without removing existing recipients", () => {
    expect(DAILY_UPDATE_RECIPIENTS).toEqual([
      "alexandermaclarenjames@gmail.com",
      "simonjamesphd@gmail.com",
      "emmamaclaren@gmail.com",
      "cici@bayerbrokers.com",
    ]);
  });
});