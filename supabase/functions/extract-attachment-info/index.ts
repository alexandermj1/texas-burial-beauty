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
certificates, listing agreements, statements, and similar paperwork. Extract
the most useful facts from the document and return ONLY valid JSON matching
this schema (omit unknown fields, do not invent):

{
  "document_type": string,           // e.g. "Deed", "Power of Attorney", "Death certificate", "Driver license", "Statement", "Other"
  "summary": string,                  // 1-2 sentence plain-English summary of what this document is and who it concerns
  "owners": string[],                 // names of current owners / grantees on a deed
  "previous_owners": string[],
  "decedent": string,                 // if a death certificate
  "principal": string,                // if a POA, who is granting authority
  "attorney_in_fact": string,         // if a POA, who is receiving authority
  "cemetery": string,
  "section": string,
  "lot": string,
  "block": string,
  "space": string,
  "plot_type": string,                // grave, crypt, niche, etc.
  "deed_number": string,
  "certificate_number": string,
  "issued_date": string,              // YYYY-MM-DD if determinable
  "date_of_death": string,            // YYYY-MM-DD if determinable
  "notarized": boolean,
  "id_type": string,                  // for IDs: "Driver License", "Passport", etc.
  "id_number": string,
  "id_state": string,
  "id_expires": string,
  "amounts": string[],                // any dollar amounts mentioned, with context
  "addresses": string[],
  "phone_numbers": string[],
  "emails": string[],
  "notes": string                     // anything else important you noticed
}

Return strictly a single JSON object. No prose, no markdown fences.`;

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
      .select("id, file_path, file_name, mime_type, file_size, extraction_status")
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
