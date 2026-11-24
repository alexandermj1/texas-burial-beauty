export const GLENDALE_BUCKET = 'glendale-documents';
export const MAX_SCAN_PAGES = 50;
export function scanName(name: string) {
  return name.trim().slice(0, 200) || 'Untitled document';
}
export function scanPagePath(userId: string, documentId: string, pageId: string) {
  return `${userId}/${documentId}/${pageId}.jpg`;
}
export function validScanPages(pages: unknown): pages is string[] {
  return Array.isArray(pages) && pages.length > 0 && pages.length <= MAX_SCAN_PAGES && pages.every(p => typeof p === 'string' && p.endsWith('.jpg'));
}
