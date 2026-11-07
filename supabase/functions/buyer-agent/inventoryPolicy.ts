export type PropertyCategory = "burial" | "niche" | "crypt" | "any";

export function category(value: unknown): PropertyCategory {
  const text = String(value ?? "").toLowerCase();
  if (/niche|urn|columbar|cremain|cremat/.test(text)) return "niche";
  // Lawn crypts are in-ground burial property, not mausoleum entombment.
  if (/lawn\s+crypt|double[\s-]*depth|companion\s+(plot|space|burial)/.test(text)) return "burial";
  if (/crypt|mausoleum|entomb/.test(text)) return "crypt";
  return text.trim() ? "burial" : "any";
}

export function openToOtherCemeteries(buyer: { message?: unknown; details?: unknown }): boolean {
  const text = `${buyer.message ?? ""}\n${buyer.details ?? ""}`;
  if (/\b(only|exclusively|must be|not interested in other)\b/i.test(text)) return false;
  return /\b(open to|consider|interested in|happy with)\s+(?:any\s+|some\s+)?(?:other|another|alternative|nearby|different)\s+(?:cemeter|location|option)|\b(?:other|alternative|nearby)\s+cemeteries\s+(?:are|would be)\s+(?:fine|okay|ok|welcome)/i.test(text);
}

type Option = { listing_id: string; nearby_alternative?: boolean; also_nearby?: boolean };
export function missingOwnOptions(options: Option[], chosen: string[], omitted: { listing_id: string; reason: string }[]): string[] {
  const accounted = new Set([...chosen, ...omitted.filter((x) => x.reason.trim().length > 0).map((x) => x.listing_id)]);
  return options.filter((x) => !x.nearby_alternative && !x.also_nearby && !accounted.has(x.listing_id)).map((x) => x.listing_id);
}