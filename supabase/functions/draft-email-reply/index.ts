// Drafts a full email reply using Lovable AI (gemini-3.1-flash-lite for cost).
// Takes optional prior thread messages + admin instructions + facts to include.
// Returns plain text — the composer converts it to HTML and preserves the
// existing greeting/signature convention.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface ThreadMsg {
  from: string;         // "them" | "us" | raw address
  subject?: string;
  body: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const {
      recipientName,
      recipientEmail,
      adminName,
      subject,
      instructions,     // free-form: how to reply, what to say, tone, facts
      thread,           // ThreadMsg[]
      customerLastMessage, // convenience: string; used if thread empty
    } = await req.json();

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const knowledge = `
BUSINESS: Texas Cemetery Brokers — a licensed brokerage that helps families sell unused/duplicate cemetery property (plots, crypts, niches, mausoleum spaces) across Texas.
MODEL: Consignment/listing brokerage. We do NOT buy property outright. We market and sell on the owner's behalf; the owner is paid at closing after cemetery transfer.
LISTING OPTIONS (mention only if relevant to the question):
  • Starter — $0 listed on our site
  • Pro — $99 (2025 data: 22% faster average time to sale)
  • Featured — $299 (2025 data: 61% faster in 2025; strong right now due to elevated buyer demand; ~90% of plot sales originate through mortuaries so being top of their list matters)
QUOTES: We provide a valuation and a suggested listing price. Prices vary by cemetery and property type. Never promise a sale timeline or guarantee a sale.
CONTACT: info@texascemeterybrokers.com · www.texascemeterybrokers.com
TONE: Warm, professional, consultative, concise. Never pushy. Never salesy superlatives. Georgia-serif brand voice.
FORMATTING: Plain text. Include a greeting line "Dear <first name>," and a sign-off with the admin's name, "Cemetery Salesperson", "Texas Cemetery Brokers", and the website. Use short paragraphs. Do NOT use markdown, bullets with *, or headings.
RULES:
  - Follow the admin's instructions above all else.
  - If the admin supplies facts (prices, availability, dates), use them verbatim; do NOT invent numbers.
  - If a specific figure isn't provided and the customer asked for one, say we'll follow up with the exact figure rather than guessing.
  - Never mention competitors or other cemeteries by comparative price.
  - Never mention AI, "as an AI", or that this reply was drafted by AI.
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
SUBJECT LINE (for context, do not repeat inside body): ${subject || "(none)"}

PRIOR THREAD (oldest → newest):
${threadBlock}

ADMIN INSTRUCTIONS FOR THIS REPLY:
${instructions?.trim() || "(none — write a natural, helpful reply to the customer's last message)"}

Write the full reply as plain text now. Start with "Dear <first name>," and end with the standard sign-off block.
`.trim();

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite",
        messages: [
          { role: "system", content: knowledge },
          { role: "user", content: userMsg },
        ],
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
    let draft: string = data?.choices?.[0]?.message?.content ?? "";
    draft = draft.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

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
