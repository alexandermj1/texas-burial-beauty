/** Turns AI staff-task text into calm, readable prose: strips IDs, URLs, file names and timestamps. */
export function cleanAttentionText(raw: string | null | undefined): string {
  return String(raw ?? "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\b[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi, "")
    .replace(/\b[\w-]*[0-9a-f]{6,}[\w-]*(\.\.\.|…)?[\w-]*\.(jpe?g|png|pdf|heic|webp|docx?)\b/gi, "a file")
    .replace(/\b[\w.-]+\.(jpe?g|png|pdf|heic|webp|docx?)\b/gi, "a file")
    .replace(/\(?\s*(note\s*)?\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?\s*\)?/gi, "")
    .replace(/\b(file|photo|scan)\s+a file\b/gi, "$1")
    .replace(/^\s*staff;\s*/i, "")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** One short headline for the list card: the first clause of the task. */
export function attentionHeadline(task: string, max = 80): string {
  if (/couldn.t finish.*planned steps/i.test(task)) return "Check the AI’s unfinished changes";
  if (/interrupted|stuck.*sending/i.test(task)) return "Check whether the seller received the reply";
  let t = cleanAttentionText(task).replace(/^(guidance needed|quote needed|needs a person[^:]*):\s*/i, (m) => m);
  t = t.split(/(?<=[.;])\s|\s\(1\)|:\s*\(1\)/)[0].replace(/[.;:]$/, "");
  return t.length > max ? t.slice(0, max).replace(/\s+\S*$/, "") + "…" : t;
}
