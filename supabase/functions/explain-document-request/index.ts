import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

type ExplainItem = {
  code: string;
  label: string;
  person: string | null;
  jointNames: string[];
  why: string;
  status: string;
  contractKind: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const asUser = createClient(SUPABASE_URL, SERVICE_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: auth } = await asUser.auth.getUser();
    if (!auth.user) return json({ error: "Please sign in again." }, 401);
    const { data: allowed } = await svc.rpc("has_role", { _user_id: auth.user.id, _role: "admin" });
    const { data: staff } = await svc.rpc("has_role", { _user_id: auth.user.id, _role: "staff" });
    if (!allowed && !staff) return json({ error: "Staff access is required." }, 403);

    const body = await req.json();
    const submissionId = typeof body?.submission_id === "string" ? body.submission_id : "";
    const items: ExplainItem[] = Array.isArray(body?.items) ? body.items.slice(0, 40) : [];
    if (!submissionId || !items.length) return json({ error: "The document request is not ready to explain." }, 400);
    const { data: sub } = await svc.from("contact_submissions")
      .select("id,name,cemetery,deed_owner_names,ownership_answers,documents_requested_at")
      .eq("id", submissionId).maybeSingle();
    if (!sub) return json({ error: "Seller record not found." }, 404);

    const useful = items.filter((item) => !["D1", "D2", "D2P"].includes(item.code));
    if (!useful.length) return json({ explanation: "The request only contains the standard ownership certificate and identification items." });

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured." }, 500);
    const facts = {
      seller: sub.name,
      cemetery: sub.cemetery,
      deedOwners: sub.deed_owner_names,
      familyAnswers: sub.ownership_answers,
      requestSent: !!sub.documents_requested_at,
      requestedItems: useful,
    };
    const response = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        instructions: "You explain an internal cemetery-property document request to office staff. Use only supplied facts. Write 2-5 short plain-English sentences. Explain ownership, family relationships, marriages, deaths, and why those facts produce individual or joint powers of attorney or other non-obvious paperwork. Do not explain photo ID or certificate-of-ownership requests. Do not mention document codes, statutes, IDs, rules engines, software, preparation status, or legal advice. Do not claim anything was sent, signed, received, or prepared unless the facts explicitly say so. Use people's names. No heading, bullets, markdown, or invented facts.",
        input: JSON.stringify(facts),
      }),
    });
    if (!response.ok) {
      const safe = await response.text();
      const message = (() => { try { return JSON.parse(safe)?.message || JSON.parse(safe)?.error; } catch { return safe; } })();
      return json({ error: String(message || "AI could not explain this request.") }, response.status);
    }
    if (!response.body) return json({ error: "AI returned no explanation stream." }, 500);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let explanation = "";
    let reasoningSummary = "";
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const lines = buffer.split("\n");
      buffer = done ? "" : lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === "response.output_text.delta") explanation += String(event.delta ?? "");
          if (event.type === "response.reasoning_summary_text.delta") reasoningSummary += String(event.delta ?? "");
          if (event.type === "response.completed" && !explanation) {
            explanation = String(event.response?.output_text ?? "");
          }
        } catch {
          // Ignore non-JSON keepalive events.
        }
      }
      if (done) break;
    }
    explanation = (explanation || reasoningSummary).replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    if (!explanation) return json({ error: "AI returned no explanation." }, 500);
    return json({ explanation });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Could not explain this request." }, 500);
  }
});