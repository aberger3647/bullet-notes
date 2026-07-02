import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadFile } from './downloadFile';

describe('downloadFile', () => {
  let createObjectURL: ReturnType<typeof vi.spyOn>;
  let revokeObjectURL: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a blob URL, clicks a download anchor with the right filename, then revokes it', () => {
    downloadFile('notes.md', 'text/markdown', '- [ ] hello');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blobArg = createObjectURL.mock.calls[0]![0] as Blob;
    expect(blobArg.type).toBe('text/markdown');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
