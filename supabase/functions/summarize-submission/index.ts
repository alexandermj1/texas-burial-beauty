// Generates a short "where is this submission up to" summary for the CRM list.
// Cheap model (gemini flash lite), cached on contact_submissions.ai_summary and
// keyed on a state fingerprint so we only re-generate when something changed.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SYSTEM = `You summarise the current status of a cemetery-plot seller/buyer enquiry for an internal CRM list.
Reply in EXACTLY this format, nothing else:
HEADLINE: <max 7 words — what they want, or the single next action for our team. Punchy, no full stop.>
SUMMARY: <1-2 short sentences, max 180 characters, plain English, where things stand.>
Be factual — only use the supplied data. Never invent prices, dates, or promises. No markdown, no bullets.`;

// Bump the version when the prompt/format changes so cached summaries regenerate.
const PROMPT_VERSION = "v2";

function fingerprint(s: any, lastMsgAt: string | null): string {
  return [
    PROMPT_VERSION,
    s.quote_sent_at, s.quote_response, s.quote_responded_at, s.accepted_quote_amount,
    s.documents_requested_at, s.documents_completed_at, s.la_signed_at,
    s.handled, s.custom_tag, lastMsgAt,
  ].map(v => (v == null ? "" : String(v))).join("|");
}

// Normalise the model output into "headline||summary".
function pack(raw: string): string {
  const h = raw.match(/HEADLINE:\s*(.+)/i)?.[1]?.trim().replace(/[.]$/, "") ?? "";
  const s = raw.match(/SUMMARY:\s*([\s\S]+)/i)?.[1]?.trim() ?? raw.trim();
  return h ? `${h}||${s}` : s;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI not configured" }, 500);

    const { submissionIds } = await req.json();
    const ids: string[] = Array.isArray(submissionIds) ? submissionIds.slice(0, 12) : [];
    if (!ids.length) return json({ summaries: {} });

    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: subs } = await svc.from("contact_submissions").select("*").in("id", ids);
    if (!subs?.length) return json({ summaries: {} });

    const emails = new Map<string, any[]>();
    const { data: msgs } = await svc
      .from("email_messages")
      .select("matched_submission_id,from_email,from_name,subject,snippet,received_at")
      .in("matched_submission_id", ids)
      .order("received_at", { ascending: false })
      .limit(200);
    for (const m of msgs ?? []) {
      const arr = emails.get(m.matched_submission_id) ?? [];
      if (arr.length < 5) arr.push(m);
      emails.set(m.matched_submission_id, arr);
    }

    const summaries: Record<string, string> = {};

    for (const s of subs as any[]) {
      const thread = emails.get(s.id) ?? [];
      const lastMsgAt = thread[0]?.received_at ?? null;
      const key = fingerprint(s, lastMsgAt);
      if (s.ai_summary && s.ai_summary_key === key) {
        summaries[s.id] = s.ai_summary;
        continue;
      }

      const facts = [
        `Enquiry received: ${s.created_at}`,
        `Source: ${s.source ?? "unknown"}`,
        s.cemetery ? `Cemetery: ${s.cemetery}` : null,
        s.property_type ? `Property: ${s.property_type}${s.spaces ? ` x${s.spaces}` : ""}` : null,
        s.message ? `Their message: ${String(s.message).slice(0, 500)}` : null,
        s.details ? `Form details: ${String(s.details).slice(0, 500)}` : null,
        s.seller_attachments ? `Seller sent attachments.` : null,
        s.quote_sent_at ? `Quote sent ${s.quote_sent_at}${s.quote_amount ? ` ($${s.quote_amount} per plot)` : ""}` : "No quote sent yet.",
        s.quote_response === "accepted" ? `Quote ACCEPTED ${s.quote_responded_at ?? ""}` : null,
        s.documents_requested_at ? `Document request sent ${s.documents_requested_at}` : null,
        s.documents_completed_at ? `All requested documents received ${s.documents_completed_at}` : null,
        s.la_signed_at ? `Listing agreement signed ${s.la_signed_at}` : null,
        s.custom_tag ? `Admin tag: ${s.custom_tag}` : null,
        thread.length
          ? `Recent emails (newest first):\n${thread.map((m: any) => `- ${m.received_at} from ${m.from_name || m.from_email}: ${String(m.subject || "")} — ${String(m.snippet || "").slice(0, 200)}`).join("\n")}`
          : "No emails matched to this submission.",
      ].filter(Boolean).join("\n");

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-lite",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: facts },
          ],
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) return json({ error: "Rate limit reached, try again shortly.", summaries }, 429);
        if (resp.status === 402) return json({ error: "AI credits exhausted.", summaries }, 402);
        const t = await resp.text();
        console.error("AI error", resp.status, t);
        continue;
      }

      const data = await resp.json();
      const raw = String(data?.choices?.[0]?.message?.content ?? "").trim();
      if (!raw) continue;
      const text = pack(raw);


      summaries[s.id] = text;
      await svc.from("contact_submissions")
        .update({ ai_summary: text, ai_summary_at: new Date().toISOString(), ai_summary_key: key })
        .eq("id", s.id);
    }

    return json({ summaries });
  } catch (err) {
    console.error(err);
    return json({ error: String((err as Error).message ?? err) }, 500);
  }
});
