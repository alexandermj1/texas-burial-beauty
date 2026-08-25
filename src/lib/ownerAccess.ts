// The single account allowed to issue refunds. Kept in one place so the UI and
// the refund-payment edge function stay in agreement. The edge function repeats
// this check server-side — this list is only for hiding the control.
export const OWNER_EMAILS = ["alexandermaclarenjames@gmail.com"];
