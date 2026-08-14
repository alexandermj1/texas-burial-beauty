// Public, submission-keyed ownership questionnaire.
//
// Powers /confirm?s=<submission id>: the seller confirms (or corrects) what we
// already believe about who owns the plot, answers whatever the AI could not
// work out, and fills in the family tree when inheritance is involved.
//
// Actions:
//   get     — public read of the current answers + roster
//   save    — public write back from the seller's page
//   preview — admin-only, returns the exact email HTML without sending
//   send    — admin-only, emails the seller the link through the info@ mailbox
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBLIC_SITE_URL = "https://www.texascemeterybrokers.com";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Answers = Record<string, unknown>;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));
    const submissionId = String(body?.submission_id ?? "");
    const action = String(body?.action ?? "get");
    if (!UUID.test(submissionId)) return json({ error: "invalid link" }, 400);

    const { data: sub } = await svc
      .from("contact_submissions")
      .select("id, name, email, cemetery, lawn, space_numbers, deed_owner_names, relationship_to_owner, customer_profile_id, deleted_at, ownership_answers, ownership_roster, seller_attachments")
      .eq("id", submissionId)
      .maybeSingle();
    if (!sub || sub.deleted_at) return json({ error: "This link is no longer active." }, 404);

    const answers: Answers = (sub.ownership_answers as Answers) ?? {};

    if (action === "get") {
      // The seller often needs to re-read their own deed while answering, so we
      // hand back short-lived signed links to whatever they have already sent us.
      let attachments: { name: string; url: string; mime: string | null }[] = [];
      if (sub.customer_profile_id) {
        const { data: files } = await svc
          .from("customer_files")
          .select("file_name, file_path, mime_type, created_at")
          .eq("customer_profile_id", sub.customer_profile_id)
          .order("created_at", { ascending: false })
          .limit(24);
        for (const f of (files ?? []) as { file_name: string; file_path: string; mime_type: string | null }[]) {
          const { data: signed } = await svc.storage
            .from("customer-files")
            .createSignedUrl(f.file_path, 60 * 60 * 6);
          if (signed?.signedUrl) {
            attachments.push({ name: f.file_name, url: signed.signedUrl, mime: f.mime_type });
          }
        }
      }

      // Some files only ever land on the submission itself (intake form) or in
      // the document packet bucket — include those too, deduped by path.
      const seen = new Set(attachments.map((a) => a.name));
      const addSigned = async (bucket: string, path: string, name: string) => {
        if (!path || seen.has(name)) return;
        const { data: signed } = await svc.storage.from(bucket).createSignedUrl(path, 60 * 60 * 6);
        if (signed?.signedUrl) {
          seen.add(name);
          attachments.push({ name, url: signed.signedUrl, mime: null });
        }
      };
      const intake = (sub as { seller_attachments?: { path?: string; name?: string }[] }).seller_attachments;
      for (const f of Array.isArray(intake) ? intake : []) {
        if (f?.path) await addSigned("customer-files", f.path, f.name ?? f.path.split("/").pop()!);
      }
      const { data: docs } = await svc
        .from("submission_documents")
        .select("file_urls, file_url")
        .eq("submission_id", submissionId);
      for (const d of (docs ?? []) as { file_urls?: string[] | null; file_url?: string | null }[]) {
        for (const p of [...(d.file_urls ?? []), ...(d.file_url ? [d.file_url] : [])]) {
          if (p) await addSigned("portal-uploads", p, p.split("/").pop()!);
        }
      }


      return json({
        seller_name: sub.name,
        cemetery: sub.cemetery,
        lawn: sub.lawn,
        space_numbers: sub.space_numbers,
        deed_owner_names: sub.deed_owner_names,
        // Who the office already marked as deceased when typing the deed.
        deed_owners: (Array.isArray(sub.ownership_roster) ? sub.ownership_roster : [])
          .map((p: { name?: string; deceased?: boolean; role?: string }) => ({
            name: String(p?.name ?? ""),
            deceased: !!p?.deceased || p?.role === "decedent",
          }))
          .filter((p: { name: string }) => p.name.trim()),
        relationship_to_owner: sub.relationship_to_owner,
        attachments,
        answers,
      });
    }



    if (action === "save") {
      const incoming = (body?.answers ?? {}) as Answers;
      const isFinished = body?.finished === true;
      // The seller's page owns the questionnaire keys and the roster; anything
      // else already on the record (AI reading, mail-original addresses) stays.
      // Autosaved drafts must not mark the questionnaire as confirmed.
      const merged: Answers = {
        ...answers,
        ...incoming,
        aiSuggested: isFinished ? [] : (answers.aiSuggested ?? []),
        ...(isFinished ? { sellerConfirmedAt: new Date().toISOString() } : {}),
      };
      const people = Array.isArray(incoming.people) ? incoming.people : (answers.people ?? []);


      const { error } = await svc.from("contact_submissions")
        .update({ ownership_answers: merged as never, ownership_roster: people as never })
        .eq("id", submissionId);
      if (error) throw error;

      const finished = body?.finished === true;
      if (sub.customer_profile_id) {
        await svc.from("customer_activity_log").insert({
          customer_profile_id: sub.customer_profile_id,
          submission_id: submissionId,
          actor_name: sub.name ?? "Seller",
          action_type: "ownership_confirmed",
          action_summary: finished
            ? "Seller completed the ownership questionnaire"
            : "Seller updated the ownership questionnaire",
        });
      }

      if (finished) {
        // Only ever notify once per submission — the seller's page can finish
        // (or re-finish) more than once, and stacked duplicates made the
        // Acknowledge button look broken.
        const { data: already } = await svc
          .from("user_notifications")
          .select("id")
          .eq("source_type", "submission")
          .eq("source_id", submissionId)
          .limit(1);
        if (!already?.length) {
          const { data: staff } = await svc.from("user_roles").select("user_id").in("role", ["admin", "staff"]);
          const recipients = [...new Set((staff ?? []).map((r: { user_id: string }) => r.user_id))];
          if (recipients.length) {
            await svc.from("user_notifications").insert(recipients.map((uid) => ({
              user_id: uid,
              title: `${sub.name ?? "Seller"} confirmed their ownership details`,
              body: "The ownership questionnaire has been answered — the document checklist can be rebuilt.",
              link_url: "/admin",
              source_type: "submission",
              source_id: submissionId,
            })));
          }
        }
      }


      return json({ ok: true });
    }

    // ── Admin-only from here ──────────────────────────────────────────────
    const asUser = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await asUser.auth.getUser();
    if (!userData.user) return json({ error: "unauthorized" }, 401);

    const link = `${PUBLIC_SITE_URL}/confirm?s=${submissionId}`;
    const firstName = (sub.name ?? "").trim().split(/\s+/)[0] || "there";
    const known: { label: string; value: string }[] = Array.isArray(body?.known) ? body.known : [];
    const missing: string[] = Array.isArray(body?.missing) ? body.missing : [];
    const subject = `A few quick questions about your plot${sub.cemetery ? ` at ${sub.cemetery}` : ""}`;

    const knownHtml = known.length ? `
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a6d3b;margin:26px 0 8px;">What we already believe</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${known.map((k) => `
        <tr><td style="padding:11px 0;border-bottom:1px solid #eee7dc;">
          <div style="font-size:13px;color:#6b7280;">${esc(k.label)}</div>
          <div style="font-size:15px;color:#1f2a37;margin-top:2px;">${esc(k.value)}</div>
        </td></tr>`).join("")}
      </table>
      <p style="margin:12px 0 0;font-size:13px;color:#4a5568;line-height:1.7;">
        Please confirm each of these on the page — or correct anything we have wrong.
      </p>` : "";

    const missingHtml = missing.length ? `
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a6d3b;margin:26px 0 8px;">What we still need to ask</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${missing.map((m) => `
        <tr><td style="padding:10px 0;border-bottom:1px solid #eee7dc;font-size:14px;color:#1f2a37;">${esc(m)}</td></tr>`).join("")}
      </table>` : "";

    const html = `
<!doctype html>
<html><body data-family-tree="1" style="margin:0;padding:0;background:#f5f1ea;font-family:Georgia,'Times New Roman',serif;color:#1f2a37;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1ea;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(31,42,55,0.08);">
        <tr><td style="background:#1f2a37;color:#ffffff;padding:32px 40px;text-align:center;">
          <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#d9c7a3;">Texas Cemetery Brokers</div>
          <div style="font-size:22px;margin-top:10px;">A few quick questions</div>
        </td></tr>
        <tr><td style="padding:32px 40px;font-size:15px;line-height:1.7;">
          <p style="margin:0 0 16px;">Dear ${esc(firstName)},</p>
          <p style="margin:0 0 16px;">
            Before we prepare the transfer paperwork${sub.cemetery ? ` for your property at ${esc(sub.cemetery)}` : ""},
            we need to be certain who has the legal right to sell it. From your file we have already worked
            out most of the answers — we would simply like you to confirm them.
          </p>
          <p style="margin:0 0 22px;">
            It takes about three minutes, there is nothing to print, and it saves the cemetery
            rejecting the transfer later.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
            <tr><td align="center" style="background:#1f2a37;border-radius:8px;">
              <a href="${esc(link)}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;">
                Confirm your details →
              </a>
            </td></tr>
          </table>
          ${knownHtml}
          ${missingHtml}
          <p style="margin:26px 0 0;font-size:13px;color:#4a5568;">
            Or copy this link into your browser:<br/>
            <span style="color:#1f2a37;word-break:break-all;">${esc(link)}</span>
          </p>
          <div style="margin:24px 0 0;padding:18px 20px;background:#f7f3ec;border-radius:10px;">
            <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a6d3b;">Not sure about an answer?</div>
            <p style="margin:8px 0 0;font-size:13px;color:#4a5568;line-height:1.7;">
              Leave it blank and tell us on the last page, or call
              <a href="tel:+12142304740" style="color:#1f2a37;text-decoration:none;"><strong>(214) 230-4740</strong></a> —
              a broker will go through it with you. There is never a charge for asking.
            </p>
          </div>
        </td></tr>
        <tr><td style="background:#1f2a37;padding:22px 40px;text-align:center;">
          <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#d9c7a3;">Texas Cemetery Brokers</div>
          <div style="font-size:12px;color:#a9b4c2;margin-top:8px;">
            (214) 230-4740 · info@texascemeterybrokers.com · texascemeterybrokers.com
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const to = body?.to || sub.email;
    if (action === "preview") return json({ ok: true, preview: true, to, subject, html });

    if (action === "send") {
      if (!to) return json({ error: "no recipient email" }, 400);
      const plain = `Confirm your ownership details: ${link}`;
      // Keep the questionnaire inside the customer's existing Gmail conversation
      // so the whole chain stays together on the submission.
      const { data: recent } = await svc.from("email_messages")
        .select("gmail_thread_id, gmail_message_id, received_at")
        .eq("matched_submission_id", submissionId)
        .not("gmail_thread_id", "is", null)
        .order("received_at", { ascending: false })
        .limit(20);
      const realThread = ((recent ?? []) as { gmail_thread_id: string | null; gmail_message_id: string | null }[])
        .find((m) => m.gmail_thread_id && !m.gmail_thread_id.startsWith("packet-")
          && !m.gmail_thread_id.startsWith("ownership-") && !m.gmail_thread_id.startsWith("local-"));
      const gmailRes = await fetch(`${SUPABASE_URL}/functions/v1/gmail-action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("Authorization") ?? "",
          apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        },
        body: JSON.stringify({
          action: "send", to, subject, body: plain, htmlBody: html,
          submissionId,
          ...(realThread?.gmail_thread_id ? { threadId: realThread.gmail_thread_id } : {}),
          ...(realThread?.gmail_message_id ? { inReplyToGmailId: realThread.gmail_message_id } : {}),
        }),
      });

      const gmailText = await gmailRes.text();
      let gmailJson: Record<string, unknown> = {};
      try { gmailJson = JSON.parse(gmailText); } catch { /* non-JSON */ }
      if (!gmailRes.ok || gmailJson.error) {
        throw new Error(`Gmail send failed: ${gmailJson.error ? JSON.stringify(gmailJson.error) : `${gmailRes.status} ${gmailText}`}`);
      }

      const now = new Date().toISOString();
      const sentId = typeof gmailJson.id === "string" ? gmailJson.id : null;
      await svc.from("email_messages").upsert({
        gmail_message_id: sentId || `ownership-${submissionId}-${Date.now()}`,
        gmail_thread_id: (typeof gmailJson.threadId === "string" ? gmailJson.threadId : null) || `ownership-${submissionId}`,
        from_email: (typeof gmailJson.from === "string" ? gmailJson.from : "info@texascemeterybrokers.com"),
        from_name: "Texas Cemetery Brokers",
        to_email: to,
        subject,
        snippet: "Seller family tree — questionnaire sent so the seller can confirm the deed and family.",
        body_text: plain,
        body_html: html,
        received_at: now,
        matched_submission_id: submissionId,
        is_read: true,
      } as Record<string, unknown>, { onConflict: "gmail_message_id" });

      await svc.from("contact_submissions")
        .update({ ownership_answers: { ...answers, questionsSentAt: now } as never })
        .eq("id", submissionId);

      return json({ ok: true, to });
    }

    return json({ error: "unknown action" }, 400);
  } catch (err) {
    console.error("ownership-questions error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
