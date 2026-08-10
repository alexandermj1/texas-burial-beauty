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
      .select("id, name, email, cemetery, customer_profile_id, deleted_at, ownership_answers")
      .eq("id", submissionId)
      .maybeSingle();
    if (!sub || sub.deleted_at) return json({ error: "This link is no longer active." }, 404);

    // Documents the cemetery only accepts as originals: the seller posts them
    // to us instead of photographing them. Keyed "CODE::personName".
    const mailOriginals: Record<string, { address?: string }> =
      ((sub as Record<string, unknown>).ownership_answers as Record<string, unknown> | null)
        ?.mailOriginals as Record<string, { address?: string }> ?? {};


    if (action === "get") {
      const { data: docs } = await supabase
        .from("submission_documents")
        .select("id, doc_code, person_name, label, status, required_state, manual_override, why, needs_notary, issued_by_us, file_url, sort_order")
        .eq("submission_id", submissionId)
        .order("sort_order", { ascending: true });

      const visible = (docs ?? []).filter((d) => {
        const code = d.doc_code ?? "";
        if (code === "REVIEW" || code === "NOTE" || code === "LA") return false;
        const state = d.manual_override ?? d.required_state;
        return state !== "not_needed";
      });

      // The POA lives in `contracts`, not the checklist — surface it so the
      // seller sees one page with every outstanding action on it.
      const { data: poaRow } = await supabase
        .from("contracts")
        .select("sign_token, notarized_at, signed_at, kind, created_at")
        .eq("submission_id", submissionId)
        .eq("kind", "poa")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: listingRow } = await supabase
        .from("contracts")
        .select("signed_at, completed_at, countersigned_at, status, created_at")
        .eq("submission_id", submissionId)
        .eq("kind", "listing_agreement")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // A prepared POA has its own action card below. Do not repeat it as an
      // upload request, and collapse any legacy duplicate rows by code/person.
      const deduped = visible.filter((d) => !(d.doc_code === "D21" && poaRow?.sign_token))
        .filter((d, index, all) => index === all.findIndex((x) =>
          x.doc_code === d.doc_code && (x.person_name ?? "") === (d.person_name ?? "")));

      return json({
        seller_name: sub.name,
        cemetery: sub.cemetery,
        listing_agreement: listingRow
          ? {
              signed: !!listingRow.signed_at || listingRow.status === "signed" || listingRow.status === "completed",
              completed: !!listingRow.completed_at || !!listingRow.countersigned_at || listingRow.status === "completed",
              signed_at: listingRow.signed_at,
            }
          : null,
        poa: poaRow?.sign_token
          ? {
              sign_token: poaRow.sign_token,
              notarized: !!poaRow.notarized_at,
              signed: !!poaRow.signed_at,
            }
          : null,
        documents: deduped.map((d) => ({
          id: d.id,
          code: d.doc_code,
          label: d.label,
          person_name: d.person_name,
          why: d.why,
          needs_notary: d.needs_notary,
          issued_by_us: d.issued_by_us,
          mail_to: mailOriginals[`${d.doc_code ?? ""}::${d.person_name ?? ""}`]?.address ?? null,
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

      const { data: docRow } = await supabase
        .from("submission_documents")
        .select("label, doc_code, person_name")
        .eq("id", docId)
        .eq("submission_id", submissionId)
        .maybeSingle();

      const { error } = await supabase
        .from("submission_documents")
        .update({ file_url: path, status: "received", required_state: "received" })
        .eq("id", docId)
        .eq("submission_id", submissionId);
      if (error) throw error;

      // Mirror the upload into the customer's file library so it shows up in the
      // "Files & documents" tab on the submission, not just the checklist row.
      if (sub.customer_profile_id) {
        try {
          const rel = path.startsWith("portal-uploads/") ? path.slice("portal-uploads/".length) : path;
          const { data: blob } = await supabase.storage.from("portal-uploads").download(rel);
          if (blob) {
            const bytes = new Uint8Array(await blob.arrayBuffer());
            const safeName = name.replace(/[^\w.\-]+/g, "_");
            const destPath = `${sub.customer_profile_id}/${Date.now()}-${safeName}`;
            const { error: upErr } = await supabase.storage
              .from("customer-files")
              .upload(destPath, bytes, { contentType: blob.type || body?.type || "application/octet-stream", upsert: true });
            if (!upErr) {
              await supabase.from("customer_files").insert({
                customer_profile_id: sub.customer_profile_id,
                file_name: name,
                file_path: destPath,
                file_size: bytes.byteLength,
                mime_type: blob.type || body?.type || null,
                document_type: docRow?.label ?? null,
                notes: `Uploaded by the seller via the document packet${docRow?.person_name ? ` (${docRow.person_name})` : ""}`,
                uploaded_by_name: sub.name ?? "Seller",
              });
            }
          }
        } catch (_e) { /* mirroring is best-effort; the checklist row still has the file */ }

        await supabase.from("customer_activity_log").insert({
          customer_profile_id: sub.customer_profile_id,
          submission_id: submissionId,
          actor_name: sub.name ?? "Seller",
          action_type: "file_uploaded",
          action_summary: `Seller uploaded ${name} via the document packet`,
        });
      }


      // Is anything still outstanding? If not, the listing's paperwork is complete.
      const { data: remaining } = await supabase
        .from("submission_documents")
        .select("id, status, manual_override, required_state")
        .eq("submission_id", submissionId);
      const outstanding = (remaining ?? []).filter((d: Record<string, string | null>) => {
        const state = d.manual_override ?? d.required_state;
        return d.status !== "received" && state !== "received" && state !== "not_required" && state !== "waived";
      });
      const allDone = (remaining ?? []).length > 0 && outstanding.length === 0;
      if (allDone) {
        await supabase.from("contact_submissions")
          .update({ documents_completed_at: new Date().toISOString() })
          .eq("id", submissionId)
          .is("documents_completed_at", null);
      }

      // Notify every admin / staff member in the CRM so nothing sits unseen.
      const { data: staff } = await supabase
        .from("user_roles").select("user_id").in("role", ["admin", "staff", "agent"]);
      const recipients = [...new Set((staff ?? []).map((r: { user_id: string }) => r.user_id))];
      if (recipients.length) {
        await supabase.from("user_notifications").insert(recipients.map((uid) => ({
          user_id: uid,
          title: allDone
            ? `${sub.name ?? "Seller"} completed all documents`
            : `${sub.name ?? "Seller"} uploaded a document`,
          body: allDone
            ? `Every requested document is now on file — the listing paperwork is complete.`
            : `${name}${outstanding.length ? ` · ${outstanding.length} item${outstanding.length === 1 ? "" : "s"} still outstanding` : ""}`,
          link_url: `/admin?submission=${submissionId}`,
          source_type: "document_upload",
          source_id: submissionId,
        })));
      }

      return json({ ok: true, all_done: allDone });
    }

    if (action === "record_poa") {
      const path = String(body?.path ?? "");
      const name = String(body?.name ?? "notarized POA");
      if (!path) return json({ error: "missing file" }, 400);

      // The current POA contract row for this submission.
      const { data: poaRow } = await supabase
        .from("contracts")
        .select("id, signed_pdf_path, filled_pdf_path, kind")
        .eq("submission_id", submissionId)
        .eq("kind", "poa")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!poaRow) return json({ error: "no prepared POA found" }, 404);

      // Copy the uploaded file from portal-uploads to the contracts bucket for
      // permanent storage alongside the other contract documents.
      const filePath = path.startsWith("portal-uploads/") ? path.slice("portal-uploads/".length) : path;
      const { data: fileData, error: dlErr } = await supabase.storage
        .from("portal-uploads")
        .download(filePath);
      if (dlErr || !fileData) throw new Error(`download failed: ${dlErr?.message ?? "not found"}`);
      const bytes = new Uint8Array(await fileData.arrayBuffer());
      const safeName = name.replace(/[^a-zA-Z0-9._-]+/g, "_") || "notarized-poa.pdf";
      const newPath = `${submissionId}/poa-notarized-${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("contracts")
        .upload(newPath, bytes, { contentType: fileData.type || "application/pdf", upsert: true });
      if (upErr) throw new Error(`upload failed: ${upErr.message}`);

      const now = new Date().toISOString();
      await supabase.from("contracts").update({
        notarized_pdf_path: newPath,
        notarized_at: now,
        signed_at: poaRow.signed_at ?? now,
        status: "notarized",
      }).eq("id", poaRow.id);

      if (sub.customer_profile_id) {
        await supabase.from("customer_activity_log").insert({
          customer_profile_id: sub.customer_profile_id,
          submission_id: submissionId,
          actor_name: sub.name ?? "Seller",
          action_type: "poa_notarized",
          action_summary: `Seller uploaded the notarized Power of Attorney (${safeName})`,
        });
      }

      // Notify staff that the POA has been returned.
      const { data: staff } = await supabase
        .from("user_roles").select("user_id").in("role", ["admin", "staff", "agent"]);
      const recipients = [...new Set((staff ?? []).map((r: { user_id: string }) => r.user_id))];
      if (recipients.length) {
        await supabase.from("user_notifications").insert(recipients.map((uid) => ({
          user_id: uid,
          title: `${sub.name ?? "Seller"} uploaded the notarized POA`,
          body: `The notarized Power of Attorney is back and stored with the contract.`,
          link_url: `/admin?submission=${submissionId}`,
          source_type: "poa_notarized",
          source_id: submissionId,
        })));
      }

      return json({ ok: true, path: newPath });
    }

    return json({ error: "unknown action" }, 400);
  } catch (err) {
    console.error("seller-packet error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
