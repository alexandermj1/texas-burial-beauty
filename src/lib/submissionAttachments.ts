// Attachment presence is not proof that required physical originals were received.
export type AttachmentSubmission = {
  id: string;
  email?: string | null;
  customer_profile_id?: string | null;
  seller_attachments?: unknown;
};
type Profile = { id: string; primary_email?: string | null; alt_emails?: string[] | null };
export type AttachmentDocument = {
  submission_id: string;
  file_url?: string | null;
  file_urls?: string[] | null;
};
const emailKey = (email?: string | null) => (email ?? "").trim().toLowerCase();
const nonempty = (value: unknown) => typeof value === "string" && value.trim().length > 0;

export function documentHasAttachment(doc: AttachmentDocument): boolean {
  return nonempty(doc.file_url) || (doc.file_urls ?? []).some(nonempty);
}

export function buildAttachmentIndex(
  submissions: AttachmentSubmission[],
  profiles: Profile[],
  files: { customer_profile_id: string }[],
  documents: AttachmentDocument[],
): { ids: Set<string>; emails: Set<string> } {
  const profileIds = new Set(files.map(file => file.customer_profile_id));
  const emails = new Set<string>();
  for (const profile of profiles) {
    if (!profileIds.has(profile.id)) continue;
    for (const email of [profile.primary_email, ...(profile.alt_emails ?? [])]) {
      const key = emailKey(email);
      if (key) emails.add(key);
    }
  }
  const ids = new Set(documents.filter(documentHasAttachment).map(doc => doc.submission_id));
  for (const submission of submissions) {
    const uploads = Array.isArray(submission.seller_attachments) && submission.seller_attachments.some(file =>
      file && typeof file === "object" && nonempty(file.path));
    if (uploads || (submission.customer_profile_id && profileIds.has(submission.customer_profile_id))) ids.add(submission.id);
    if (ids.has(submission.id) && emailKey(submission.email)) emails.add(emailKey(submission.email));
  }
  for (const submission of submissions) {
    if (emails.has(emailKey(submission.email))) ids.add(submission.id);
  }
  return { ids, emails };
}

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