// Reads a customer_files attachment (PDF or image) via Lovable AI Gateway
// (google/gemini-3.1-flash-lite) and stores structured extracted fields +
// a short human summary on the customer_files row.
//
// Input: { file_id: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL = "google/gemini-3.1-flash-lite";
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB safety cap

const SYSTEM_PROMPT = `You are an expert paralegal who reads cemetery-related documents:
deeds, certificates of ownership, powers of attorney, government IDs, death
certificates, listing agreements, statements, contracts, correspondence, and
similar paperwork.

Your job: extract EVERY piece of useful information present in the document.
Do not limit yourself to a fixed schema — different documents contain
different facts, so include whatever is actually there. Never invent or guess.

ALWAYS extract the purchaser's / owner's mailing address whenever it appears
anywhere on the document — this is high priority, search the whole page for it.

Return ONLY a single valid JSON object. No prose, no markdown fences. Use the
shape below as a STARTING POINT: OMIT any field not in the document, and ADD
any other useful key/value facts under "additional_fields" (object) when the
document contains information that doesn't fit the suggested keys.

{
  "document_type": string,            // e.g. "Deed", "Power of Attorney", "Death certificate", "Driver license", "Statement", "Contract", "Letter", "Other"
  "summary": string,                   // 1-3 sentence plain-English summary of what this document is, who it concerns, and the key facts
  "purchaser_address": string,         // ALWAYS include if present anywhere on the document
  "owners": string[],
  "previous_owners": string[],
  "purchaser": string,
  "seller": string,
  "decedent": string,
  "principal": string,
  "attorney_in_fact": string,
  "cemetery": string,
  "cemetery_address": string,
  "section": string,
  "lot": string,
  "block": string,
  "space": string,
  "plot_type": string,                 // grave, crypt, niche, etc.
  "deed_number": string,
  "certificate_number": string,
  "contract_number": string,
  "issued_date": string,               // YYYY-MM-DD if determinable
  "purchase_date": string,
  "date_of_death": string,
  "id_type": string,
  "id_number": string,
  "id_state": string,
  "id_expires": string,
  "amounts": string[],                 // any dollar amounts mentioned, with context
  "addresses": string[],               // every other address that appears
  "phone_numbers": string[],
  "emails": string[],
  "parties": string[],                 // anyone else named (witnesses, agents, funeral home, etc.)
  "notes": string,                     // anything else important you noticed
  "additional_fields": object          // any other useful facts in the document that don't fit above
}`;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => ({}));
    const fileId: string | undefined = body?.file_id;
    if (!fileId) return json({ error: "file_id required" }, 400);

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: row, error: rowErr } = await supabase
      .from("customer_files")
      .select("id, file_path, file_name, mime_type, file_size, extraction_status, customer_profile_id")
      .eq("id", fileId)
      .maybeSingle();
    if (rowErr || !row) return json({ error: `file lookup failed: ${rowErr?.message || "not found"}` }, 404);

    const mime = (row.mime_type || "").toLowerCase();
    const isImage = mime.startsWith("image/");
    const isPdf = mime === "application/pdf" || row.file_name?.toLowerCase().endsWith(".pdf");
    if (!isImage && !isPdf) {
      await supabase.from("customer_files").update({
        extraction_status: "unsupported",
        extraction_error: `Unsupported mime: ${mime || "unknown"}`,
        extracted_at: new Date().toISOString(),
      }).eq("id", fileId);
      return json({ status: "unsupported" });
    }

    if (row.file_size && row.file_size > MAX_BYTES) {
      await supabase.from("customer_files").update({
        extraction_status: "unsupported",
        extraction_error: `File too large (${row.file_size} bytes, max ${MAX_BYTES})`,
        extracted_at: new Date().toISOString(),
      }).eq("id", fileId);
      return json({ status: "too_large" });
    }

    // Per-customer rate limiting so a spammy uploader can't burn the AI budget.
    // Caps: 25 successful extractions in the last 24h, 150 lifetime per customer.
    const DAILY_CAP = 25;
    const LIFETIME_CAP = 150;
    if (row.customer_profile_id) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: dayCount } = await supabase
        .from("customer_files")
        .select("id", { count: "exact", head: true })
        .eq("customer_profile_id", row.customer_profile_id)
        .eq("extraction_status", "done")
        .gte("extracted_at", since);
      const { count: lifeCount } = await supabase
        .from("customer_files")
        .select("id", { count: "exact", head: true })
        .eq("customer_profile_id", row.customer_profile_id)
        .eq("extraction_status", "done");
      if ((dayCount ?? 0) >= DAILY_CAP || (lifeCount ?? 0) >= LIFETIME_CAP) {
        const reason = (dayCount ?? 0) >= DAILY_CAP
          ? `Daily extraction cap reached (${DAILY_CAP}/24h) for this customer`
          : `Lifetime extraction cap reached (${LIFETIME_CAP}) for this customer`;
        await supabase.from("customer_files").update({
          extraction_status: "rate_limited",
          extraction_error: reason,
          extracted_at: new Date().toISOString(),
        }).eq("id", fileId);
        return json({ status: "rate_limited", reason });
      }
    }

    // Mark pending so the UI can show progress
    await supabase.from("customer_files").update({
      extraction_status: "pending",
      extraction_error: null,
    }).eq("id", fileId);

    // Download the file as bytes
    const { data: blob, error: dlErr } = await supabase.storage
      .from("customer-files")
      .download(row.file_path);
    if (dlErr || !blob) {
      const msg = `download failed: ${dlErr?.message || "no blob"}`;
      await supabase.from("customer_files").update({
        extraction_status: "failed",
        extraction_error: msg,
        extracted_at: new Date().toISOString(),
      }).eq("id", fileId);
      return json({ error: msg }, 500);
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const b64 = bytesToBase64(bytes);
    const effectiveMime = mime || (isPdf ? "application/pdf" : "application/octet-stream");
    const dataUrl = `data:${effectiveMime};base64,${b64}`;

    const userContent: any[] = [
      { type: "text", text: `Read this document and extract the structured facts described in the system prompt. The original filename is "${row.file_name}".` },
    ];
    if (isImage) {
      userContent.push({ type: "image_url", image_url: { url: dataUrl } });
    } else {
      userContent.push({
        type: "file",
        file: { filename: row.file_name || "document.pdf", file_data: dataUrl },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": lovableKey,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      const msg = `gateway ${aiRes.status}: ${errText.slice(0, 400)}`;
      await supabase.from("customer_files").update({
        extraction_status: "failed",
        extraction_error: msg,
        extracted_at: new Date().toISOString(),
      }).eq("id", fileId);
      return json({ error: msg }, 502);
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "";
    let parsed: any = null;
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch (_e) {
      // Try to find a JSON object inside the content
      const m = typeof content === "string" ? content.match(/\{[\s\S]*\}/) : null;
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch (_) { /* keep null */ }
      }
    }

    if (!parsed || typeof parsed !== "object") {
      const msg = `could not parse model output: ${String(content).slice(0, 200)}`;
      await supabase.from("customer_files").update({
        extraction_status: "failed",
        extraction_error: msg,
        extracted_at: new Date().toISOString(),
      }).eq("id", fileId);
      return json({ error: msg }, 502);
    }

    const summary: string = typeof parsed.summary === "string" ? parsed.summary : "";

    await supabase.from("customer_files").update({
      extracted_data: parsed,
      extracted_summary: summary || null,
      extraction_status: "done",
      extraction_error: null,
      extracted_at: new Date().toISOString(),
    }).eq("id", fileId);

    return json({ status: "done", summary, extracted_data: parsed });
  } catch (err) {
    console.error("extract-attachment-info error", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
