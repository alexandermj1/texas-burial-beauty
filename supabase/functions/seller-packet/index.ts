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

/** Loose name key so "Jamie Floy Alford" and "Jamie Alford" are one person. */
const personKeyOf = (n?: string | null) => {
  const t = String(n ?? "").toLowerCase().replace(/[.,'\u2019]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const p = t.split(" ");
  return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0];
};


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

    // Originals go to our partner, Bayer Cemetery Brokers, who store them
    // securely for us. Everything posts by default except photo ID; an admin
    // can switch an item back to photo-only (mailSkip) or set a custom address.
    const ownershipAnswers =
      ((sub as Record<string, unknown>).ownership_answers as Record<string, unknown> | null) ?? {};
    const mailOriginals: Record<string, { address?: string }> =
      (ownershipAnswers.mailOriginals as Record<string, { address?: string }>) ?? {};
    const mailSkip: string[] = (ownershipAnswers.mailSkip as string[]) ?? [];
    const ORIGINALS_MAIL_ADDRESS =
      "Bayer Cemetery Brokers\n100 N Brand Blvd, Ste 213\nGlendale, CA 91203";
    const defaultMailAddress =
      String(ownershipAnswers.originalsAddress ?? "").trim() || ORIGINALS_MAIL_ADDRESS;
    const mailsByDefault = (code: string) => !["REVIEW", "NOTE", "D2", "D2P", "LA"].includes(code);
    const mailFor = (code: string, person: string): string | null => {
      const key = `${code}::${person}`;
      if (mailOriginals[key]?.address) return mailOriginals[key].address ?? null;
      if (mailSkip.includes(key)) return null;
      return mailsByDefault(code) ? defaultMailAddress : null;
    };




    if (action === "get") {
      const { data: docs } = await supabase
        .from("submission_documents")
        .select("id, doc_code, person_name, label, status, required_state, manual_override, why, needs_notary, issued_by_us, file_url, file_urls, sort_order")
        .eq("submission_id", submissionId)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });

      const visible = (docs ?? []).filter((d) => {
        const code = d.doc_code ?? "";
        if (code === "REVIEW" || code === "NOTE" || code === "LA") return false;
        const state = d.manual_override ?? d.required_state;
        return state !== "not_needed";
      });

      // The POAs live in `contracts`, not the checklist — surface every one of
      // them (a submission can need one per signer) so the seller sees one page
      // with every outstanding action on it.
      const { data: poaRows } = await supabase
        .from("contracts")
        .select("id, principal_key, signature_name, fill_data, sign_token, notarized_at, signed_at, kind, created_at, filled_pdf_path, signed_pdf_path, notarized_pdf_path")
        .eq("submission_id", submissionId)
        .eq("kind", "poa")
        .neq("status", "void")
        .order("created_at", { ascending: true });
      const poaRow = (poaRows ?? [])[0] ?? null;


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
      // Loose name key: "Jamie Floy Alford" and "Jamie Alford" are one person,
      // so a spelling variant never shows the seller the same item twice.
      const personKey = (n?: string | null) => {
        const t = String(n ?? "").toLowerCase().replace(/[.,'\u2019]/g, " ").replace(/\s+/g, " ").trim();
        if (!t) return "";
        const p = t.split(" ");
        return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0];
      };
      const heldFiles = (d: { file_url?: string | null; file_urls?: unknown }) =>
        (Array.isArray(d.file_urls) ? (d.file_urls as string[]).length : 0) + (d.file_url ? 1 : 0);
      const deduped = visible.filter((d) => !(d.doc_code === "D21" && !!poaRow))
        .filter((d, index, all) => {
          const same = all.filter((x) =>
            x.doc_code === d.doc_code && personKey(x.person_name) === personKey(d.person_name));
          // Keep the most complete of the duplicates (files first, then progress).
          const best = same.slice().sort((a, b) =>
            (heldFiles(b) - heldFiles(a))
            || (Number(!!b.manual_override) - Number(!!a.manual_override)))[0];
          return all[index] === best;
        });

      // Anything the seller has already told us is in the post.
      const mailedConfirmed: Record<string, string> =
        (ownershipAnswers.mailedConfirmed as Record<string, string>) ?? {};
      const DONE_STATES = ["received", "notarized", "complete"];

      // Each POA is completed by us from the family-tree answers — the seller only
      // ever downloads it, prints it and has it notarised. Nothing to fill in.
      const signedPdf = async (path?: string | null) => {
        if (!path) return null;
        const { data } = await supabase.storage.from("contracts").createSignedUrl(path, 60 * 60 * 24);
        return data?.signedUrl ?? null;
      };
      // Only ever show the newest prepared copy for each signer. If a document
      // was revised (name corrected, two POAs merged into one joint POA), the
      // older copy must never stay on the seller's page next to the new one.
      const poaRowList = (poaRows ?? []).slice();
      const namesOf = (r: Record<string, unknown>) => {
        const fill = (r.fill_data ?? {}) as Record<string, unknown>;
        const joint = Array.isArray(fill.joint_names) ? fill.joint_names as string[] : [];
        const raw = joint.length
          ? joint
          : String(fill.seller_name ?? r.signature_name ?? r.principal_key ?? "").split("&");
        return raw.map((n) => personKeyOf(n)).filter(Boolean);
      };
      const freshPoaRows = poaRowList.filter((row, i) => {
        const mine = namesOf(row as Record<string, unknown>);
        if (!mine.length) return true;
        // A later row covering any of the same people supersedes this one.
        return !poaRowList.slice(i + 1).some((later) =>
          namesOf(later as Record<string, unknown>).some((k) => mine.includes(k)));
      });

      const poas = [];
      for (const row of freshPoaRows) {

        const r = row as Record<string, unknown>;
        const fill = (r.fill_data ?? {}) as Record<string, unknown>;
        const signer = String(fill.seller_name ?? r.signature_name ?? "").trim();
        const pdfUrl = await signedPdf(
          (r.notarized_pdf_path as string) || (r.signed_pdf_path as string) || (r.filled_pdf_path as string),
        );
        if (!r.sign_token && !pdfUrl) continue;
        poas.push({
          contract_id: r.id as string,
          principal_key: (r.principal_key as string) ?? "",
          signer_name: signer || null,
          sign_token: (r.sign_token as string) ?? null,
          pdf_url: pdfUrl,
          notarized: !!r.notarized_at,
          signed: !!r.signed_at,
          mail_to: mailFor("D21", signer),
          // Legacy submissions stored one unnamed tick under "D21::".
          mailed_confirmed_at:
            mailedConfirmed[`D21::${signer}`] ??
            ((poaRows ?? []).length === 1 ? mailedConfirmed["D21::"] ?? null : null),

          mail_key: `D21::${signer}`,
        });
      }

      // Documents we prepare and issue ourselves — the affidavit of heirship and
      // any spousal consent — live in `contracts` just like the POAs. Attach the
      // finished PDF to its checklist item so the seller can actually open it.
      const { data: preparedRows } = await supabase
        .from("contracts")
        .select("id, kind, principal_key, signature_name, fill_data, filled_pdf_path, signed_pdf_path, notarized_pdf_path, created_at")
        .eq("submission_id", submissionId)
        .in("kind", ["affidavit_heirship", "spousal_consent"])
        .neq("status", "void")
        .order("created_at", { ascending: true });
      const preparedByKind: Record<string, { key: string; url: string | null }[]> = {};
      for (const row of preparedRows ?? []) {
        const r = row as Record<string, unknown>;
        const fill = (r.fill_data ?? {}) as Record<string, unknown>;
        const who = String(fill.seller_name ?? r.signature_name ?? r.principal_key ?? "").trim();
        const url = await signedPdf(
          (r.notarized_pdf_path as string) || (r.signed_pdf_path as string) || (r.filled_pdf_path as string),
        );
        if (!url) continue;
        const kind = String(r.kind);
        (preparedByKind[kind] ??= []).push({ key: personKeyOf(who), url });
      }
      const preparedFor = (label: string, person?: string | null): string | null => {
        const l = label.toLowerCase();
        const kind = l.includes("heirship") || l.includes("affidavit")
          ? "affidavit_heirship"
          : l.includes("spous") ? "spousal_consent" : null;
        const list = kind ? preparedByKind[kind] ?? [] : [];
        if (!list.length) return null;
        const k = personKeyOf(person);
        return (k && list.find((x) => x.key === k)?.url) || list[0].url;
      };

      // A form a broker attached by hand to a checklist item (a cemetery's own
      // transfer form, say). It behaves exactly like a document we prepared:
      // the seller opens it, prints it, and posts or uploads it back.
      const brokerForms: Record<string, { path?: string; name?: string }> =
        (ownershipAnswers.brokerForms as Record<string, { path?: string; name?: string }>) ?? {};
      const brokerFormFor = async (code?: string | null, person?: string | null) => {
        const entry = brokerForms[`${code ?? ""}::${personKeyOf(person)}`]
          ?? brokerForms[`${code ?? ""}::`];
        if (!entry?.path) return null;
        const { data } = await supabase.storage
          .from("customer-files").createSignedUrl(entry.path, 60 * 60 * 24);
        return data?.signedUrl ?? null;
      };


      return json({
        seller_name: String(ownershipAnswers.packetGreeting ?? "").trim() || sub.name,
        broker_note: String(ownershipAnswers.packetNote ?? "").trim() || null,
        cemetery: sub.cemetery,
        listing_agreement: listingRow
          ? {
              signed: !!listingRow.signed_at || listingRow.status === "signed" || listingRow.status === "completed",
              completed: !!listingRow.completed_at || !!listingRow.countersigned_at || listingRow.status === "completed",
              signed_at: listingRow.signed_at,
            }
          : null,
        poas,
        poa: poas[0] ?? null,


        documents: await Promise.all(deduped.map(async (d) => {
          const state = d.manual_override ?? d.required_state;
          const held = heldFiles(d);
          const complete = DONE_STATES.includes(state) || (held > 0 && d.status === "received");
          const key = `${d.doc_code ?? ""}::${d.person_name ?? ""}`;
          const attachedForm = await brokerFormFor(d.doc_code, d.person_name);
          const preparedUrl = attachedForm
            ?? (d.issued_by_us ? preparedFor(d.label ?? "", d.person_name) : null);
          return {
            id: d.id,
            code: d.doc_code,
            label: d.label,
            person_name: d.person_name,
            why: d.why,
            needs_notary: d.needs_notary,
            issued_by_us: d.issued_by_us || !!attachedForm,
            // Once we hold an item there is nothing left to post or upload.
            prepared_pdf_url: preparedUrl,
            // A document we prepared still has to come back to us as a signed
            // original, so it keeps its posting address once it is issued.
            mail_to: complete || (d.issued_by_us && !preparedUrl)
              ? null
              : mailFor(d.doc_code ?? "", d.person_name ?? ""),
            mailed_confirmed_at: mailedConfirmed[key] ?? null,
            state,
            complete,
            uploaded: held > 0,
          };
        })),


      });
    }

    // The seller ticks "this is in the post" so we (and Bayer) know to expect it.
    if (action === "confirm_mail") {
      const key = String(body?.key ?? "");
      if (!key) return json({ error: "missing item" }, 400);
      const current = (ownershipAnswers.mailedConfirmed as Record<string, string>) ?? {};
      const next = { ...current };
      if (body?.undo) delete next[key];
      else next[key] = new Date().toISOString();

      const { error } = await supabase
        .from("contact_submissions")
        .update({ ownership_answers: { ...ownershipAnswers, mailedConfirmed: next } })
        .eq("id", submissionId);
      if (error) throw error;

      if (!body?.undo) {
        const { data: staff } = await supabase
          .from("user_roles").select("user_id").in("role", ["admin", "staff", "agent"]);
        const recipients = [...new Set((staff ?? []).map((r: { user_id: string }) => r.user_id))];
        if (recipients.length) {
          await supabase.from("user_notifications").insert(recipients.map((uid) => ({
            user_id: uid,
            title: `${sub.name ?? "Seller"} is posting an original`,
            body: `${key.split("::")[0]}${key.split("::")[1] ? ` for ${key.split("::")[1]}` : ""} is on its way to Bayer Cemetery Brokers.`,
            link_url: `/admin?submission=${submissionId}`,
            source_type: "mail_confirmed",
            source_id: submissionId,
          })));
        }
      }

      return json({ ok: true });
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
        .is("deleted_at", null)
        .eq("submission_id", submissionId)
        .maybeSingle();

      // Keep every file the seller sends for this item (front/back of an ID,
      // multi-page deeds) rather than overwriting the previous one.
      const { data: existingDoc } = await supabase
        .from("submission_documents")
        .select("file_urls")
        .eq("id", docId)
        .maybeSingle();
      const priorPaths: string[] = Array.isArray((existingDoc as Record<string, unknown> | null)?.file_urls)
        ? ((existingDoc as { file_urls: string[] }).file_urls)
        : [];
      const allPaths = priorPaths.includes(path) ? priorPaths : [...priorPaths, path];

      const { error } = await supabase
        .from("submission_documents")
        .update({ file_url: path, file_urls: allPaths, status: "received", required_state: "received" })
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
                notes: `Uploaded by the seller via the document packet${docRow?.person_name ? ` (${docRow.person_name})` : ""} · source:${path}`,
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
        .eq("submission_id", submissionId)
        .is("deleted_at", null);
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

    if (action === "remove_upload") {
      const path = String(body?.path ?? "").replace(/^portal-uploads\//, "");
      const docId = String(body?.doc_id ?? "");
      const kind = String(body?.kind ?? "document");
      if (!path || !path.startsWith(`${submissionId}/`)) return json({ error: "invalid file" }, 400);

      const { error: storageError } = await supabase.storage.from("portal-uploads").remove([path]);
      if (storageError) throw storageError;

      // Remove the mirrored customer-file copy when it was created by this flow.
      if (sub.customer_profile_id) {
        const { data: mirrors } = await supabase.from("customer_files")
          .select("id, file_path").eq("customer_profile_id", sub.customer_profile_id)
          .like("notes", `%source:${path}%`);
        if ((mirrors ?? []).length) {
          await supabase.from("customer_files")
            .update({ deleted_at: new Date().toISOString(), deleted_by: "seller-packet" })
            .in("id", mirrors!.map((f) => f.id));
        }
      }

      const { data: remainingFiles } = await supabase.storage.from("portal-uploads")
        .list(submissionId, { limit: 100 });

      if (kind === "poa") {
        // Each signer's uploads live under their own prefix, so only that
        // person's POA is reset when their last file goes.
        const docKey = String(body?.doc_key ?? "poa-notarized");
        const contractId = String(body?.contract_id ?? "");
        const signerName = String(body?.signer_name ?? "").trim();
        const poaFiles = (remainingFiles ?? []).filter((f) => f.name.startsWith(`${docKey}-`));
        if (!poaFiles.length) {
          let q = supabase.from("contracts")
            .select("id, notarized_pdf_path").eq("submission_id", submissionId).eq("kind", "poa");
          if (UUID.test(contractId)) q = q.eq("id", contractId);
          const { data: poa } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (poa?.notarized_pdf_path) await supabase.storage.from("contracts").remove([poa.notarized_pdf_path]);
          if (poa) await supabase.from("contracts").update({
            notarized_pdf_path: null, notarized_at: null, signed_at: null, status: "draft",
          }).eq("id", poa.id);
          const { data: poaDocs } = await supabase.from("submission_documents")
            .select("id, person_name").eq("submission_id", submissionId).eq("doc_code", "D21").is("deleted_at", null);
          const key = personKeyOf(signerName);
          const scoped = key
            ? (poaDocs ?? []).filter((d) => personKeyOf((d as { person_name?: string }).person_name) === key)
            : (poaDocs ?? []);
          const ids = (scoped.length ? scoped : poaDocs ?? []).map((d) => (d as { id: string }).id);
          if (ids.length) {
            await supabase.from("submission_documents").update({
              file_url: null, file_urls: [], status: "pending", required_state: "needed", manual_override: "needed",
            }).in("id", ids);
          }
        }
      } else {

        if (!UUID.test(docId)) return json({ error: "invalid document" }, 400);
        const prefix = `${docId}-`;
        const matching = (remainingFiles ?? []).filter((f) => f.name.startsWith(prefix))
          .map((f) => `${submissionId}/${f.name}`);
        await supabase.from("submission_documents").update({
          file_url: matching[matching.length - 1] ?? null,
          file_urls: matching,
          status: matching.length ? "received" : "pending",
          required_state: matching.length ? "received" : "needed",
          manual_override: matching.length ? null : "needed",
        }).eq("id", docId).eq("submission_id", submissionId);
      }

      return json({ ok: true });
    }

    if (action === "record_poa") {
      const path = String(body?.path ?? "");
      const name = String(body?.name ?? "notarized POA");
      const contractId = String(body?.contract_id ?? "");
      const signerName = String(body?.signer_name ?? "").trim();
      if (!path) return json({ error: "missing file" }, 400);

      // The POA contract row this upload belongs to. A submission can have one
      // POA per signer, so prefer the row the seller's card names.
      let poaQuery = supabase
        .from("contracts")
        .select("id, signed_pdf_path, filled_pdf_path, kind")
        .eq("submission_id", submissionId)
        .eq("kind", "poa");
      if (UUID.test(contractId)) poaQuery = poaQuery.eq("id", contractId);
      const { data: poaRow } = await poaQuery
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

      // Tick the POA row on the checklist so the admin panel shows it as
      // received, with the file kept against the item. When the upload belongs
      // to a named signer only that person's row is ticked.
      const { data: poaDocs } = await supabase
        .from("submission_documents")
        .select("id, file_urls, person_name")
        .eq("submission_id", submissionId)
        .eq("doc_code", "D21")
        .is("deleted_at", null);
      const targetKey = personKeyOf(signerName);
      const scoped = targetKey
        ? (poaDocs ?? []).filter((d) => personKeyOf((d as { person_name?: string }).person_name) === targetKey)
        : (poaDocs ?? []);
      for (const d of (scoped.length ? scoped : poaDocs ?? [])) {
        const prior: string[] = Array.isArray((d as { file_urls?: string[] }).file_urls)
          ? (d as { file_urls: string[] }).file_urls : [];
        await supabase.from("submission_documents").update({
          file_url: filePath,
          file_urls: prior.includes(filePath) ? prior : [...prior, filePath],
          status: "received",
          required_state: "notarized",
          manual_override: "notarized",
        }).eq("id", (d as { id: string }).id);
      }


      if (sub.customer_profile_id) {
        // Keep a copy in the customer's file library so it sits on the
        // submission alongside every other document.
        try {
          const destPath = `${sub.customer_profile_id}/${Date.now()}-${safeName}`;
          const { error: cpErr } = await supabase.storage
            .from("customer-files")
            .upload(destPath, bytes, { contentType: fileData.type || "application/pdf", upsert: true });
          if (!cpErr) {
            await supabase.from("customer_files").insert({
              customer_profile_id: sub.customer_profile_id,
              file_name: name,
              file_path: destPath,
              file_size: bytes.byteLength,
              mime_type: fileData.type || "application/pdf",
              document_type: "Notarized power of attorney",
              notes: "Uploaded by the seller via the document packet",
              uploaded_by_name: sub.name ?? "Seller",
            });
          }
        } catch (_e) { /* best-effort mirror */ }

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
