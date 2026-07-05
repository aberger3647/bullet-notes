export function shareUrl(token: string): string {
  return `${window.location.origin}/d/${token}`;
}

export type ShareResult = 'shared' | 'copied' | 'copy-failed' | 'cancelled';

export async function openShareSheet(title: string, url: string): Promise<ShareResult> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
      throw err;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'copy-failed';
  }
}
