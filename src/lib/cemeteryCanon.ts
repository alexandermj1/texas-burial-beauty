// Single canonical key for cemetery names, mirroring the database's
// `canonical_cemetery(text)` function (which powers the unique index on
// texas_cemeteries.canonical_name).
//
// Keeping the app-side key identical to the DB one means "Sparkman/Hillcrest",
// "Sparkman-Hillcrest Memorial Park" and "Sparkman Hillcrest Funeral Home &
// Memorial Park" all resolve to the same cemetery — in the submissions list,
// the cemetery profile card and the re-match dialog alike.
export const cemeteryCanon = (raw: string | null | undefined): string => {
  if (!raw) return "";
  let s = String(raw).toLowerCase();
  s = s.replace(/\([^)]*\)/g, " ");                 // parenthetical aliases
  s = s.replace(/\s+g[-\s]?\d+/g, " ");             // garden codes " g-01"
  s = s.replace(/\bm\.?\s*p\.?\b/g, " ");           // "M.P."
  s = s.replace(/memorial\s+park/g, " ");
  s = s.replace(/mortuary\s+and\s+cemetery/g, " ");
  s = s.replace(/(mausoleum|mortuary|cemetery|association|assoc\.?)/g, " ");
  s = s.replace(/\b(funeral\s+home|memorial\s+gardens?|memorial|gardens?)\b/g, " ");
  s = s.replace(/[^a-z0-9 ]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (s) return s;
  // Name was made entirely of generic words ("Memorial Park Cemetery") — fall
  // back to a plain normalisation so it still gets a stable key.
  return String(raw).toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
};

export default cemeteryCanon;
