// Mirrors seller-form uploaded attachments into the customer_files table so they
// appear in the admin "Files & documents" area alongside email-filtered attachments.
// Idempotent — skips files whose file_path is already recorded.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const normEmail = (e?: string | null) => (e ? e.trim().toLowerCase() : null);
const normPhone = (p?: string | null) => (p ? p.replace(/\D/g, "") : null);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const submissionId: string | undefined = body?.submission_id;
    if (!submissionId) {
      return new Response(JSON.stringify({ error: "submission_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: sub, error: subErr } = await supabase
      .from("contact_submissions")
      .select("id,name,email,phone,customer_kind,source,seller_attachments,customer_profile_id")
      .eq("id", submissionId)
      .maybeSingle();
    if (subErr || !sub) throw new Error(`submission lookup failed: ${subErr?.message || "not found"}`);

    const files: Array<{ path: string; name: string; size?: number; type?: string }> =
      Array.isArray((sub as any).seller_attachments) ? (sub as any).seller_attachments : [];
    if (files.length === 0) {
      return new Response(JSON.stringify({ files_attached: 0, reason: "no seller_attachments" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve / create a customer profile.
    let profileId: string | null = (sub as any).customer_profile_id ?? null;
    if (!profileId) {
      const e = normEmail(sub.email);
      const ph = normPhone(sub.phone);

      // Try email match (primary or alt).
      if (e) {
        const { data: byEmail } = await supabase
          .from("customer_profiles")
          .select("id")
          .or(`primary_email.eq.${e},alt_emails.cs.{${e}}`)
          .limit(1);
        if (byEmail && byEmail.length > 0) profileId = byEmail[0].id;
      }
      // Then phone match.
      if (!profileId && ph) {
        const { data: byPhone } = await supabase
          .from("customer_profiles")
          .select("id,primary_phone")
          .limit(500);
        const hit = (byPhone || []).find((p: any) => normPhone(p.primary_phone) === ph);
        if (hit) profileId = hit.id;
      }
      // Create new profile.
      if (!profileId) {
        const { data: ins, error: insErr } = await supabase
          .from("customer_profiles")
          .insert({
            primary_name: sub.name ?? null,
            primary_email: sub.email ?? null,
            primary_phone: sub.phone ?? null,
            customer_kind: (sub as any).customer_kind ?? (sub as any).source ?? null,
            last_interaction_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (insErr || !ins) throw new Error(`profile create failed: ${insErr?.message}`);
        profileId = ins.id;
      }

      await supabase
        .from("contact_submissions")
        .update({ customer_profile_id: profileId })
        .eq("id", submissionId);
    }

    // Skip files already recorded.
    const paths = files.map((f) => f.path).filter(Boolean);
    const { data: existing } = await supabase
      .from("customer_files")
      .select("file_path")
      .eq("customer_profile_id", profileId)
      .in("file_path", paths);
    const seen = new Set((existing || []).map((r: any) => r.file_path));

    const rows = files
      .filter((f) => f.path && !seen.has(f.path))
      .map((f) => ({
        customer_profile_id: profileId!,
        uploaded_by_user_id: null,
        uploaded_by_name: sub.name || "Seller (intake form)",
        file_name: f.name,
        file_path: f.path,
        file_size: f.size ?? null,
        mime_type: f.type ?? null,
        document_type: "Seller intake upload",
      }));

    let inserted = 0;
    if (rows.length > 0) {
      const { error: fErr, data: fIns } = await supabase
        .from("customer_files")
        .insert(rows)
        .select("id");
      if (fErr) throw new Error(`customer_files insert failed: ${fErr.message}`);
      inserted = fIns?.length ?? rows.length;

      await supabase.from("customer_activity_log").insert({
        customer_profile_id: profileId,
        actor_user_id: null,
        actor_name: sub.name || "Seller intake",
        action_type: "file_uploaded",
        action_summary: `Seller attached ${inserted} file${inserted === 1 ? "" : "s"} via intake form`,
      });
    }

    return new Response(
      JSON.stringify({ files_attached: inserted, customer_profile_id: profileId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("attach-seller-files error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
