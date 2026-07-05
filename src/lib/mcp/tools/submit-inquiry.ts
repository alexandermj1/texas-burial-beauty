import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "submit_inquiry",
  title: "Submit buyer/seller inquiry",
  description:
    "Create a new inquiry (buyer question, seller quote request, or general contact) that will land in the Texas Cemetery Brokers admin inbox.",
  inputSchema: {
    name: z.string().min(1).describe("Full name of the person inquiring."),
    email: z.string().email().describe("Contact email."),
    phone: z.string().optional().describe("Contact phone (optional)."),
    kind: z.enum(["buyer", "seller", "general"]).describe("Type of inquiry."),
    cemetery: z.string().optional().describe("Cemetery of interest (optional)."),
    message: z.string().min(1).describe("The message body."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name, email, phone, kind, cemetery, message }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await supabase
      .from("submissions" as any)
      .insert({
        name,
        email,
        phone: phone ?? null,
        kind,
        cemetery: cemetery ?? null,
        message,
        source: "mcp",
      })
      .select()
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: `Inquiry received. Reference: ${(data as any)?.id ?? "n/a"}` }],
      structuredContent: { submission: data },
    };
  },
});
