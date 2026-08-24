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
  outsideSpouse: ["yes", "no", "unsure"],
  descendants: ["yes", "no", "unsure"],
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
- deed = yes if we hold an attached document that is a cemetery deed / certificate of ownership / interment rights certificate (see ATTACHED DOCUMENTS), or if they say they have it; deed = no if they say it is lost.
- names = no only if there is an actual mismatch mentioned (maiden name, name change).
- occupied: if the number of spaces being sold equals the number of spaces they own (e.g. they own two and are selling two), the plot is empty → occupied = no. Only say "yes" if the file actually mentions a burial, interment or a used space.
- People: anyone who has died — including the person printed on the deed when owner = deceased — must be returned with role "decedent" and deceased = true. Never list a dead person as an owner, co-owner or signer: a decedent cannot sign anything.
- open_questions must only contain things the file genuinely leaves unresolved. Never ask us to confirm something you have just answered, something already stated in the file, or something the arithmetic above settles (such as whether anyone is buried when every space is being sold).
- The ATTACHED DOCUMENTS section is evidence we physically hold. Read it as carefully as the emails: the names, cemetery, section/lot/space and document type printed on those documents are facts, and they override anything vague in the emails.
- DEED OWNERS ARE STRICT: only identify someone as an owner/co-owner/decedent on the deed when their name appears in the owners/purchaser/grantee field of an extracted cemetery deed, certificate of ownership, or interment-right certificate. Never treat cemetery staff, salespeople, witnesses, notaries, beneficiaries, email writers, or names from another document as deed owners.
- Return every exact deed-owner name in deed_owners, preserving middle names/initials and suffixes. The deed itself outranks intake text and emails. If no readable deed is attached, use the explicit "Names on the deed" submission field; otherwise leave deed_owners empty rather than guessing.
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
      .select("id, name, email, phone, cemetery, property_type, spaces, section, lawn, space_numbers, plot_count, message, details, admin_notes, ownership_type, relationship_to_owner, deed_owner_names, deed_owners_status, purchase_info, prepaid_endowment_info, customer_kind, quote_response, state, deed_on_file, death_cert_on_file, gov_id_on_file, authorization_notes, customer_profile_id")
      .eq("id", submission_id).maybeSingle();
    if (!sub) {
      return new Response(JSON.stringify({ error: "Submission not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The reading costs money — only run it once the seller has accepted a quote.
    if (sub.quote_response !== "accepted") {
      return new Response(JSON.stringify({ error: "The AI reading only runs after the seller accepts a quote" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        .eq("submission_id", submission_id).is("deleted_at", null).limit(60),
    ]);

    // Everything the seller has physically sent us, read by the extractor.
    // Anything not yet read is read now (bounded) so the analyst never has to
    // guess about a document that is sitting in the file.
    type FileRow = {
      id: string; file_name: string | null; document_type: string | null;
      extracted_summary: string | null; extracted_data: Record<string, unknown> | null;
      extraction_status: string | null;
    };
    let attachments: FileRow[] = [];
    if (sub.customer_profile_id) {
      const { data: cf } = await supabase.from("customer_files")
        .select("id, file_name, document_type, extracted_summary, extracted_data, extraction_status")
        .eq("customer_profile_id", sub.customer_profile_id)
        .order("created_at", { ascending: true })
        .limit(40);
      attachments = (cf ?? []) as FileRow[];

      const unread = attachments.filter((f) => f.extraction_status !== "done").slice(0, 6);
      if (unread.length) {
        const base = `${Deno.env.get("SUPABASE_URL")}/functions/v1/extract-attachment-info`;
        const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        await Promise.all(unread.map((f) =>
          fetch(base, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${svc}` },
            body: JSON.stringify({ file_id: f.id }),
          }).catch(() => null)));
        const { data: refreshed } = await supabase.from("customer_files")
          .select("id, file_name, document_type, extracted_summary, extracted_data, extraction_status")
          .eq("customer_profile_id", sub.customer_profile_id)
          .order("created_at", { ascending: true })
          .limit(40);
        if (refreshed) attachments = refreshed as FileRow[];
      }
    }

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
      "ATTACHED DOCUMENTS WE PHYSICALLY HOLD (read by the document extractor)",
      ...(attachments.length
        ? attachments.map((f) => {
            const d = (f.extracted_data ?? {}) as Record<string, unknown>;
            const type = String(d.document_type ?? f.document_type ?? "unclassified");
            const facts = Object.entries(d)
              .filter(([k, v]) => k !== "summary" && v != null && v !== "" &&
                !(Array.isArray(v) && v.length === 0))
              .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
              .join("; ");
            return `- FILE "${f.file_name ?? "document"}" — type: ${type}${
              f.extraction_status !== "done" ? " (not readable / not yet read)" : ""
            }\n  summary: ${clip(f.extracted_summary, 600) || "n/a"}\n  extracted: ${clip(facts, 1200) || "n/a"}`;
          })
        : ["- (none on file)"]),
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
            deed_owners: {
              type: "array",
              description: "Exact names printed as owners/purchasers/grantees on the most current cemetery deed only.",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  deceased: { type: "boolean" },
                },
                required: ["name", "deceased"],
                additionalProperties: false,
              },
            },
            open_questions: {
              type: "array",
              description: "The things we still need to ask the seller before the checklist can be trusted.",
              items: { type: "string" },
            },
          },
          required: ["answers", "reasons", "deed_owners", "open_questions"],
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
      people: (parsed.people ?? []).map((p: Record<string, unknown>) =>
        p.deceased || p.role === "decedent"
          ? { ...p, role: "decedent", deceased: true }
          : p),
      deed_owners: (parsed.deed_owners ?? [])
        .filter((p: Record<string, unknown>) => typeof p.name === "string" && p.name.trim())
        .map((p: Record<string, unknown>, index: number) => ({
          name: String(p.name).replace(/\s+/g, " ").trim(),
          role: p.deceased ? "decedent" : (index === 0 ? "owner" : "co_owner"),
          deceased: p.deceased === true,
        })),
      // Never hand back an open question about something we have just answered.
      open_questions: (parsed.open_questions ?? []).filter((q: string) => {
        const t = String(q).toLowerCase();
        const answered = (key: string, words: string[]) =>
          !!clean[key] && words.some((w) => t.includes(w));
        return !(
          answered("occupied", ["buried", "burial", "interred", "interment", "occupied", "empty"]) ||
          answered("owner", ["alive", "living", "deceased", "passed away", "still alive"]) ||
          answered("co", ["co-owner", "co owner", "both owners", "all owners", "both sellers"]) ||
          answered("marital", ["marital", "married", "spouse", "widow", "divorc"]) ||
          answered("deed", ["deed", "certificate of ownership"]) ||
          answered("will", ["a will", "the will"])
        );
      }),
      sources: { emails: emails?.length ?? 0, notes: notes?.length ?? 0 },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
