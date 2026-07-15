export type PaymentsEnv = "sandbox" | "live";

/**
 * Always route real payment links to the LIVE Stripe account (Texas Cemetery Brokers)
 * so admins can collect real money regardless of whether they are working from the
 * preview URL or the published site. The Lovable-managed live Stripe key is
 * available in both preview and production edge function environments.
 */
export function getPaymentsEnvironment(): PaymentsEnv {
  return "live";
}
