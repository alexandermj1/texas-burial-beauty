/** Shared metro groupings used by every public coverage map. */
export type MetroOption = { label: string; regions: string[] };

export const ALL_TEXAS_REGIONS = [
  "Dallas–Fort Worth",
  "Greater Houston",
  "Austin",
  "San Antonio",
  "Central Texas",
  "East Texas",
  "El Paso & West Texas",
  "South Texas",
  "West & North Texas",
];

export const METRO_OPTIONS: MetroOption[] = [
  { label: "Dallas–Fort Worth", regions: ["Dallas–Fort Worth"] },
  { label: "Houston", regions: ["Greater Houston"] },
  { label: "Austin", regions: ["Austin", "Central Texas"] },
  { label: "San Antonio", regions: ["San Antonio", "South Texas"] },
  { label: "East Texas", regions: ["East Texas"] },
  { label: "West Texas", regions: ["El Paso & West Texas", "West & North Texas"] },
  { label: "All Texas", regions: ALL_TEXAS_REGIONS },
];

/** Pick the tab that best matches the regions a page is scoped to. */
export const metroIndexForRegions = (regions: string[]) => {
  if (regions.length >= ALL_TEXAS_REGIONS.length) return METRO_OPTIONS.length - 1;
  const i = METRO_OPTIONS.findIndex(
    (m) => m.regions.length === regions.length && m.regions.every((r) => regions.includes(r))
  );
  if (i >= 0) return i;
  const j = METRO_OPTIONS.findIndex((m) => m.regions.some((r) => regions.includes(r)));
  return j >= 0 ? j : 0;
};
