// Reads everything we already know about a submission — the intake form, the
// admin notes and the full email chain — and proposes answers to the ownership
// questionnaire, with a short reason for each. The admin always keeps the final
// say; nothing here is written to the submission by this function.
//
// Model: google/gemini-3.1-flash-lite (cheap, structured output via tools).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const ANSWER_SCHEMA: Record<string, string[]> = {
  owner: ["living", "deceased", "trust", "org"],
  rel: ["self", "spouse", "child", "grandchild", "sibling", "nibling", "inlaw", "rep", "other"],
  signer: ["self", "agent"],
  agentType: ["poa", "guardian"],
  owners: ["sole", "multiple"],
  co: ["all", "deceased", "blocked"],
  marital: ["married", "divorced", "widowed", "single"],
  occupied: ["no", "yes"],
  will: ["yes", "no"],
  probate: ["letters", "muniment", "none"],
  beneficiaries: ["sole", "multiple"],
  heirclass: ["children", "parents", "siblings", "unsure"],
  heirship: ["court", "affidavit", "sea", "none"],
  spouse: ["yes", "no"],
  chain: ["one", "multi"],
  trustee: ["original", "successor"],
  orgStatus: ["active", "inactive"],
  deed: ["yes", "no"],
  names: ["yes", "no"],
};

const GUIDE = `
How to read a seller's file (Texas interment property):
- "owner" is who is printed on the cemetery's certificate of ownership, not who is emailing us.
- If the writer says "my mother's plot" and the mother has died → owner = deceased, rel = child.
- If the writer bought it themselves → owner = living, rel = self, signer = self.
- "we bought two plots", "my husband and I" → owners = multiple.
- Mentions of a spouse currently living → marital = married. "my late husband/wife" → widowed.
- "my dad is buried there", "one space is used" → occupied = yes.
- No mention of a will for a deceased owner is NOT the same as "no will" — leave blank unless stated.
- deed = yes only if they say they have the deed/certificate; deed = no if they say it is lost or they can't find it.
- names = no only if there is an actual mismatch mentioned (maiden name, name change).
Only answer what the file actually supports. Leave anything else out — a missing answer is far better than a guessed one.
`.trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { submission_id } = await req.json();
    if (!submission_id || typeof submission_id !== "string") {
      return new Response(JSON.stringify({ error: "submission_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: sub } = await supabase.from("contact_submissions")
      .select("id, name, email, phone, cemetery, property_type, spaces, section, lawn, space_numbers, plot_count, message, details, admin_notes, ownership_type, relationship_to_owner, deed_owner_names, deed_owners_status, purchase_info, prepaid_endowment_info, customer_kind, state, deed_on_file, death_cert_on_file, gov_id_on_file, authorization_notes")
      .eq("id", submission_id).maybeSingle();
    if (!sub) {
      return new Response(JSON.stringify({ error: "Submission not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: emails }, { data: notes }, { data: docs }] = await Promise.all([
      supabase.from("email_messages")
        .select("from_email, from_name, subject, body_text, snippet, received_at")
        .eq("matched_submission_id", submission_id)
        .order("received_at", { ascending: true }).limit(40),
      supabase.from("customer_notes").select("body, created_at")
        .eq("submission_id", submission_id).order("created_at").limit(30),
      supabase.from("submission_documents").select("label, status, doc_code")
        .eq("submission_id", submission_id).limit(60),
    ]);

    const clip = (s: unknown, n = 1400) =>
      typeof s === "string" && s.trim() ? s.replace(/\s+/g, " ").slice(0, n) : "";

    const file = [
      "SUBMISSION",
      `Seller: ${sub.name ?? "?"} <${sub.email ?? "?"}>`,
      `Cemetery: ${sub.cemetery ?? "?"}  Property: ${sub.property_type ?? "?"}  Spaces: ${sub.spaces ?? sub.plot_count ?? "?"}  Section/Lawn: ${sub.section ?? ""} ${sub.lawn ?? ""}`,
      sub.ownership_type ? `Ownership type stated: ${sub.ownership_type}` : "",
      sub.relationship_to_owner ? `Relationship to owner stated: ${sub.relationship_to_owner}` : "",
      sub.deed_owner_names ? `Names on the deed: ${sub.deed_owner_names}` : "",
      sub.deed_owners_status ? `Deed owners' status: ${sub.deed_owners_status}` : "",
      sub.purchase_info ? `Purchase info: ${clip(sub.purchase_info)}` : "",
      `Deed on file: ${sub.deed_on_file ? "yes" : "no"}  Death certificate on file: ${sub.death_cert_on_file ? "yes" : "no"}  Photo ID on file: ${sub.gov_id_on_file ? "yes" : "no"}`,
      clip(sub.message) ? `Their message: ${clip(sub.message)}` : "",
      clip(sub.details) ? `Details: ${clip(sub.details)}` : "",
      clip(sub.admin_notes) ? `Admin notes: ${clip(sub.admin_notes)}` : "",
      clip(sub.authorization_notes) ? `Authorization notes: ${clip(sub.authorization_notes)}` : "",
      "",
      "DOCUMENTS ALREADY LOGGED",
      ...((docs ?? []).map((d) => `- ${d.doc_code ?? ""} ${d.label} (${d.status})`)),
      "",
      "INTERNAL NOTES",
      ...((notes ?? []).map((n) => `- ${clip(n.body, 400)}`)),
      "",
      "EMAIL CHAIN (oldest first)",
      ...((emails ?? []).map((e) =>
        `--- ${e.received_at} · ${e.from_name ?? ""} <${e.from_email}> · ${e.subject ?? ""}\n${clip(e.body_text || e.snippet, 1800)}`)),
    ].filter(Boolean).join("\n");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("AI is not configured");

    const properties: Record<string, unknown> = {};
    for (const [k, vals] of Object.entries(ANSWER_SCHEMA)) {
      properties[k] = { type: "string", enum: vals, description: `Answer for "${k}". Omit if the file does not support it.` };
    }

    const tool = {
      type: "function",
      function: {
        name: "submit_ownership_reading",
        description: "Return the ownership questionnaire answers supported by the seller's file.",
        parameters: {
          type: "object",
          properties: {
            answers: { type: "object", properties, additionalProperties: false },
            reasons: {
              type: "array",
              description: "One short reason per answer, quoting or paraphrasing the evidence.",
              items: {
                type: "object",
                properties: {
                  key: { type: "string" },
                  reason: { type: "string" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                },
                required: ["key", "reason", "confidence"],
                additionalProperties: false,
              },
            },
            people: {
              type: "array",
              description: "Named people who appear to be part of the chain of title or must sign.",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  role: { type: "string", enum: ["owner", "co_owner", "spouse", "heir", "executor", "trustee", "agent", "witness", "decedent"] },
                  relationship: { type: "string" },
                  email: { type: "string" },
                  deceased: { type: "boolean" },
                },
                required: ["name", "role"],
                additionalProperties: false,
              },
            },
            open_questions: {
              type: "array",
              description: "The things we still need to ask the seller before the checklist can be trusted.",
              items: { type: "string" },
            },
          },
          required: ["answers", "reasons", "open_questions"],
          additionalProperties: false,
        },
      },
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You are a Texas cemetery-property title analyst. You read a seller's file and decide what it proves about who holds the right to sell. You never guess: if the file does not say, you omit the answer and add an open question instead.\n\n" + GUIDE,
          },
          { role: "user", content: file },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "submit_ownership_reading" } },
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached — try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) throw new Error(`AI error ${res.status}: ${(await res.text()).slice(0, 300)}`);

    const json = await res.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    const parsed = call?.function?.arguments ? JSON.parse(call.function.arguments) : null;
    if (!parsed) throw new Error("The model returned no reading");

    // Drop anything outside the allowed answer set.
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed.answers ?? {})) {
      if (ANSWER_SCHEMA[k] && typeof v === "string" && ANSWER_SCHEMA[k].includes(v)) clean[k] = v;
    }

    return new Response(JSON.stringify({
      answers: clean,
      reasons: (parsed.reasons ?? []).filter((r: { key: string }) => clean[r.key]),
      people: parsed.people ?? [],
      open_questions: parsed.open_questions ?? [],
      sources: { emails: emails?.length ?? 0, notes: notes?.length ?? 0 },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
