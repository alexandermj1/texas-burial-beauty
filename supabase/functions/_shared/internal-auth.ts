// Shared helper: recognise a server-to-server call made with the project's
// service-role key. Edge functions that are normally admin-only use this so
// the automated pipeline (autopilot) can drive the exact same code paths the
// office uses by hand — no duplicated document or email logic.

export const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export function bearer(req: Request): string {
  return (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
}

/** True when the caller presented the service-role key (internal automation). */
export function isInternalCall(req: Request): boolean {
  const token = bearer(req);
  return !!token && !!SERVICE_ROLE_KEY && token === SERVICE_ROLE_KEY;
}
