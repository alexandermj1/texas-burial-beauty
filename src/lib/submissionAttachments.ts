// Attachment presence is not proof that required physical originals were received.
export { buildAttachmentIndex, documentHasAttachment } from "../../supabase/functions/_shared/submissionAttachments";
export type { AttachmentSubmission, AttachmentDocument } from "../../supabase/functions/_shared/submissionAttachments";

/** Read every metadata page, never publishing a partial result after an error. */
export async function readAttachmentPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await fetchPage(from, from + size - 1);
    if (error) throw error;
    if (!data) throw new Error("Attachment lookup returned no data");
    rows.push(...data);
    if (data.length < size) return rows;
  }
}