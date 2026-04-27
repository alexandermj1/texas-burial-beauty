// Sync recent Gmail messages, AI-classify, match to submissions (email + name), cache to DB.
// Admin-only. Uses Lovable AI (cheap model) for batch analysis.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GMAIL_GATEWAY = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface GmailHeader { name: string; value: string }
interface GmailPart { mimeType: string; body: { data?: string; size: number }; parts?: GmailPart[] }
interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  internalDate: string;
  labelIds: string[];
  payload: { headers: GmailHeader[]; mimeType: string; body: { data?: string }; parts?: GmailPart[] };
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
  const match = from.match(/^(.*?)\s*<(.+?)>$/);
  if (match) return { name: match[1].trim().replace(/^"|"$/g, "") || null, email: match[2].toLowerCase() };
  return { email: from.toLowerCase().trim(), name: null };
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  try { return atob(base64); } catch { return ""; }
}

function extractBody(payload: GmailMessage["payload"]): { text: string; html: string } {
  let text = "";
  let html = "";
  const walk = (part: { mimeType: string; body: { data?: string }; parts?: GmailPart[] }) => {
    if (part.body?.data) {
      const decoded = decodeBase64Url(part.body.data);
      if (part.mimeType === "text/plain" && !text) text = decoded;
      else if (part.mimeType === "text/html" && !html) html = decoded;
    }
    if (part.parts) part.parts.forEach(walk);
  };
  walk(payload);
  return { text, html };
}

// Normalize a name for fuzzy comparison: lowercase, strip punctuation, collapse whitespace.
function normName(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^\p{L}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

// Returns true if two name strings share at least 2 tokens of length >=3 (first + last).
function fuzzyNameMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const ta = new Set(a.split(" ").filter((t) => t.length >= 3));
  const tb = b.split(" ").filter((t) => t.length >= 3);
  let hits = 0;
  for (const t of tb) if (ta.has(t)) hits++;
  return hits >= 2;
}

// Match an email to the best submission. Returns { id, confidence } or null.
function matchSubmission(
  fromEmail: string,
  fromName: string | null,
  submissions: SubmissionLite[],
): { id: string; confidence: "high" | "medium" | "low" } | null {
  // 1. Exact email match wins.
  const byEmail = submissions.find((s) => (s.email ?? "").toLowerCase() === fromEmail);
  if (byEmail) return { id: byEmail.id, confidence: "high" };

  // 2. Fuzzy name match (first + last token overlap).
  if (fromName) {
    const normFrom = normName(fromName);
    const byName = submissions.find((s) => fuzzyNameMatch(normFrom, normName(s.name)));
    if (byName) return { id: byName.id, confidence: "medium" };
  }

  // 3. Local-part of email overlaps with name.
  const local = fromEmail.split("@")[0]?.replace(/[._\-]+/g, " ") ?? "";
  if (local.length >= 5) {
    const byLocal = submissions.find((s) => fuzzyNameMatch(normName(local), normName(s.name)));
    if (byLocal) return { id: byLocal.id, confidence: "low" };
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const gmailKey = Deno.env.get("GOOGLE_MAIL_API_KEY")!;
    if (!lovableKey || !gmailKey) return json({ error: "Missing connector keys" }, 500);

    // Load submissions once for matching (used for both new and re-match).
    const { data: submissions } = await admin
      .from("contact_submissions")
      .select("id, name, email, source, cemetery, message, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    const subs: SubmissionLite[] = (submissions ?? []) as any;

    // Step 1: list message IDs from last 7 days.
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    const listRes = await fetch(
      `${GMAIL_GATEWAY}/users/me/messages?maxResults=50&q=after:${sevenDaysAgo} -in:sent -in:draft`,
      { headers: gmailHeaders(lovableKey, gmailKey) }
    );
    if (!listRes.ok) {
      const t = await listRes.text();
      return json({ error: `Gmail list failed: ${listRes.status} ${t}` }, 502);
    }
    const listData = await listRes.json();
    const messages: { id: string; threadId: string }[] = listData.messages ?? [];

    const ids = messages.map((m) => m.id);
    const { data: existing } = await admin
      .from("email_messages")
      .select("id, gmail_message_id, from_email, from_name, matched_submission_id")
      .in("gmail_message_id", ids.length ? ids : ["__none__"]);
    const existingIds = new Set((existing ?? []).map((r: any) => r.gmail_message_id));
    const newIds = ids.filter((id) => !existingIds.has(id));

    // Step 1b: re-run matching across already-cached emails that still have no match.
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

    // Step 2: fetch full message bodies for new IDs only — parallelize, cap at 10/run for speed.
    const toFetch = newIds.slice(0, 10);
    const fetched: GmailMessage[] = (
      await Promise.all(
        toFetch.map(async (id) => {
          try {
            const r = await fetch(`${GMAIL_GATEWAY}/users/me/messages/${id}?format=full`, {
              headers: gmailHeaders(lovableKey, gmailKey),
            });
            return r.ok ? ((await r.json()) as GmailMessage) : null;
          } catch {
            return null;
          }
        })
      )
    ).filter((m): m is GmailMessage => !!m);

    // Step 3: AI-analyze in parallel + insert sequentially.
    const analyses = await Promise.all(fetched.map(async (msg) => {
      const headers = msg.payload?.headers ?? [];
      const fromRaw = header(headers, "From");
      const { email: fromEmail, name: fromName } = parseFromHeader(fromRaw);
      const subject = header(headers, "Subject");
      const toEmail = header(headers, "To");
      const dateMs = parseInt(msg.internalDate, 10);
      const { text, html } = extractBody(msg.payload);
      const match = matchSubmission(fromEmail, fromName, subs);

      let aiSummary: string | null = null;
      let aiIntent: string | null = null;
      let aiDraft: string | null = null;
      const bodyForAi = (text || msg.snippet || "").slice(0, 2000);
      if (bodyForAi.length > 20) {
        try {
          const aiRes = await fetch(AI_GATEWAY, {
            method: "POST",
            headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: "You are an assistant for Texas Cemetery Brokers. Analyze inbound emails. Respond ONLY via the provided tool." },
                { role: "user", content: `From: ${fromName ?? fromEmail} <${fromEmail}>\nSubject: ${subject}\n\n${bodyForAi}\n\nAnalyze this email.` },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "analyze_email",
                  description: "Analyze an inbound email",
                  parameters: {
                    type: "object",
                    properties: {
                      summary: { type: "string", description: "One-sentence summary" },
                      intent: { type: "string", enum: ["quote_accepted", "quote_declined", "question", "document_submission", "new_inquiry", "spam_or_unrelated", "other"] },
                      draft_reply: { type: "string", description: "Short professional draft reply (3-5 sentences). Sign as 'The Team at Texas Cemetery Brokers'." },
                    },
                    required: ["summary", "intent", "draft_reply"],
                    additionalProperties: false,
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "analyze_email" } },
            }),
          });
          if (aiRes.ok) {
            const aiJson = await aiRes.json();
            const args = aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
            if (args) {
              const parsed = JSON.parse(args);
              aiSummary = parsed.summary ?? null;
              aiIntent = parsed.intent ?? null;
              aiDraft = parsed.draft_reply ?? null;
            }
          }
        } catch (e) {
          console.error("AI analysis failed", e);
        }
      }

      return {
        gmail_message_id: msg.id,
        gmail_thread_id: msg.threadId,
        from_email: fromEmail,
        from_name: fromName,
        to_email: toEmail,
        subject,
        snippet: msg.snippet,
        body_text: text || null,
        body_html: html || null,
        received_at: new Date(dateMs).toISOString(),
        is_read: !msg.labelIds?.includes("UNREAD"),
        ai_summary: aiSummary,
        ai_intent: aiIntent,
        ai_draft_reply: aiDraft,
        ai_analyzed_at: aiSummary ? new Date().toISOString() : null,
        matched_submission_id: match?.id ?? null,
        match_confidence: match?.confidence ?? "none",
      };
    }));

    const inserted: any[] = [];
    if (analyses.length > 0) {
      const { data: ins, error: insErr } = await admin.from("email_messages").insert(analyses).select();
      if (insErr) console.error("Bulk insert failed", insErr);
      else if (ins) inserted.push(...ins);
    }

    return json({
      success: true,
      total_in_inbox: messages.length,
      already_cached: existingIds.size,
      newly_synced: inserted.length,
      rematched: rematchedCount,
      remaining_to_sync: newIds.length - toFetch.length,
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
