// One-off Bayer Guaranteed Sale Offer — preview + send + public contract view.
// Admin-only for preview / send. Public GET for viewing the auto-filled contract.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  renderBayerGuaranteeOffer,
  GUARANTEE_OFFER_DEFAULTS,
  type GuaranteeOfferInput,
} from "../_shared/marketing/guarantee-offer.ts";
import {
  renderContractHtml,
  renderContractPdf,
  bytesToBase64,
} from "../_shared/marketing/guarantee-contract.ts";
import { BRANDS } from "../_shared/marketing/brands.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const GATEWAY = "https://connector-gateway.lovable.dev/resend";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/bayer-guarantee-offer`;

// UTF-8 safe base64 encode/decode for URL payloads.
function b64url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function buildContractUrl(input: GuaranteeOfferInput): string {
  const slim = { ...input };
  delete (slim as any).contractUrl;
  return `${FUNCTION_URL}?action=contract&data=${b64url(JSON.stringify(slim))}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // ---- Public GET: view auto-filled contract ----
    if (req.method === "GET") {
      const url = new URL(req.url);
      const action = url.searchParams.get("action");
      if (action === "contract") {
        const data = url.searchParams.get("data") || "";
        try {
          const parsed: GuaranteeOfferInput = { ...GUARANTEE_OFFER_DEFAULTS, ...JSON.parse(b64urlDecode(data)) };
          return new Response(renderContractHtml(parsed), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
          });
        } catch {
          return new Response("Invalid contract link.", { status: 400, headers: corsHeaders });
        }
      }
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    // ---- Admin POST: preview / send ----
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return j({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return j({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "preview");
    const merged: GuaranteeOfferInput = { ...GUARANTEE_OFFER_DEFAULTS, ...(body.offer || {}) };
    merged.contractUrl = buildContractUrl(merged);
    const rendered = renderBayerGuaranteeOffer(merged);

    if (action === "preview") {
      return j({ ok: true, ...rendered, contractUrl: merged.contractUrl });
    }

    if (action === "send" || action === "send-test") {
      const brand = BRANDS.bayer;
      const recipient = String(body.toEmail || (action === "send-test" ? user.email : "")).trim();
      if (!recipient) return j({ error: "Recipient email required" }, 400);
      const subject = action === "send-test" ? `[TEST] ${rendered.subject}` : rendered.subject;

      // Generate PDF contract attachment
      const pdfBytes = await renderContractPdf(merged);
      const pdfBase64 = bytesToBase64(pdfBytes);

      const resp = await fetch(`${GATEWAY}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: `${merged.agentName} <${brand.fromEmail}>`,
          to: [recipient],
          reply_to: merged.agentEmail || brand.replyTo,
          subject,
          html: rendered.html,
          text: rendered.text,
          attachments: [
            {
              filename: "Bayer-Guarantee-Agreement.pdf",
              content: pdfBase64,
              content_type: "application/pdf",
            },
          ],
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        return j({ error: (data as any)?.message || `Resend ${resp.status}`, details: data }, resp.status);
      }
      return j({ ok: true, id: (data as any)?.id, sentTo: recipient });
    }

    return j({ error: "Unknown action" }, 400);
  } catch (e: any) {
    return j({ error: e?.message || "Unknown error" }, 500);
  }
});

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
