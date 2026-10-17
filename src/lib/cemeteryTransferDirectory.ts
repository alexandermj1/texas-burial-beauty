import records from "@/data/cemeteryTransferRecords.json";
import { getCuratedWebsite } from "@/data/cemeteryWebsites";
export const transferRecords = records.map((record) => ({ ...record, website: getCuratedWebsite(record.name) }));
export const transferRegions = [...new Set(records.map((record) => record.region))].sort();
export function filterTransferRecords(query: string, region: string) {
  const term = query.toLocaleLowerCase().trim();
  return transferRecords.filter((record) => (region === "all" || record.region === region) && [record.name, record.city, record.county, record.address, record.region].some((value) => value?.toLocaleLowerCase().includes(term)));
}
export function recordedTransferFee(value: number | null) {
  return value === null ? "Not recorded" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}
