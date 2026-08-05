// Public, token-free (submission-uuid keyed) document packet for sellers.
// Powers /documents?s=<submission id>: one branded page that lists every
// document we still need, explains what each one is, and accepts uploads
// from a computer or a phone (QR).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const submissionId: string = String(body?.submission_id ?? "");
    const action: string = String(body?.action ?? "get");
    if (!UUID.test(submissionId)) return json({ error: "invalid link" }, 400);

    const { data: sub } = await supabase
      .from("contact_submissions")
      .select("id, name, email, cemetery, customer_profile_id, deleted_at")
      .eq("id", submissionId)
      .maybeSingle();
    if (!sub || sub.deleted_at) return json({ error: "This link is no longer active." }, 404);

    if (action === "get") {
      const { data: docs } = await supabase
        .from("submission_documents")
        .select("id, doc_code, person_name, label, status, required_state, manual_override, why, needs_notary, issued_by_us, file_url, sort_order")
        .eq("submission_id", submissionId)
        .order("sort_order", { ascending: true });

      const visible = (docs ?? []).filter((d) => {
        const code = d.doc_code ?? "";
        if (code === "REVIEW" || code === "NOTE") return false;
        const state = d.manual_override ?? d.required_state;
        return state !== "not_needed";
      });

      return json({
        seller_name: sub.name,
        cemetery: sub.cemetery,
        documents: visible.map((d) => ({
          id: d.id,
          code: d.doc_code,
          label: d.label,
          person_name: d.person_name,
          why: d.why,
          needs_notary: d.needs_notary,
          issued_by_us: d.issued_by_us,
          state: d.manual_override ?? d.required_state,
          uploaded: !!d.file_url,
        })),
      });
    }

    if (action === "record") {
      const docId = String(body?.doc_id ?? "");
      const path = String(body?.path ?? "");
      const name = String(body?.name ?? "upload");
      if (!UUID.test(docId) || !path) return json({ error: "missing file" }, 400);

      const { error } = await supabase
        .from("submission_documents")
        .update({ file_url: path, status: "received", required_state: "received" })
        .eq("id", docId)
        .eq("submission_id", submissionId);
      if (error) throw error;

      if (sub.customer_profile_id) {
        await supabase.from("customer_activity_log").insert({
          customer_profile_id: sub.customer_profile_id,
          submission_id: submissionId,
          actor_name: sub.name ?? "Seller",
          action_type: "file_uploaded",
          action_summary: `Seller uploaded ${name} via the document packet`,
        });
      }
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (err) {
    console.error("seller-packet error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
