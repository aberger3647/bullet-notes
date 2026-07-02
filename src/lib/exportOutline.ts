import type { BulletNode } from '../state/types';

function walkLines(
  nodes: BulletNode[],
  depth: number,
  formatLine: (node: BulletNode, depth: number) => string,
  out: string[],
) {
  for (const n of nodes) {
    out.push(formatLine(n, depth));
    walkLines(n.children, depth + 1, formatLine, out);
  }
}

/** GitHub-flavored markdown task list, nested with 2-space indents per level. */
export function exportToMarkdown(nodes: BulletNode[]): string {
  const out: string[] = [];
  walkLines(
    nodes,
    0,
    (n, depth) => `${'  '.repeat(depth)}- [${n.completed ? 'x' : ' '}] ${n.text.replace(/\n/g, ' ')}`,
    out,
  );
  return out.join('\n');
}

/** Plain tab-indented outline, one line per bullet. */
export function exportToPlainText(nodes: BulletNode[]): string {
  const out: string[] = [];
  walkLines(nodes, 0, (n, depth) => '\t'.repeat(depth) + n.text.replace(/\n/g, ' '), out);
  return out.join('\n');
}

/** Full-fidelity JSON dump of the tree (structure, completion, share tokens). */
export function exportToJSON(nodes: BulletNode[]): string {
  return JSON.stringify(nodes, null, 2);
}
