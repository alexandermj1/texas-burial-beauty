import { afterEach, describe, expect, it, vi } from 'vitest';
import { glendaleScanUrl } from '../lib/glendaleDocuments';

afterEach(() => vi.unstubAllGlobals());

describe('Glendale QR phone destination', () => {
  it.each([
    'https://id-preview--a66048b0-ac11-4461-b2c5-4a2d314accf3.lovable.app',
    'https://a66048b0-ac11-4461-b2c5-4a2d314accf3.lovableproject.com',
    'http://localhost:8080',
    'https://www.texascemeterybrokers.com',
    'https://texas-burial-beauty.lovable.app',
  ])('opens the live upload-only page when the QR is generated on %s', (origin) => {
    vi.stubGlobal('window', { location: new URL(origin) });
    const token = 'a1'.repeat(32);
    const url = new URL(glendaleScanUrl(token));
    expect(url.origin).toBe('https://texascemeterybrokers.com');
    expect(url.pathname).toBe('/admin/glendale-scan');
    expect(url.hash).toBe(`#${token}`);
    expect(url.search).toBe('');
  });
});