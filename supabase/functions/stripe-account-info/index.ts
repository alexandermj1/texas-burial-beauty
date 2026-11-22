// Read-only Stripe account diagnostic for staff: which account is connected,
// whether it can take payments, and whether payouts are actually reaching a
// bank account. Returns non-secret account metadata only — never API keys,
// and bank accounts are reduced to name + last four digits.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  environment: z.enum(["sandbox", "live"]).default("live"),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "staff"]);
    if (!roles?.length) return json({ error: "Staff access required" }, 403);

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Invalid request", details: parsed.error.flatten() }, 400);

    const env: StripeEnv = parsed.data.environment;
    const stripe = createStripeClient(env);
    const out: Record<string, unknown> = { environment: env };

    try {
      const acct: any = await stripe.accounts.retrieve();
      out.account = {
        id: acct.id ?? null,
        email: acct.email ?? null,
        country: acct.country ?? null,
        type: acct.type ?? null,
        business_name: acct.business_profile?.name ?? acct.business_name ?? null,
        charges_enabled: acct.charges_enabled ?? null,
        details_submitted: acct.details_submitted ?? null,
        payouts_enabled: acct.payouts_enabled ?? null,
        default_currency: acct.default_currency ?? null,
        payout_schedule: acct.settings?.payouts?.schedule ?? null,
        requirements_currently_due: acct.requirements?.currently_due ?? null,
        requirements_past_due: acct.requirements?.past_due ?? null,
        requirements_eventually_due: acct.requirements?.eventually_due ?? null,
        disabled_reason: acct.requirements?.disabled_reason ?? null,
        bank_accounts: (acct.external_accounts?.data ?? []).map((b: any) => ({
          id: b.id ?? null,
          bank: b.bank_name ?? null,
          last4: b.last4 ?? null,
          country: b.country ?? null,
          currency: b.currency ?? null,
          status: b.status ?? null,
          default_for_currency: b.default_for_currency ?? null,
        })),
      };
    } catch (e) {
      out.account_error = String(e);
    }

    try {
      const bal: any = await stripe.balance.retrieve();
      out.balance_available = (bal.available ?? []).map((a: any) => ({ amount: a.amount / 100, currency: a.currency }));
      out.balance_pending = (bal.pending ?? []).map((a: any) => ({ amount: a.amount / 100, currency: a.currency }));
    } catch (e) {
      out.balance_error = String(e);
    }

    try {
      const payouts: any = await stripe.payouts.list({ limit: 8 });
      out.payouts = (payouts.data ?? []).map((p: any) => ({
        id: p.id ?? null,
        amount: (p.amount ?? 0) / 100,
        currency: p.currency ?? null,
        status: p.status ?? null,
        automatic: p.automatic ?? null,
        method: p.method ?? null,
        destination: p.destination ?? null,
        created: p.created ? new Date(p.created * 1000).toISOString() : null,
        arrival_date: p.arrival_date ? new Date(p.arrival_date * 1000).toISOString() : null,
        failure_code: p.failure_code ?? null,
        failure_message: p.failure_message ?? null,
      }));
    } catch (e) {
      out.payouts_error = String(e);
    }

    return json(out);
  } catch (e) {
    console.error("stripe-account-info error:", e);
    return json({ error: "Could not read Stripe account information." }, 500);
  }
});
