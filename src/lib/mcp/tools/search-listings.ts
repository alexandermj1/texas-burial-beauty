import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "search_listings",
  title: "Search active listings",
  description:
    "Search active cemetery property listings by cemetery name, city, or plot type. Returns id, cemetery, city, plot type, spaces, and section.",
  inputSchema: {
    query: z.string().optional().describe("Free-text match against cemetery, city, or plot type."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    let q = supabase
      .from("listings")
      .select("id, cemetery, city, plot_type, section, spaces, status")
      .eq("status", "active")
      .limit(limit ?? 20);
    if (query && query.trim()) {
      const term = `%${query.trim()}%`;
      q = q.or(`cemetery.ilike.${term},city.ilike.${term},plot_type.ilike.${term}`);
    }
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { listings: data ?? [] },
    };
  },
});
