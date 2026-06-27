// Gmail action proxy for info@texascemeterybrokers.com.
// Lets the admin panel send, reply (with threading), mark read/unread,
// archive, and trash messages directly through Gmail's API via the
// Lovable connector gateway — no Gmail tab needed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GMAIL_GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const TARGET_MAILBOX = "info@texascemeterybrokers.com";

const SendSchema = z.object({
  action: z.literal("send"),
  to: z.string().min(3).max(2000),
  cc: z.string().max(2000).optional().default(""),
  bcc: z.string().max(2000).optional().default(""),
  subject: z.string().max(998).optional().default(""),
  body: z.string().max(200000).optional().default(""),
  htmlBody: z.string().max(400000).optional(),
  threadId: z.string().max(200).optional(),
  inReplyToGmailId: z.string().max(200).optional(),
});

const ModifySchema = z.object({
  action: z.literal("modify"),
  messageId: z.string().min(1).max(200),
  addLabelIds: z.array(z.string()).max(20).optional().default([]),
  removeLabelIds: z.array(z.string()).max(20).optional().default([]),
});

const TrashSchema = z.object({
  action: z.literal("trash"),
  messageId: z.string().min(1).max(200),
});

const RefreshSchema = z.object({
  action: z.literal("refresh"),
  messageId: z.string().min(1).max(200),
});

const BodySchema = z.discriminatedUnion("action", [SendSchema, ModifySchema, TrashSchema, RefreshSchema]);

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function gmailHeaders(lovableKey: string, gmailKey: string): HeadersInit {
  return { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gmailKey, "Content-Type": "application/json" };
}

function encodeBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildRfc2822(opts: {
  from: string; to: string; cc?: string; bcc?: string;
  subject: string; body: string; htmlBody?: string;
  inReplyTo?: string; references?: string;
}): string {
  const headers: string[] = [];
  headers.push(`From: ${opts.from}`);
  headers.push(`To: ${opts.to}`);
  if (opts.cc) headers.push(`Cc: ${opts.cc}`);
  if (opts.bcc) headers.push(`Bcc: ${opts.bcc}`);
  headers.push(`Subject: ${opts.subject}`);
  if (opts.inReplyTo) headers.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) headers.push(`References: ${opts.references}`);
  headers.push("MIME-Version: 1.0");

  if (opts.htmlBody) {
    const boundary = `=_tcb_${crypto.randomUUID().replace(/-/g, "")}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    const parts: string[] = [];
    parts.push(`--${boundary}`);
    parts.push('Content-Type: text/plain; charset="UTF-8"');
    parts.push("Content-Transfer-Encoding: 8bit");
    parts.push("");
    parts.push(opts.body || "");
    parts.push(`--${boundary}`);
    parts.push('Content-Type: text/html; charset="UTF-8"');
    parts.push("Content-Transfer-Encoding: 8bit");
    parts.push("");
    parts.push(opts.htmlBody);
    parts.push(`--${boundary}--`);
    return [...headers, "", ...parts].join("\r\n");
  }

  headers.push('Content-Type: text/plain; charset="UTF-8"');
  headers.push("Content-Transfer-Encoding: 8bit");
  return [...headers, "", opts.body].join("\r\n");
}

async function resolveGmailKey(lovableKey: string): Promise<string | null> {
  const keys: string[] = [];
  const seen = new Set<string>();
  const push = (v?: string | null) => { if (v && !seen.has(v)) { seen.add(v); keys.push(v); } };
  push(Deno.env.get("GOOGLE_MAIL_API_KEY"));
  for (let i = 1; i <= 9; i++) push(Deno.env.get(`GOOGLE_MAIL_API_KEY_${i}`));
  for (const k of keys) {
    try {
      const r = await fetch(`${GMAIL_GATEWAY}/users/me/profile`, { headers: gmailHeaders(lovableKey, k) });
      if (!r.ok) continue;
      const j = await r.json();
      if (String(j.emailAddress || "").toLowerCase() === TARGET_MAILBOX) return k;
    } catch { /* try next */ }
  }
  return keys[0] ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401);

    const raw = await req.text();
    const parsed = BodySchema.safeParse(raw ? JSON.parse(raw) : {});
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const input = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);
    const { data: role } = await userClient.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Admin only" }, 403);

    const gmailKey = await resolveGmailKey(lovableKey);
    if (!gmailKey) return json({ error: `No Gmail connector linked for ${TARGET_MAILBOX}` }, 500);
    const admin = createClient(supabaseUrl, serviceKey);

    if (input.action === "send") {
      let inReplyTo: string | undefined;
      let references: string | undefined;
      let threadId = input.threadId;

      // If replying, fetch original message headers to set In-Reply-To / References.
      if (input.inReplyToGmailId) {
        const r = await fetch(
          `${GMAIL_GATEWAY}/users/me/messages/${input.inReplyToGmailId}?format=metadata&metadataHeaders=Message-Id&metadataHeaders=References&metadataHeaders=Subject`,
          { headers: gmailHeaders(lovableKey, gmailKey) },
        );
        if (r.ok) {
          const j = await r.json();
          threadId = threadId || j.threadId;
          const headers: { name: string; value: string }[] = j.payload?.headers ?? [];
          const find = (n: string) => headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value;
          const mid = find("Message-Id") || find("Message-ID");
          const refs = find("References");
          if (mid) inReplyTo = mid;
          if (mid) references = refs ? `${refs} ${mid}` : mid;
        }
      }

      const raw2822 = buildRfc2822({
        from: TARGET_MAILBOX,
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        subject: input.subject || "(no subject)",
        body: input.body,
        inReplyTo,
        references,
      });

      const payload: Record<string, unknown> = { raw: encodeBase64Url(raw2822) };
      if (threadId) payload.threadId = threadId;

      const sendRes = await fetch(`${GMAIL_GATEWAY}/users/me/messages/send`, {
        method: "POST",
        headers: gmailHeaders(lovableKey, gmailKey),
        body: JSON.stringify(payload),
      });
      const sendText = await sendRes.text();
      if (!sendRes.ok) return json({ error: `Send failed: ${sendRes.status} ${sendText}` }, 502);
      let sent: any = {};
      try { sent = JSON.parse(sendText); } catch { /* */ }

      // Optimistically log the sent message so the inbox/thread reflects it before next sync.
      try {
        await admin.from("email_messages").insert({
          gmail_message_id: sent.id || `local-${crypto.randomUUID()}`,
          gmail_thread_id: sent.threadId || threadId || null,
          from_email: TARGET_MAILBOX,
          from_name: "Texas Cemetery Brokers",
          to_email: input.to,
          subject: input.subject || "(no subject)",
          snippet: input.body.slice(0, 200),
          body_text: input.body,
          received_at: new Date().toISOString(),
          is_read: true,
        });
      } catch { /* ignore — sync will reconcile */ }

      return json({ ok: true, id: sent.id, threadId: sent.threadId });
    }

    if (input.action === "modify") {
      const r = await fetch(`${GMAIL_GATEWAY}/users/me/messages/${input.messageId}/modify`, {
        method: "POST",
        headers: gmailHeaders(lovableKey, gmailKey),
        body: JSON.stringify({ addLabelIds: input.addLabelIds, removeLabelIds: input.removeLabelIds }),
      });
      if (!r.ok) return json({ error: `Modify failed: ${r.status} ${await r.text()}` }, 502);
      // Mirror read state locally.
      if (input.removeLabelIds.includes("UNREAD")) {
        await admin.from("email_messages").update({ is_read: true }).eq("gmail_message_id", input.messageId);
      }
      if (input.addLabelIds.includes("UNREAD")) {
        await admin.from("email_messages").update({ is_read: false }).eq("gmail_message_id", input.messageId);
      }
      return json({ ok: true });
    }

    if (input.action === "trash") {
      const r = await fetch(`${GMAIL_GATEWAY}/users/me/messages/${input.messageId}/trash`, {
        method: "POST",
        headers: gmailHeaders(lovableKey, gmailKey),
      });
      if (!r.ok) return json({ error: `Trash failed: ${r.status} ${await r.text()}` }, 502);
      await admin.from("email_messages").delete().eq("gmail_message_id", input.messageId);
      return json({ ok: true });
    }

    if (input.action === "refresh") {
      const r = await fetch(`${GMAIL_GATEWAY}/users/me/messages/${input.messageId}?format=full`, {
        headers: gmailHeaders(lovableKey, gmailKey),
      });
      if (!r.ok) return json({ error: `Refresh failed: ${r.status} ${await r.text()}` }, 502);
      return json({ ok: true, message: await r.json() });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("gmail-action error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
