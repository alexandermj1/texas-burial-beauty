export type PaymentsEnv = "sandbox" | "live";

/**
 * Derive the Lovable Stripe environment from the publishable client token.
 * - pk_live_* → live (real money)
 * - pk_test_* or missing → sandbox (test mode)
 */
export function getPaymentsEnvironment(): PaymentsEnv {
  const token = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
  if (token?.startsWith("pk_live_")) return "live";
  return "sandbox";
}
