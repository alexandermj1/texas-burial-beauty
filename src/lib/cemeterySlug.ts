import { bayCemeteries, type CemeteryInfo } from "@/data/cemeteries";

export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, "-") // en/em dashes
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const findCemeteryBySlug = (slug: string): CemeteryInfo | undefined =>
  bayCemeteries.find((c) => slugify(c.name) === slug);

export const cemeteryPath = (name: string): string => `/cemeteries/${slugify(name)}`;
