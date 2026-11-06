import { describe, it, expect } from "vitest";
import { parseJson } from "../../supabase/functions/_shared/recordAgent";
describe("research answer parsing", () => {
  it("reads a fenced answer containing an invalid \\' escape", () => {
    const text = "` ` `json\n{\"facts\":[{\"fact\":\"told Roberta: 'your family\\'s well-being'\",\"source\":\"email\"}]}\n` ` `";
    expect(parseJson(text)?.facts[0].fact).toBe("told Roberta: 'your family's well-being'");
  });
  it("still reads normal fenced JSON", () => {
    expect(parseJson("```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
  });
});
