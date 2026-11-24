import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.25.76';
import { activeScanLink, allowedScanAction, LINK_LIFETIME_MS, MAX_SCAN_PAGES, sameUpload, scanUploadPaths } from './policy.ts';

const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
const uuid = z.string().uuid();
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create_link') }).strict(),
  z.object({ action: z.literal('validate'), token: tokenSchema }).strict(),
  z.object({ action: z.literal('prepare'), token: tokenSchema, documentId: uuid, name: z.string().trim().max(200), pageIds: z.array(uuid).min(1).max(MAX_SCAN_PAGES).refine(ids => new Set(ids).size === ids.length) }).strict(),
  z.object({ action: z.literal('complete'), token: tokenSchema, documentId: uuid }).strict(),
]);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
async function hashToken(token: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Not allowed' }, 405);
  try {
    const text = await req.text();
    if (text.length > 16000) return json({ error: 'Invalid upload request' }, 400);
    const input = JSON.parse(text);
    if (!allowedScanAction(input?.action)) return json({ error: 'Not allowed' }, 403);
    const parsed = schema.safeParse(input);
    if (!parsed.success) return json({ error: 'Invalid upload request' }, 400);
    const body = parsed.data;
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return json({ error: 'Upload service is unavailable. Please retry.' }, 503);
    const db = createClient(url, key, { auth: { persistSession: false } });

    if (body.action === 'create_link') {
      const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (!bearer) return json({ error: 'Staff sign-in required to create a QR code.' }, 401);
      const { data: auth, error: authError } = await db.auth.getUser(bearer);
      if (authError || !auth.user) return json({ error: 'Staff sign-in required to create a QR code.' }, 401);
      const { data: roles, error: roleError } = await db.from('user_roles').select('role').eq('user_id', auth.user.id).in('role', ['admin', 'staff']);
      if (roleError) throw roleError;
      if (!roles?.length) return json({ error: 'Staff access required.' }, 403);
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
      const expiresAt = new Date(Date.now() + LINK_LIFETIME_MS).toISOString();
      const { error } = await db.from('glendale_scan_links').insert({ token_hash: await hashToken(token), created_by: auth.user.id, expires_at: expiresAt });
      if (error) throw error;
      return json({ token, expiresAt });
    }

    const { data: link, error: linkError } = await db.from('glendale_scan_links').select('id,created_by,expires_at,revoked_at').eq('token_hash', await hashToken(body.token)).maybeSingle();
    if (linkError) throw linkError;
    if (!link || !activeScanLink(link)) return json({ error: 'This QR link has expired or is invalid. Scan a fresh QR code from the admin page.' }, 403);
    // A link loses authority if its issuing staff account loses staff access.
    const { data: issuerRoles, error: issuerError } = await db.from('user_roles').select('role').eq('user_id', link.created_by).in('role', ['admin', 'staff']);
    if (issuerError) throw issuerError;
    if (!issuerRoles?.length) return json({ error: 'This upload link is no longer active. Ask staff for a fresh QR code.' }, 403);
    if (body.action === 'validate') return json({ valid: true });

    if (body.action === 'prepare') {
      const upload = { id: body.documentId, link_id: link.id, name: body.name || 'Untitled document', pages: scanUploadPaths(link.created_by, body.documentId, body.pageIds) };
      const { data: existing, error: existingError } = await db.from('glendale_scan_uploads').select('link_id,name,pages,completed_at').eq('id', body.documentId).maybeSingle();
      if (existingError) throw existingError;
      if (existing && !sameUpload(existing, upload)) return json({ error: 'This upload has changed. Please submit it as a new document.' }, 409);
      if (!existing) {
        const { count, error: countError } = await db.from('glendale_scan_uploads').select('id', { count: 'exact', head: true }).eq('link_id', link.id);
        if (countError) throw countError;
        if ((count ?? 0) >= 100) return json({ error: 'Please scan a fresh staff QR code to continue uploading.' }, 429);
        const { error } = await db.from('glendale_scan_uploads').insert(upload);
        if (error) throw error;
      }
      if (existing?.completed_at) return json({ saved: true });
      const uploads = await Promise.all(upload.pages.map(async path => {
        const { data, error } = await db.storage.from('glendale-documents').createSignedUploadUrl(path, { upsert: false });
        if (error || !data) throw error || new Error('Upload URL unavailable');
        return { path, token: data.token };
      }));
      return json({ uploads });
    }

    const { data: upload, error: uploadError } = await db.from('glendale_scan_uploads').select('link_id,name,pages,completed_at').eq('id', body.documentId).eq('link_id', link.id).maybeSingle();
    if (uploadError) throw uploadError;
    if (!upload || !Array.isArray(upload.pages) || !upload.pages.length) return json({ error: 'Upload not found for this QR link.' }, 404);
    const pages = upload.pages as string[];
    const prefix = `${link.created_by}/${body.documentId}`;
    const { data: files, error: filesError } = await db.storage.from('glendale-documents').list(prefix, { limit: MAX_SCAN_PAGES + 1 });
    if (filesError) throw filesError;
    const present = new Set((files || []).filter(f => f.id && f.metadata?.mimetype === 'image/jpeg' && Number(f.metadata?.size) > 0 && Number(f.metadata?.size) <= 10 * 1024 * 1024).map(f => `${prefix}/${f.name}`));
    if (!pages.every(path => present.has(path))) return json({ error: 'Some pages have not finished uploading. Please retry without closing this page.' }, 409);
    const { error: insertError } = await db.from('glendale_documents').insert({ id: body.documentId, name: upload.name, pages, created_by: link.created_by });
    if (insertError && insertError.code !== '23505') throw insertError;
    const { data: saved, error: readError } = await db.from('glendale_documents').select('name,pages,created_by,deleted_at').eq('id', body.documentId).single();
    if (readError || !saved || saved.deleted_at || saved.created_by !== link.created_by || saved.name !== upload.name || JSON.stringify(saved.pages) !== JSON.stringify(pages)) throw new Error('Save read-back failed');
    const { error: finishError } = await db.from('glendale_scan_uploads').update({ completed_at: upload.completed_at || new Date().toISOString() }).eq('id', body.documentId).eq('link_id', link.id);
    if (finishError) throw finishError;
    // Uploaders receive only confirmation, never stored documents, names or URLs.
    return json({ saved: true });
  } catch {
    return json({ error: 'Upload could not be confirmed. Keep this page open and try again.' }, 500);
  }
});