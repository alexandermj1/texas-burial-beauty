export const MAX_SCAN_PAGES = 50;
export const LINK_LIFETIME_MS = 24 * 60 * 60 * 1000;
export function allowedScanAction(action: unknown) {
  return typeof action === 'string' && ['create_link', 'validate', 'prepare', 'complete'].includes(action);
}
export function activeScanLink(link: { expires_at: string; revoked_at: string | null } | null, now = Date.now()) {
  return !!link && !link.revoked_at && Date.parse(link.expires_at) > now;
}
export function scanUploadPaths(owner: string, document: string, pages: string[]) {
  return pages.map(page => `${owner}/${document}/${page}.jpg`);
}
export function sameUpload(a: { link_id: string; name: string; pages: unknown }, b: { link_id: string; name: string; pages: unknown }) {
  return a.link_id === b.link_id && a.name === b.name && JSON.stringify(a.pages) === JSON.stringify(b.pages);
}