import {attentionHeadline} from "@/lib/attentionText";
import {test,expect} from "vitest";
test("h",()=>{expect(attentionHeadline("1. Call Chad to confirm spaces. 2. Check deed")).toBe("Call Chad to confirm spaces");expect(attentionHeadline("Call the cemetery. Then wait")).toBe("Call the cemetery");});
