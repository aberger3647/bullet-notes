export function shareUrl(token: string): string {
  return `${window.location.origin}/d/${token}`;
}

export async function openShareSheet(title: string, url: string): Promise<'shared' | 'copied'> {
  if (typeof navigator.share === 'function') {
    await navigator.share({ title, url });
    return 'shared';
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}
