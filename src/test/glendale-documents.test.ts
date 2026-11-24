import { describe, expect, it } from 'vitest';
import { scanName, scanPagePath, validScanPages } from '../lib/glendaleDocuments';
describe('Glendale document groups', () => {
 it('accepts one photographed page as one document', () => { expect(validScanPages(['staff/document/page1.jpg'])).toBe(true); });
 it('accepts five pages in the same document and preserves their order', () => {
  const pages = [1,2,3,4,5].map(n => scanPagePath('cici', 'doc1', `page${n}`));
  expect(validScanPages(pages)).toBe(true);
  expect(pages).toEqual(['cici/doc1/page1.jpg','cici/doc1/page2.jpg','cici/doc1/page3.jpg','cici/doc1/page4.jpg','cici/doc1/page5.jpg']);
 });
 it('allows the staff member to name a document or leave its name blank', () => {
  expect(scanName('  Gerri — deed  ')).toBe('Gerri — deed'); expect(scanName('')).toBe('Untitled document');
 });
 it('rejects an empty submission', () => { expect(validScanPages([])).toBe(false); });
});
