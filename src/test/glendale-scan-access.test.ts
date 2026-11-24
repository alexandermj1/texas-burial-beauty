import { describe, expect, it } from 'vitest';
import { activeScanLink, allowedScanAction, LINK_LIFETIME_MS, sameUpload, scanUploadPaths } from '../../supabase/functions/glendale-scan/policy';

describe('Glendale upload-only access', () => {
  it('allows QR validation and upload steps without any document read action', () => {
    expect(allowedScanAction('validate')).toBe(true);
    expect(allowedScanAction('prepare')).toBe(true);
    expect(allowedScanAction('complete')).toBe(true);
    for (const action of ['list', 'view', 'download', 'signed_url', 'delete', 'update']) expect(allowedScanAction(action)).toBe(false);
  });
  it('denies missing, expired and revoked QR links', () => {
    const now = Date.parse('2026-11-24T18:20:00Z');
    expect(activeScanLink(null, now)).toBe(false);
    expect(activeScanLink({ expires_at: new Date(now).toISOString(), revoked_at: null }, now)).toBe(false);
    expect(activeScanLink({ expires_at: new Date(now + LINK_LIFETIME_MS).toISOString(), revoked_at: '2026-11-24T18:00:00Z' }, now)).toBe(false);
    expect(activeScanLink({ expires_at: new Date(now + LINK_LIFETIME_MS).toISOString(), revoked_at: null }, now)).toBe(true);
  });
  it('binds retries to the issuing QR link and exact document pages', () => {
    const original = { link_id: 'link1', name: 'Deed', pages: ['staff/doc/page1.jpg'] };
    expect(sameUpload(original, { ...original })).toBe(true);
    expect(sameUpload(original, { ...original, link_id: 'link2' })).toBe(false);
    expect(sameUpload(original, { ...original, pages: ['staff/other/page1.jpg'] })).toBe(false);
    expect(sameUpload(original, { ...original, name: 'Changed' })).toBe(false);
  });
  it('keeps all five photographed pages grouped in order within the new document', () => {
    expect(scanUploadPaths('staff', 'document', ['1', '2', '3', '4', '5'])).toEqual(['staff/document/1.jpg', 'staff/document/2.jpg', 'staff/document/3.jpg', 'staff/document/4.jpg', 'staff/document/5.jpg']);
  });
});