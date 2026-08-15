// Automatic 24-hour follow-up for sellers who STARTED the family tree
// questionnaire (/confirm?s=…) but never finished it.
//
// Runs hourly on a schedule. For each matching submission it sends one — and
// only ever one — gentle reminder from info@, threads it into the seller's
// existing Gmail conversation, and writes it into email_messages so the office
// can see it on the submission's email record.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GOOGLE_MAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY")!;
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const FROM_EMAIL = "info@texascemeterybrokers.com";
const PUBLIC_SITE_URL = "https://www.texascemeterybrokers.com";

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const b64url = (s: string) =>
  btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

type V2 = {
  rel?: string; youName?: string; selfIs?: string; couple?: string; note?: string;
  deed?: { n?: string; st?: string }[];
  kids?: { n?: string }[];
  will?: Record<string, string>; spouse?: Record<string, { has?: string; n?: string }>;
  poa?: Record<string, { has?: string }>; heirSpouse?: Record<string, { has?: string }>;
  taker?: Record<string, string>; spaces?: { used?: string; who?: string }[];
  submitted?: boolean;
};

/** Did the seller actually type anything into the tree? */
const hasStarted = (v2: V2): boolean => {
  if (!v2) return false;
  if ((v2.rel ?? "").trim() || (v2.youName ?? "").trim() || (v2.selfIs ?? "").trim()) return true;
  if ((v2.couple ?? "").trim() || (v2.note ?? "").trim()) return true;
  if ((v2.kids ?? []).some((k) => (k?.n ?? "").trim())) return true;
  if (Object.keys(v2.will ?? {}).length || Object.keys(v2.taker ?? {}).length) return true;
  if (Object.keys(v2.spouse ?? {}).length || Object.keys(v2.poa ?? {}).length) return true;
  if (Object.keys(v2.heirSpouse ?? {}).length) return true;
  if ((v2.spaces ?? []).some((s) => (s?.used ?? "").trim() || (s?.who ?? "").trim())) return true;
  return false;
};

const buildHtml = (firstName: string, cemetery: string | null, link: string) => `
<!doctype html>
<html><body data-family-tree="1" style="margin:0;padding:0;background:#f5f1ea;font-family:Georgia,'Times New Roman',serif;color:#1f2a37;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1ea;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(31,42,55,0.08);">
        <tr><td style="background:#1f2a37;color:#ffffff;padding:32px 40px;text-align:center;">
          <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#d9c7a3;">Texas Cemetery Brokers</div>
          <div style="font-size:22px;margin-top:10px;">Your answers are saved</div>
        </td></tr>
        <tr><td style="padding:32px 40px;font-size:15px;line-height:1.7;">
          <p style="margin:0 0 16px;">Dear ${esc(firstName)},</p>
          <p style="margin:0 0 16px;">
            Thank you for starting the ownership questions${cemetery ? ` for your property at ${esc(cemetery)}` : ""}.
            Everything you entered has been saved — there are just a few answers still outstanding.
          </p>
          <p style="margin:0 0 22px;">
            Opening the same link picks up exactly where you left off, and it usually takes
            two or three minutes to finish. Once it is complete a broker reviews your answers
            and prepares the correct paperwork for you, so nothing is signed unnecessarily.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
            <tr><td align="center" style="background:#1f2a37;border-radius:8px;">
              <a href="${esc(link)}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;">
                Finish your answers →
              </a>
            </td></tr>
          </table>
          <p style="margin:26px 0 0;font-size:13px;color:#4a5568;">
            Or copy this link into your browser:<br/>
            <span style="color:#1f2a37;word-break:break-all;">${esc(link)}</span>
          </p>
          <div style="margin:24px 0 0;padding:18px 20px;background:#f7f3ec;border-radius:10px;">
            <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#8a6d3b;">Stuck on a question?</div>
            <p style="margin:8px 0 0;font-size:13px;color:#4a5568;line-height:1.7;">
              You do not need to know every answer. Leave anything you are unsure of blank, or call
              <a href="tel:+12142304740" style="color:#1f2a37;text-decoration:none;"><strong>(214) 230-4740</strong></a>
              and a broker will go through it with you. There is never a charge for asking, and please
              do not send us any documents yet — we will tell you exactly what is needed.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const svc = createClient(SUPABASE_URL, SERVICE_KEY);
  const results: { id: string; to: string; status: string }[] = [];

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;
    const onlyId = typeof body?.submission_id === "string" ? body.submission_id : null;

    let q = svc
      .from("contact_submissions")
      .select("id, name, email, cemetery, ownership_answers, deleted_at")
      .is("deleted_at", null)
      .not("email", "is", null)
      // Only rows where the questionnaire link was actually sent — otherwise a
      // large submission table pushes the real candidates past the page limit.
      .not("ownership_answers->>questionsSentAt", "is", null)
      .is("ownership_answers->>sellerConfirmedAt", null)
      .is("ownership_answers->>treeFollowupSentAt", null)
      .limit(500);
    if (onlyId) q = q.eq("id", onlyId);
    const { data: subs, error } = await q;
    if (error) throw error;

    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    for (const sub of (subs ?? []) as {
      id: string; name: string | null; email: string | null; cemetery: string | null;
      ownership_answers: Record<string, unknown> | null;
    }[]) {
      const a = (sub.ownership_answers ?? {}) as Record<string, unknown>;
      const v2 = (a.v2 ?? {}) as V2;
      const sentAt = typeof a.questionsSentAt === "string" ? Date.parse(a.questionsSentAt) : NaN;

      if (!Number.isFinite(sentAt) || sentAt > cutoff) continue;      // never sent, or sent < 24h ago
      if (a.sellerConfirmedAt || v2.submitted === true) continue;      // already finished
      if (a.treeFollowupSentAt) continue;                              // only ever one reminder
      if (!hasStarted(v2)) continue;                                   // started only
      if (!sub.email) continue;

      const link = `${PUBLIC_SITE_URL}/confirm?s=${sub.id}`;
      const firstName = (sub.name ?? "").trim().split(/\s+/)[0] || "there";
      const subject = `Finishing your ownership questions${sub.cemetery ? ` — ${sub.cemetery}` : ""}`;
      const html = buildHtml(firstName, sub.cemetery, link);
      const plain = `Your answers are saved — finish the remaining questions here: ${link}`;

      if (dryRun) {
        results.push({ id: sub.id, to: sub.email, status: "would-send" });
        continue;
      }

      // Keep it inside the seller's real Gmail conversation where one exists.
      const { data: recent } = await svc.from("email_messages")
        .select("gmail_thread_id, received_at")
        .eq("matched_submission_id", sub.id)
        .not("gmail_thread_id", "is", null)
        .order("received_at", { ascending: false })
        .limit(20);
      const threadId = ((recent ?? []) as { gmail_thread_id: string | null }[])
        .map((m) => m.gmail_thread_id)
        .find((t) => t && !t.startsWith("packet-") && !t.startsWith("ownership-") && !t.startsWith("local-"));

      const mime = [
        `From: Texas Cemetery Brokers <${FROM_EMAIL}>`,
        `To: ${sub.email}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset="UTF-8"`,
        ``,
        html,
      ].join("\r\n");

      const sendRes = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": GOOGLE_MAIL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: b64url(mime), ...(threadId ? { threadId } : {}) }),
      });
      const sendJson = await sendRes.json().catch(() => ({}));
      if (!sendRes.ok) {
        console.error("follow-up send failed", sub.id, sendRes.status, sendJson);
        results.push({ id: sub.id, to: sub.email, status: `failed ${sendRes.status}` });
        continue;
      }

      const now = new Date().toISOString();
      await svc.from("email_messages").upsert({
        gmail_message_id: typeof sendJson.id === "string" ? sendJson.id : `tree-followup-${sub.id}-${Date.now()}`,
        gmail_thread_id: (typeof sendJson.threadId === "string" ? sendJson.threadId : null) || threadId || `ownership-${sub.id}`,
        from_email: FROM_EMAIL,
        from_name: "Texas Cemetery Brokers",
        to_email: sub.email,
        subject,
        snippet: "Automatic 24-hour reminder — seller started the family tree but has not finished it.",
        body_text: plain,
        body_html: html,
        received_at: now,
        matched_submission_id: sub.id,
        is_read: true,
      } as Record<string, unknown>, { onConflict: "gmail_message_id" });

      await svc.from("contact_submissions")
        .update({ ownership_answers: { ...a, treeFollowupSentAt: now } as never })
        .eq("id", sub.id);

      results.push({ id: sub.id, to: sub.email, status: "sent" });
    }

    return new Response(JSON.stringify({ ok: true, count: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("family-tree-followup error", err);
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
