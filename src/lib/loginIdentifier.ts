// Provisioned staff aliases only; never query private profiles before login.
export function loginIdentifier(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized === "susie" ? "susie@staff.texascemeterybrokers.invalid" : normalized;
}