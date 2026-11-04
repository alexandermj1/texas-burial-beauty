// Proper-case helpers for echoing user-supplied names back in emails.
// Customers often type "san antonio" / "JOHN" / "mount olivet" — we should
// reply with "San Antonio" / "John" / "Mount Olivet".

// Small connector words that stay lowercase when they appear mid-phrase.
const LOWER_WORDS = new Set([
  "of", "the", "and", "at", "in", "on", "for", "to", "by",
  "de", "del", "la", "las", "los", "el", "y", "da", "do", "dos", "das",
  "van", "von", "der", "den", "di",
]);

// Tokens that should be fully uppercase when present.
const UPPER_TOKENS = new Set([
  "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
  "usa", "us", "tx", "ca", "ny", "fl", "nv", "az", "nm", "ok", "la", "ms", "al", "ga", "nc", "sc",
  "llc", "inc", "co",
]);

const capitalizeChunk = (chunk: string): string => {
  if (!chunk) return chunk;
  const lower = chunk.toLowerCase();
  if (UPPER_TOKENS.has(lower)) return lower.toUpperCase();
  // Mc / Mac prefixes: McDonald, MacArthur
  if (/^mc[a-z]/.test(lower)) {
    return "Mc" + lower.charAt(2).toUpperCase() + lower.slice(3);
  }
  if (/^mac[a-z]{2,}/.test(lower)) {
    return "Mac" + lower.charAt(3).toUpperCase() + lower.slice(4);
  }
  // O'Brien
  if (/^o'[a-z]/.test(lower)) {
    return "O'" + lower.charAt(2).toUpperCase() + lower.slice(3);
  }
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

// Re-case a single word, preserving hyphens and apostrophes.
const recaseWord = (word: string): string => {
  return word
    .split("-")
    .map((seg) =>
      seg
        .split("'")
        .map((part, idx, arr) =>
          // Don't re-cap inner apostrophe segments that look like contractions ('s, 't, 'll)
          idx > 0 && /^(s|t|d|ll|re|ve|m)$/i.test(part) && arr.length === 2
            ? part.toLowerCase()
            : capitalizeChunk(part),
        )
        .join("'"),
    )
    .join("-");
};

/**
 * Title-case a place / cemetery / person name supplied by a customer.
 * Lowercases small connector words when they appear mid-phrase, preserves
 * hyphenated and apostrophe-containing surnames, and uppercases known acronyms.
 */
export const properCase = (raw: string | null | undefined): string => {
  if (!raw) return "";
  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  const words = trimmed.split(" ");
  return words
    .map((word, idx) => {
      const lower = word.toLowerCase();
      if (idx !== 0 && idx !== words.length - 1 && LOWER_WORDS.has(lower)) {
        return lower;
      }
      return recaseWord(word);
    })
    .join(" ");
};

/** Proper-case only the first name component (drops the rest). */
export const properFirstName = (raw: string | null | undefined): string => {
  const cased = properCase(raw || "");
  if (!cased) return "";
  return cased.split(/\s+/)[0];
};
