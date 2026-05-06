// Strip job titles / role descriptors from a stored full_name.
// Examples:
//   "Cathy (CC) — Quote approver"     -> "Cathy"
//   "EM — Forest Lawn / template owner" -> "EM"
//   "Senior Broker — L.A. countersign"  -> "Senior Broker"
//   "Alexander Maclaren James"          -> "Alexander Maclaren James"
export function cleanDisplayName(raw?: string | null): string {
  if (!raw) return "";
  let s = String(raw);
  // Cut at em-dash, en-dash, hyphen-with-spaces, pipe, slash, colon
  s = s.split(/\s+[—–\-|/:]\s+/)[0];
  // Remove trailing parenthetical (initials/codes)
  s = s.replace(/\s*\([^)]*\)\s*$/g, "");
  return s.trim();
}
