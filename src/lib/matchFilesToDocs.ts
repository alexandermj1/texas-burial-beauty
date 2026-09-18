/**
 * Match files a seller has *already* sent us against the checklist items we are
 * about to ask them for.
 *
 * Sellers very often send the plot deed with their first message, long before
 * the document request is built. Until now nothing looked at those files, so
 * the request went out asking for a certificate of ownership that was sitting
 * in the file the whole time. This matcher closes that gap: it reads the file
 * name and the AI reading of each file and marks the obvious ones as received.
 *
 * It is deliberately conservative. A match needs a clear, unambiguous signal —
 * we would much rather miss one than tick off an item we do not actually hold.
 */

export interface CandidateFile {
  name: string;
  path: string;
  /** Short AI reading of the document, when one exists. */
  summary?: string | null;
}

export interface MatchableDoc {
  id: string;
  doc_code?: string | null;
  label?: string | null;
  person_name?: string | null;
}

export interface DocFileMatch {
  docId: string;
  file: CandidateFile;
  /** Plain-language reason, stored on the row so a broker can see why. */
  reason: string;
}

const norm = (value: unknown) =>
  String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Document families we are confident enough to tick off automatically. */
type Family = "deed" | "death_certificate" | "marriage_certificate" | "photo_id";

const familyOf = (doc: MatchableDoc): Family | null => {
  const label = norm(doc.label);
  const code = String(doc.doc_code ?? "").toUpperCase();
  if (/certificate of ownership|plot deed|interment right|\bdeed\b/.test(label)) return "deed";
  if (/death certificate/.test(label)) return "death_certificate";
  if (/marriage (certificate|licen[cs]e)/.test(label)) return "marriage_certificate";
  if (/photo id/.test(label) || code === "D2P" || code === "D2") return "photo_id";
  return null;
};

/** Signals that a file *is* a document of that family. */
const FILE_SIGNALS: Record<Family, RegExp> = {
  deed: /certificate of ownership|ownership certificate|plot deed|burial deed|cemetery deed|interment right|warranty deed|\bdeed\b/,
  death_certificate: /death certificate/,
  marriage_certificate: /marriage certificate|marriage licen[cs]e/,
  photo_id: /drivers licen[cs]e|driver licen[cs]e|passport|state id|photo id/,
};

/** Files that look like a deed but are something else entirely. */
const DEED_DECOYS = /purchase agreement|insurance|prepaid funeral|guarantee|special benefits|price list|invoice|statement/;

const surnameOf = (person?: string | null) => {
  const parts = norm(person).split(" ").filter((p) => p.length > 2);
  return parts.length ? parts[parts.length - 1] : "";
};

/**
 * Returns at most one file per outstanding document. Documents that already
 * carry a file, or that are already marked done, must be filtered out by the
 * caller — this function only decides "does this file satisfy this item?".
 */
export function matchFilesToDocs(docs: MatchableDoc[], files: CandidateFile[]): DocFileMatch[] {
  const matches: DocFileMatch[] = [];
  const used = new Set<string>();

  for (const doc of docs) {
    const family = familyOf(doc);
    if (!family) continue;
    const signal = FILE_SIGNALS[family];

    const hit = files.find((file) => {
      if (used.has(file.path)) return false;
      const name = norm(file.name);
      const summary = norm(file.summary);
      const haystack = `${name} ${summary}`;
      if (!signal.test(haystack)) return false;
      // A purchase agreement mentioning the deed is not the deed.
      if (family === "deed" && DEED_DECOYS.test(name) && !signal.test(name)) return false;
      if (family === "deed" && DEED_DECOYS.test(name) && /purchase agreement|insurance/.test(name)) return false;
      // An ID only counts when it clearly belongs to the person we asked about.
      if (family === "photo_id") {
        const surname = surnameOf(doc.person_name);
        if (!surname || !haystack.includes(surname)) return false;
      }
      return true;
    });

    if (!hit) continue;
    used.add(hit.path);
    matches.push({
      docId: doc.id,
      file: hit,
      reason: `Marked received automatically — “${hit.name}” was already on file.`,
    });
  }

  return matches;
}
