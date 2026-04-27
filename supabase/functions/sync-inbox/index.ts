// Sync recent Gmail messages, AI-classify, match to submissions, cache to DB.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: require admin
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

    // Service client for cached writes (bypass RLS)
    const admin = createClient(supabaseUrl, serviceKey);

    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const gmailKey = Deno.env.get("GOOGLE_MAIL_API_KEY")!;
    if (!lovableKey || !gmailKey) return json({ error: "Missing connector keys" }, 500);

    // Step 1: list message IDs from last 7 days
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

    // Find which IDs are already cached
    const ids = messages.map((m) => m.id);
    const { data: existing } = await admin
      .from("email_messages")
      .select("gmail_message_id")
      .in("gmail_message_id", ids.length ? ids : ["__none__"]);
    const existingIds = new Set((existing ?? []).map((r: { gmail_message_id: string }) => r.gmail_message_id));
    const newIds = ids.filter((id) => !existingIds.has(id));

    // Step 2: fetch full message bodies for new IDs only (cap at 25 per sync to control credits)
    const toFetch = newIds.slice(0, 25);
    const fetched: GmailMessage[] = [];
    for (const id of toFetch) {
      const r = await fetch(`${GMAIL_GATEWAY}/users/me/messages/${id}?format=full`, {
        headers: gmailHeaders(lovableKey, gmailKey),
      });
      if (r.ok) fetched.push(await r.json());
    }

    // Step 3: load existing submissions for matching
    const { data: submissions } = await admin
      .from("contact_submissions")
      .select("id, name, email, source, cemetery, message, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    // Step 4: insert raw rows + run AI batch analysis
    const inserted: any[] = [];
    for (const msg of fetched) {
      const headers = msg.payload?.headers ?? [];
      const fromRaw = header(headers, "From");
      const { email: fromEmail, name: fromName } = parseFromHeader(fromRaw);
      const subject = header(headers, "Subject");
      const toEmail = header(headers, "To");
      const dateMs = parseInt(msg.internalDate, 10);
      const { text, html } = extractBody(msg.payload);

      // Quick heuristic match by sender email
      const candidate = (submissions ?? []).find(
        (s: any) => (s.email ?? "").toLowerCase() === fromEmail
      );

      let aiSummary: string | null = null;
      let aiIntent: string | null = null;
      let aiDraft: string | null = null;
      let matchedId: string | null = candidate?.id ?? null;
      let matchConfidence: string = candidate ? "high" : "none";

      // Only call AI for emails with real content
      const bodyForAi = (text || msg.snippet || "").slice(0, 2000);
      if (bodyForAi.length > 20) {
        try {
          const aiRes = await fetch(AI_GATEWAY, {
            method: "POST",
            headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                {
                  role: "system",
                  content:
                    "You are an assistant for Texas Cemetery Brokers. Analyze inbound emails. Respond ONLY via the provided tool.",
                },
                {
                  role: "user",
                  content: `From: ${fromName ?? fromEmail} <${fromEmail}>\nSubject: ${subject}\n\n${bodyForAi}\n\nAnalyze this email.`,
                },
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
                      intent: {
                        type: "string",
                        enum: ["quote_accepted", "quote_declined", "question", "document_submission", "new_inquiry", "spam_or_unrelated", "other"],
                      },
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
          } else if (aiRes.status === 429 || aiRes.status === 402) {
            console.warn("AI rate/credit limit hit, skipping analysis for remaining emails");
          }
        } catch (e) {
          console.error("AI analysis failed", e);
        }
      }

      const row = {
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
        matched_submission_id: matchedId,
        match_confidence: matchConfidence,
      };

      const { data: ins, error: insErr } = await admin
        .from("email_messages")
        .insert(row)
        .select()
        .single();
      if (insErr) console.error("Insert failed", insErr);
      else inserted.push(ins);
    }

    return json({
      success: true,
      total_in_inbox: messages.length,
      already_cached: existingIds.size,
      newly_synced: inserted.length,
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
