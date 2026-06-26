// Proofreads an email body using Lovable AI. Returns a corrected version
// with the same meaning, tone, formatting, line breaks, greeting, and signature.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { body, subject } = await req.json();
    if (!body || typeof body !== "string" || !body.trim()) {
      return new Response(JSON.stringify({ error: "Missing body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = [
      "You are a professional email proofreader for a real estate brokerage (Texas Cemetery Brokers).",
      "Fix grammar, spelling, punctuation, and clarity issues in the email body provided.",
      "Preserve the author's meaning, tone, level of formality, and intent.",
      "Preserve all line breaks and paragraph spacing exactly.",
      "Preserve the greeting line (e.g. 'Dear X,') and the signature block at the end exactly as written.",
      "Do not add new content, sign-offs, disclaimers, or pleasantries that weren't already present.",
      "Do not change names, email addresses, phone numbers, prices, or cemetery names.",
      "Return ONLY the corrected email body as plain text — no commentary, no markdown fences, no quotes around it.",
    ].join(" ");

    const userMsg = `Subject: ${subject || "(none)"}\n\nEmail body to proofread:\n---\n${body}\n---`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI error: ${errText}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    let corrected: string = data?.choices?.[0]?.message?.content ?? "";
    // Strip accidental markdown code fences if the model added them.
    corrected = corrected.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();

    if (!corrected) {
      return new Response(JSON.stringify({ error: "No correction returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const changed = corrected.trim() !== body.trim();
    return new Response(JSON.stringify({ corrected, changed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
