import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GMAIL_GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const DEFAULT_QUERY = "-in:sent -in:draft";
const FETCH_BATCH_SIZE = 10;

const BodySchema = z.object({
  pageToken: z.string().min(1).max(500).optional(),
  maxResults: z.number().int().min(1).max(500).optional().default(100),
  query: z.string().max(500).optional().default(DEFAULT_QUERY),
});

interface GmailHeader { name: string; value: string }
interface GmailPart { mimeType: string; body: { data?: string; size?: number }; parts?: GmailPart[] }
interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  labelIds?: string[];
  payload?: { headers?: GmailHeader[]; mimeType?: string; body?: { data?: string }; parts?: GmailPart[] };
}

interface SubmissionLite {
  id: string;
  name: string | null;
  email: string | null;
  source: string | null;
  cemetery: string | null;
  message: string | null;
  created_at: string;
}

function header(headers: GmailHeader[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function parseFromHeader(from: string): { email: string; name: string | null } {
  const match = from.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim().replace(/^"|"$/g, "") || null, email: match[2].toLowerCase().trim() };

  const emailMatch = from.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) return { email: emailMatch[0].toLowerCase(), name: from.replace(emailMatch[0], "").trim() || null };

  return { email: from.toLowerCase().trim() || "unknown@unknown.local", name: null };
}

function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(data.length / 4) * 4, "=");
  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractBody(payload: GmailMessage["payload"]): { text: string; html: string } {
  let text = "";
  let html = "";

  const walk = (part?: { mimeType?: string; body?: { data?: string }; parts?: GmailPart[] }) => {
    if (!part) return;
    if (part.body?.data) {
      const decoded = decodeBase64Url(part.body.data);
      if (part.mimeType === "text/plain" && !text) text = decoded;
      if (part.mimeType === "text/html" && !html) html = decoded;
    }
    if (part.parts) part.parts.forEach(walk);
  };

  walk(payload);
  return { text: text || (html ? stripHtml(html) : ""), html };
}

function normName(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^\p{L}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function fuzzyNameMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const ta = new Set(a.split(" ").filter((t) => t.length >= 3));
  const tb = b.split(" ").filter((t) => t.length >= 3);
  let hits = 0;
  for (const t of tb) if (ta.has(t)) hits++;
  return hits >= 2;
}

function matchSubmission(
  fromEmail: string,
  fromName: string | null,
  submissions: SubmissionLite[],
): { id: string; confidence: "high" | "medium" | "low" } | null {
  const byEmail = submissions.find((s) => (s.email ?? "").toLowerCase() === fromEmail);
  if (byEmail) return { id: byEmail.id, confidence: "high" };

  if (fromName) {
    const byName = submissions.find((s) => fuzzyNameMatch(normName(fromName), normName(s.name)));
    if (byName) return { id: byName.id, confidence: "medium" };
  }

  const local = fromEmail.split("@")[0]?.replace(/[._-]+/g, " ") ?? "";
  if (local.length >= 5) {
    const byLocal = submissions.find((s) => fuzzyNameMatch(normName(local), normName(s.name)));
    if (byLocal) return { id: byLocal.id, confidence: "low" };
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    let body: z.infer<typeof BodySchema>;
    try {
      const rawBody = await req.text();
      const parsed = BodySchema.safeParse(rawBody ? JSON.parse(rawBody) : {});
      if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
      body = parsed.data;
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const gmailKey = Deno.env.get("GOOGLE_MAIL_API_KEY");

    if (!lovableKey) return json({ error: "LOVABLE_API_KEY is not configured" }, 500);
    if (!gmailKey) return json({ error: "GOOGLE_MAIL_API_KEY is not configured" }, 500);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) return json({ error: "Admin only" }, 403);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: submissions } = await admin
      .from("contact_submissions")
      .select("id, name, email, source, cemetery, message, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    const subs: SubmissionLite[] = (submissions ?? []) as SubmissionLite[];

    const params = new URLSearchParams({ maxResults: String(body.maxResults), q: body.query });
    if (body.pageToken) params.set("pageToken", body.pageToken);

    const listRes = await fetch(`${GMAIL_GATEWAY}/users/me/messages?${params.toString()}`, {
      headers: gmailHeaders(lovableKey, gmailKey),
    });

    if (!listRes.ok) {
      const t = await listRes.text();
      return json({ error: `Gmail list failed: ${listRes.status} ${t}` }, 502);
    }

    const listData = await listRes.json();
    const messages: { id: string; threadId?: string }[] = listData.messages ?? [];
    const ids = messages.map((m) => m.id).filter(Boolean);

    const { data: existing } = await admin
      .from("email_messages")
      .select("id, gmail_message_id, from_email, from_name, matched_submission_id")
      .in("gmail_message_id", ids.length ? ids : ["__none__"]);

    const existingIds = new Set((existing ?? []).map((r: any) => r.gmail_message_id));
    const newIds = ids.filter((id) => !existingIds.has(id));

    let rematchedCount = 0;
    for (const row of (existing ?? []) as any[]) {
      if (row.matched_submission_id) continue;
      const m = matchSubmission(row.from_email, row.from_name, subs);
      if (m) {
        await admin
          .from("email_messages")
          .update({ matched_submission_id: m.id, match_confidence: m.confidence })
          .eq("id", row.id);
        rematchedCount++;
      }
    }

    const fetched: GmailMessage[] = [];
    for (let i = 0; i < newIds.length; i += FETCH_BATCH_SIZE) {
      const chunk = newIds.slice(i, i + FETCH_BATCH_SIZE);
      const results = await Promise.all(chunk.map(async (id) => {
        try {
          const r = await fetch(`${GMAIL_GATEWAY}/users/me/messages/${id}?format=full`, {
            headers: gmailHeaders(lovableKey, gmailKey),
          });
          if (!r.ok) {
            console.error(`Gmail message fetch failed for ${id}: ${r.status} ${await r.text()}`);
            return null;
          }
          return (await r.json()) as GmailMessage;
        } catch (error) {
          console.error(`Gmail message fetch errored for ${id}`, error);
          return null;
        }
      }));
      fetched.push(...results.filter((m): m is GmailMessage => !!m));
    }

    const rows = fetched.map((msg) => {
      const headers = msg.payload?.headers ?? [];
      const fromRaw = header(headers, "From");
      const { email: fromEmail, name: fromName } = parseFromHeader(fromRaw);
      const subject = header(headers, "Subject");
      const toEmail = header(headers, "To");
      const messageDate = Number.parseInt(msg.internalDate ?? "", 10);
      const receivedAt = Number.isFinite(messageDate) ? new Date(messageDate).toISOString() : new Date(header(headers, "Date") || Date.now()).toISOString();
      const { text, html } = extractBody(msg.payload);
      const match = matchSubmission(fromEmail, fromName, subs);

      return {
        gmail_message_id: msg.id,
        gmail_thread_id: msg.threadId,
        from_email: fromEmail,
        from_name: fromName,
        to_email: toEmail,
        subject,
        snippet: msg.snippet ?? "",
        body_text: text || null,
        body_html: html || null,
        received_at: receivedAt,
        is_read: !(msg.labelIds ?? []).includes("UNREAD"),
        ai_summary: null,
        ai_intent: null,
        ai_draft_reply: null,
        ai_analyzed_at: null,
        matched_submission_id: match?.id ?? null,
        match_confidence: match?.confidence ?? "none",
      };
    });

    let insertedCount = 0;
    let bayerCreated = 0;
    if (rows.length > 0) {
      const { data: inserted, error: insertError } = await admin
        .from("email_messages")
        .insert(rows)
        .select("id, gmail_message_id, subject, from_email, body_text, received_at");
      if (insertError) {
        console.error("Email insert failed", insertError);
        return json({ error: `Email insert failed: ${insertError.message}` }, 500);
      }
      insertedCount = inserted?.length ?? 0;

      // Auto-create contact_submissions for Bayer "Sell a Plot" form emails.
      for (const em of (inserted ?? []) as any[]) {
        const parsed = parseBayerSellAPlot(em.subject ?? "", em.from_email ?? "", em.body_text ?? "");
        if (!parsed) continue;
        try {
          // Skip if already imported (unique index on bayer_entry_id).
          const { data: existingSub } = await admin
            .from("contact_submissions")
            .select("id")
            .eq("bayer_entry_id", parsed.bayer_entry_id)
            .maybeSingle();
          if (existingSub) {
            await admin.from("email_messages")
              .update({ matched_submission_id: existingSub.id, match_confidence: "high" })
              .eq("id", em.id);
            continue;
          }
          const newId = crypto.randomUUID();
          const { error: subErr } = await admin.from("contact_submissions").insert({
            id: newId,
            source: "seller_quote",
            customer_kind: "seller",
            inquiry_channel: "bayer_sell_a_plot",
            bayer_entry_id: parsed.bayer_entry_id,
            name: parsed.name,
            email: parsed.email,
            phone: parsed.phone,
            cemetery: parsed.cemetery,
            cemetery_city: parsed.cemetery_city,
            spaces: parsed.spaces,
            details: parsed.details,
            deed_owner_names: parsed.deed_owner_names,
            deed_owners_status: parsed.deed_owners_status,
            relationship_to_owner: parsed.relationship_to_owner,
            purchase_info: parsed.purchase_info,
            message: parsed.additional_info,
            source_email_id: em.id,
            created_at: em.received_at,
          });
          if (subErr) {
            console.error("Bayer submission insert failed", subErr);
            continue;
          }
          await admin.from("email_messages")
            .update({ matched_submission_id: newId, match_confidence: "high" })
            .eq("id", em.id);
          bayerCreated++;
        } catch (err) {
          console.error("Bayer parse error", err);
        }
      }
    }

    return json({
      success: true,
      page_size: ids.length,
      already_cached: existingIds.size,
      newly_synced: insertedCount,
      rematched: rematchedCount,
      next_page_token: listData.nextPageToken ?? null,
      has_more: Boolean(listData.nextPageToken),
      result_size_estimate: listData.resultSizeEstimate ?? null,
      bayer_imported: bayerCreated,
    });
  } catch (e) {
    console.error("sync-inbox error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function gmailHeaders(lovableKey: string, gmailKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": gmailKey,
    "Content-Type": "application/json",
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---- Bayer "Sell a Plot" form parser ---------------------------------------
// Detects emails generated by https://bayercemeterybrokers.com/list-a-plot-california/
// Subject pattern: "New Sell a Plot entry: #1234"
// Body is a label/value sequence. We extract canonical fields.
interface BayerSellAPlot {
  bayer_entry_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  cemetery: string | null;
  cemetery_city: string | null;
  spaces: string | null;
  details: string | null;
  deed_owner_names: string | null;
  deed_owners_status: string | null;
  relationship_to_owner: string | null;
  purchase_info: string | null;
  additional_info: string | null;
}

function parseBayerSellAPlot(subject: string, fromEmail: string, body: string): BayerSellAPlot | null {
  const subjectMatch = subject.match(/Sell a Plot entry:\s*#(\d+)/i);
  if (!subjectMatch) return null;
  // Sender check is a soft hint; subject + body labels are the strong signal.
  const fromOk = /bayer/i.test(fromEmail) || /bayer/i.test(body);
  if (!fromOk) return null;

  const bayerEntryId = subjectMatch[1];
  const text = (body || "").replace(/&#039;/g, "'").replace(/&amp;/g, "&");

  // Split into trimmed non-blank lines. Email body is label / blank / blank / value / blank...
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const KNOWN_LABELS = [
    "Name", "Email", "Phone",
    "Cemetery name", "Cemetery City and State",
    "Number of plots/spaces", "Description and location of plots/spaces",
    "Plot owner's name as it appears on the deed",
    "Plot owners name as it appears on the deed",
    "Are the plot owner/s named on the deed currently living or deceased?",
    "Are the plot owners named on the deed currently living or deceased?",
    "Your relationship to the plot owner/s named on the deed",
    "Your relationship to the plot owners named on the deed",
    "When was the plot/s purchased and for what amount? (estimate is OK)",
    "When was the plots purchased and for what amount? (estimate is OK)",
    "When was the plot purchased and for what amount? (estimate is OK)",
    "Any additional information you'd like us to know?",
    "Any additional information youd like us to know?",
  ];
  const isLabel = (s: string) => KNOWN_LABELS.some((l) => l.toLowerCase() === s.toLowerCase().replace(/\s+/g, " ").trim());

  // Collect every non-label line between this label and the next known label,
  // so multi-line answers (e.g. long "additional information") aren't truncated.
  // Lines that look like form metadata appended by the website (URL of the page,
  // browser user-agent, IP address). These are NOT customer content and must be
  // stripped from every captured field.
  const isJunkLine = (s: string): boolean => {
    const t = s.trim();
    if (!t) return true;
    // URL
    if (/^https?:\/\/\S+$/i.test(t)) return true;
    // IPv4
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(t)) return true;
    // IPv6 (loose)
    if (/^[0-9a-f]{0,4}(:[0-9a-f]{0,4}){2,7}$/i.test(t)) return true;
    // User-Agent strings
    if (/Mozilla\/\d|AppleWebKit\/|Chrome\/|Safari\/|Firefox\/|Edge\/|Gecko\//i.test(t)) return true;
    return false;
  };

  const grab = (...labels: string[]): string | null => {
    for (const label of labels) {
      const target = label.toLowerCase();
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase() === target) {
          const collected: string[] = [];
          for (let j = i + 1; j < lines.length; j++) {
            if (isLabel(lines[j])) break;
            if (isJunkLine(lines[j])) continue;
            collected.push(lines[j]);
          }
          if (collected.length) return collected.join("\n");
        }
      }
    }
    return null;
  };

  return {
    bayer_entry_id: bayerEntryId,
    name: grab("Name"),
    email: grab("Email"),
    phone: grab("Phone"),
    cemetery: grab("Cemetery name"),
    cemetery_city: grab("Cemetery City and State"),
    spaces: grab("Number of plots/spaces"),
    details: grab("Description and location of plots/spaces"),
    deed_owner_names: grab("Plot owner's name as it appears on the deed", "Plot owners name as it appears on the deed"),
    deed_owners_status: grab("Are the plot owner/s named on the deed currently living or deceased?", "Are the plot owners named on the deed currently living or deceased?"),
    relationship_to_owner: grab("Your relationship to the plot owner/s named on the deed", "Your relationship to the plot owners named on the deed"),
    purchase_info: grab("When was the plot/s purchased and for what amount? (estimate is OK)", "When was the plots purchased and for what amount? (estimate is OK)", "When was the plot purchased and for what amount? (estimate is OK)"),
    additional_info: grab("Any additional information you'd like us to know?", "Any additional information youd like us to know?"),
  };
}
