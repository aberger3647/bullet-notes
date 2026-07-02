/** Deterministic, distinct-enough color for a presence badge, derived from a client id. */
export function colorForClientId(clientId: string): string {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = (hash * 31 + clientId.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 45%)`;
}
