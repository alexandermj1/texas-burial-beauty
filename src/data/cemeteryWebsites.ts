/**
 * Curated, human-verified official websites for the cemeteries we broker.
 * Keyed by the exact `name` used in src/data/cemeteries.ts.
 * Only add a URL here once it has been confirmed against the cemetery's
 * name AND street address — never a directory or aggregator link.
 */
export const CEMETERY_WEBSITES: Record<string, string> = {};

const key = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const INDEX: Record<string, string> = Object.fromEntries(
  Object.entries(CEMETERY_WEBSITES).map(([k, v]) => [key(k), v])
);

export const cemeteryWebsite = (name: string): string | null => INDEX[key(name)] ?? null;
