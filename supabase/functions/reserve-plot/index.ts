// Public endpoint that lets a buyer place a 3-day hold on a Texas seller
// submission. Called from the "Hold for 3 days" link in plot-card emails.
// Marks the seller submission with reserved_at / reserved_until and ties it
// back to the buyer's submission so the admin sees the reservation status.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const RESERVE_HOURS = 72;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function htmlPage(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;font-family:Georgia,serif;background:#fbf8f3;color:#1f2937;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;border:1px solid #e7e2d8;border-radius:18px;max-width:520px;padding:36px;text-align:center;box-shadow:0 10px 40px -20px rgba(124,58,46,.25)}
  h1{font-weight:500;font-size:26px;margin:0 0 12px;color:#7c3a2e}
  p{font-size:15px;line-height:1.55;margin:8px 0;color:#4b5563}
  .tag{display:inline-block;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#7c3a2e;margin-bottom:10px}
  a{color:#7c3a2e}
</style></head><body><div class="card"><p class="tag">Texas Cemetery Brokers</p>${body}</div></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const submissionId = url.searchParams.get("s") || "";
  const buyerSubmissionId = url.searchParams.get("b") || "";
  const buyerEmail = (url.searchParams.get("e") || "").trim();
  const buyerName = (url.searchParams.get("n") || "").trim();

  if (!submissionId) {
    return htmlPage("Invalid link", `<h1>Link incomplete</h1><p>This reservation link is missing details. Please reply to the email so we can hold the plot for you.</p>`, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: row, error: rowErr } = await supabase
    .from("contact_submissions")
    .select("id, cemetery, section, sold_at, deleted_at, reserved_until, reserved_by_email")
    .eq("id", submissionId)
    .maybeSingle();

  if (rowErr || !row) {
    return htmlPage("Not found", `<h1>Plot not found</h1><p>This plot may have been removed. Please reply to the original email and we'll help.</p>`, 404);
  }
  if (row.deleted_at || row.sold_at) {
    return htmlPage("No longer available", `<h1>This plot is no longer available</h1><p>It was either sold or withdrawn. Please reply to the email and we'll share alternatives.</p>`, 410);
  }
  const now = Date.now();
  const activeHold = row.reserved_until ? new Date(row.reserved_until).getTime() > now : false;
  if (activeHold && row.reserved_by_email && buyerEmail && row.reserved_by_email.toLowerCase() !== buyerEmail.toLowerCase()) {
    return htmlPage("Currently held", `<h1>Another buyer is holding this plot</h1><p>This plot is on a temporary hold. We'll let you know if it becomes available again — please reply to your email to be added to the waitlist.</p>`, 409);
  }

  const reservedAt = new Date();
  const reservedUntil = new Date(now + RESERVE_HOURS * 3600 * 1000);

  const { error: updErr } = await supabase
    .from("contact_submissions")
    .update({
      reserved_at: reservedAt.toISOString(),
      reserved_until: reservedUntil.toISOString(),
      reserved_by_email: buyerEmail || null,
      reserved_by_name: buyerName || null,
      reserved_by_submission_id: buyerSubmissionId || null,
    })
    .eq("id", submissionId);

  if (updErr) {
    return htmlPage("Reservation failed", `<h1>Couldn't place the hold</h1><p>Please reply to the original email so we can hold it for you manually.</p>`, 500);
  }

  // Log activity (best-effort)
  await supabase.from("customer_activity_log").insert({
    submission_id: buyerSubmissionId || submissionId,
    activity_type: "plot_reserved",
    detail: `Buyer ${buyerEmail || ""} placed a 3-day hold on plot ${row.cemetery || ""}${row.section ? ` (Section ${row.section})` : ""}`,
  } as any).then(() => {}).catch(() => {});

  const cem = row.cemetery || "the plot";
  const until = reservedUntil.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });
  return htmlPage("Plot held", `
    <h1>Plot held for you</h1>
    <p>We've placed a 3-day hold on <strong>${cem}${row.section ? `, Section ${row.section}` : ""}</strong>.</p>
    <p>The hold is good until <strong>${until}</strong>. A member of our team will be in touch shortly to finalise the paperwork and payment.</p>
    <p style="margin-top:20px;font-size:13px;color:#9ca3af;">Texas Cemetery Brokers · <a href="https://www.texascemeterybrokers.com">texascemeterybrokers.com</a></p>
  `);
});
