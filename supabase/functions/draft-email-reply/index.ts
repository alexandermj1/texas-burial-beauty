// Drafts a full email reply using Lovable AI with a tool-calling architecture
// for cost efficiency. The initial system prompt is intentionally small (tone +
// business identity + rules). The model must call tools to load heavy reference
// material (listing agreement summary, POA summary, pricing details, cemetery
// info) — so tokens are only spent when the reply actually needs those facts.
//
// Model: google/gemini-3.1-flash-lite (cheap, supports tools via OpenRouter).
// Returns plain text — the composer converts it to HTML and preserves the
// existing greeting/signature convention.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

interface ThreadMsg { from: string; subject?: string; body: string; }

// --- Tool reference material (loaded only when the model asks) ------------
// Keep each blob short and factual. No sales language.
const LISTING_AGREEMENT_SUMMARY = `
Listing Agreement — key points (plain summary):
- Consignment/listing agreement between the seller and Texas Cemetery Brokers.
- Grants us the exclusive right to market and sell the interment property described (cemetery, section, spaces).
- Seller sets an "authorized minimum" net price. We may not accept less without written approval.
- Term: typically active until sold, cancelled in writing, or the parties agree otherwise.
- We handle marketing, buyer inquiries, negotiation, paperwork, and coordination with the cemetery for transfer.
- Seller is paid at closing after the cemetery completes the transfer of ownership.
- Seller certifies they own the property free of liens/co-owner disputes; co-owners must be disclosed.
- Signed by the seller (and any co-owner). We countersign after review.
`.trim();

const POA_SUMMARY = `
Power of Attorney (POA) — key points (plain summary):
- Limited POA authorizing Texas Cemetery Brokers to act on the seller's behalf for the specific transfer of the described interment property only.
- Lets us submit transfer paperwork, sign cemetery forms, and coordinate closing so the seller does not need to be present at the cemetery.
- Does NOT grant control over any other property, finances, or unrelated matters.
- Must be notarized. The seller can notarize in person or online (we send a Proof.com upload link with the packet).
- Expires when the transfer is completed or the listing is cancelled.
`.trim();

const PRICING_AND_OPTIONS = `
Listing options (factual, non-promotional):
- Starter — $0. Listed on our website.
- Pro — $99. In 2025 data, Pro listings sold on average 22% faster than Starter.
- Featured — $299. In 2025 data, Featured listings sold on average 61% faster. Useful context: ~90% of plot sales originate through mortuaries, so being near the top of the list they show families matters.
Quotes:
- We provide a valuation and a suggested listing price based on the specific cemetery and property type.
- Never promise a sale timeline or guarantee a sale.
- If a specific figure hasn't been given to the seller yet, say we will follow up with the exact figure rather than estimating.
`.trim();

const BUSINESS_FAQ = `
Business FAQ:
- We are a licensed Texas brokerage that helps families sell unused/duplicate cemetery property (plots, crypts, niches, mausoleum spaces).
- Model: consignment/listing brokerage. We do NOT buy property outright. We market and sell on the owner's behalf.
- Payment to seller: at closing, after the cemetery transfer is complete.
- Fees: seller pays the listing option they choose ($0/$99/$299). Our commission is agreed in the listing agreement and taken from the sale proceeds at closing.
- Cemetery transfer fees are charged by the cemetery itself, not by us. Amount varies by cemetery.
- Timeline: varies by cemetery, property type, and asking price. We do not guarantee a sale by a specific date.
- Territory: Texas.
`.trim();

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function lookupCemetery(name: string): Promise<string> {
  if (!name?.trim()) return "No cemetery name supplied.";
  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data } = await svc
    .from("texas_cemeteries")
    .select("name, city, county, address, transfer_fee, phone, notes")
    .ilike("name", `%${name.trim()}%`)
    .limit(3);
  if (!data?.length) return `No record found for "${name}".`;
  return data.map((c: any) => {
    const parts = [
      `Name: ${c.name}`,
      c.city && `City: ${c.city}`,
      c.county && `County: ${c.county}`,
      c.address && `Address: ${c.address}`,
      c.transfer_fee != null ? `Transfer fee: $${c.transfer_fee}` : `Transfer fee: not on file`,
      c.notes && `Notes: ${String(c.notes).slice(0, 300)}`,
    ].filter(Boolean);
    return parts.join("\n");
  }).join("\n---\n");
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "get_listing_agreement_summary",
      description: "Returns a plain-language summary of the Texas Cemetery Brokers Listing Agreement. Call this only when the customer asks about the listing agreement, contract terms, exclusivity, commission mechanics, or what they'd be signing.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_poa_summary",
      description: "Returns a plain-language summary of the Power of Attorney used for transfer. Call this only when the customer asks about the POA, notarization, why it's needed, or what it authorizes.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pricing_and_options",
      description: "Returns the current listing options ($0/$99/$299), their factual 2025 performance stats, and pricing/quote rules. Call this only when the customer asks about listing packages, prices, or how quotes work.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_business_faq",
      description: "Returns general business facts: brokerage model, payment timing, commission, transfer fees, territory. Call this only when the customer asks a general 'how does this work' question that isn't covered elsewhere.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_cemetery",
      description: "Looks up a specific Texas cemetery in our directory and returns name, city, county, address, transfer fee (if on file), and notes. Call this only when the customer asks about a specific cemetery's details, address, or transfer fee.",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "Cemetery name to search for." } },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
];

async function runTool(name: string, args: any): Promise<string> {
  switch (name) {
    case "get_listing_agreement_summary": return LISTING_AGREEMENT_SUMMARY;
    case "get_poa_summary": return POA_SUMMARY;
    case "get_pricing_and_options": return PRICING_AND_OPTIONS;
    case "get_business_faq": return BUSINESS_FAQ;
    case "lookup_cemetery": return await lookupCemetery(String(args?.name || ""));
    default: return `Unknown tool: ${name}`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const {
      recipientName,
      recipientEmail,
      adminName,
      subject,
      instructions,
      thread,
      customerLastMessage,
    } = await req.json();

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Small, tone-focused system prompt. Heavy reference material lives in tools.
    const system = `
You draft email replies for Texas Cemetery Brokers, a licensed Texas brokerage that helps families sell unused cemetery property.

TONE — this is the most important instruction:
- Warm, calm, human, consultative. Sound like a helpful person, not a salesperson.
- Never pushy. No superlatives ("amazing", "best", "incredible", "unbeatable"). No exclamation marks unless the customer used them first.
- Do not pitch listing options unless the customer asks about them or the admin instructions tell you to include them.
- Short paragraphs. Plain language. Answer the customer's actual question first.
- Georgia-serif brand voice: understated, respectful.

FORMAT:
- Plain text. Start with "Dear <first name>," and end with a signature block: the admin's name, then "Cemetery Salesperson", "Texas Cemetery Brokers", then the website www.texascemeterybrokers.com.
- No markdown, no bullets with *, no headings, no emojis.

RULES:
- Follow the admin's instructions above all else.
- If the admin supplies specific facts (prices, availability, dates, cemetery details), use them verbatim. Never invent numbers.
- If a figure the customer asked for wasn't supplied, say we will follow up with the exact figure rather than guessing.
- Never mention AI or that this reply was drafted by AI.
- Never mention competitors or compare cemetery prices.

TOOLS — use sparingly to keep costs down:
- Only call a tool when the customer's question or the admin's instructions actually require that specific information.
- Do NOT call tools "just in case". If the reply doesn't need contract details, don't fetch them.
- Never call more than 2 tools for one reply unless clearly necessary.
- After you have what you need, write the final reply as plain text — no tool calls in the final message.
`.trim();

    const threadBlock = Array.isArray(thread) && thread.length
      ? thread.map((m: ThreadMsg, i: number) => {
          const who = m.from === "us" ? "US" : m.from === "them" ? "CUSTOMER" : m.from.toUpperCase();
          return `[${i + 1}] ${who}${m.subject ? ` — Subject: ${m.subject}` : ""}\n${m.body}`;
        }).join("\n\n---\n\n")
      : (customerLastMessage ? `[1] CUSTOMER\n${customerLastMessage}` : "(no prior thread supplied)");

    const userMsg = `
RECIPIENT: ${recipientName || "(unknown)"} <${recipientEmail || "unknown"}>
ADMIN (sender name for signature): ${adminName || "Texas Cemetery Brokers"}
SUBJECT LINE (context only, do not repeat inside body): ${subject || "(none)"}

PRIOR THREAD (oldest → newest):
${threadBlock}

ADMIN INSTRUCTIONS FOR THIS REPLY:
${instructions?.trim() || "(none — write a natural, helpful reply to the customer's last message)"}

Write the reply. Call tools ONLY if you need specific facts you don't already have.
`.trim();

    const messages: any[] = [
      { role: "system", content: system },
      { role: "user", content: userMsg },
    ];

    // Tool-calling loop. Cap at 3 rounds to prevent runaway spend.
    let draft = "";
    for (let round = 0; round < 3; round++) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-lite",
          messages,
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        if (resp.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit reached, please try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (resp.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: `AI error: ${errText}` }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await resp.json();
      const choice = data?.choices?.[0]?.message;
      if (!choice) break;

      const toolCalls = choice.tool_calls || [];
      if (toolCalls.length > 0) {
        // Preserve the assistant tool_calls message and append tool results.
        messages.push({
          role: "assistant",
          content: choice.content ?? "",
          tool_calls: toolCalls,
        });
        for (const tc of toolCalls) {
          let args: any = {};
          try { args = JSON.parse(tc.function?.arguments || "{}"); } catch { /* ignore */ }
          const result = await runTool(tc.function?.name, args);
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: result,
          });
        }
        continue; // ask the model again with tool outputs
      }

      draft = (choice.content || "").replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
      break;
    }

    if (!draft) {
      return new Response(JSON.stringify({ error: "Empty draft" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ draft }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
