import { describe, it, expect, vi, afterEach } from 'vitest';
import { shareUrl, openShareSheet } from './shareNode';

afterEach(() => {
  // openShareSheet reads navigator.share; remove any per-test definition.
  delete (navigator as { share?: unknown }).share;
});

function setShare(fn: ((data: ShareData) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, 'share', { configurable: true, writable: true, value: fn });
}

describe('shareUrl', () => {
  it('builds {origin}/d/{token}', () => {
    expect(shareUrl('abc123')).toBe(`${window.location.origin}/d/abc123`);
  });
});

describe('openShareSheet', () => {
  it('uses the native share sheet when available and returns "shared"', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setShare(share);
    const result = await openShareSheet('Title', 'https://x/y');
    expect(result).toBe('shared');
    expect(share).toHaveBeenCalledWith({ title: 'Title', url: 'https://x/y' });
  });

  it('returns "cancelled" when the user aborts the native share', async () => {
    setShare(vi.fn().mockRejectedValue(Object.assign(new Error('user abort'), { name: 'AbortError' })));
    await expect(openShareSheet('T', 'u')).resolves.toBe('cancelled');
  });

  it('rethrows non-abort errors from the native share', async () => {
    setShare(vi.fn().mockRejectedValue(new Error('boom')));
    await expect(openShareSheet('T', 'u')).rejects.toThrow('boom');
  });

  it('falls back to clipboard and returns "copied" when share is unavailable', async () => {
    // no navigator.share defined
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    const result = await openShareSheet('T', 'https://x/y');
    expect(result).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('https://x/y');
  });
});
