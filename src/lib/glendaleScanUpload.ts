import { createClient } from '@supabase/supabase-js';
import { GLENDALE_BUCKET } from './glendaleDocuments';

// Deliberately separate from staff auth: the QR page uses only its upload capability.
const uploadClient = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
export async function scanRequest(body: Record<string, unknown>) {
  const { data, error } = await uploadClient.functions.invoke('glendale-scan', { body });
  if (error) {
    let message = 'Upload is unavailable. Keep this page open and try again.';
    if (error.context instanceof Response) {
      try { const result = await error.context.json(); if (typeof result.error === 'string') message = result.error; } catch { /* Keep safe fallback. */ }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
export async function uploadScanPages(token: string, documentId: string, name: string, pages: { id: string; blob: Blob }[], uploaded: Set<string>) {
  const prepared = await scanRequest({ action: 'prepare', token, documentId, name, pageIds: pages.map(p => p.id) });
  if (prepared?.saved) return;
  if (!Array.isArray(prepared?.uploads) || prepared.uploads.length !== pages.length) throw new Error('Could not prepare the document upload. Please retry.');
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const target = prepared.uploads[i];
    if (uploaded.has(target.path)) continue;
    const { error } = await uploadClient.storage.from(GLENDALE_BUCKET).uploadToSignedUrl(target.path, target.token, page.blob, { contentType: 'image/jpeg', upsert: false });
    if (error && !/already exists|duplicate/i.test(error.message)) throw new Error('A page did not finish uploading. Keep this page open and try again.');
    uploaded.add(target.path);
  }
  const completed = await scanRequest({ action: 'complete', token, documentId });
  if (completed?.saved !== true) throw new Error('The document could not be confirmed. Please retry.');
}