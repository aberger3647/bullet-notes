import type { BulletNode } from '../state/types';

type ParsedLine = { depth: number; text: string; completed: boolean };

function isBulletNodeShape(value: unknown): value is BulletNode {
  if (!value || typeof value !== 'object') return false;
  const n = value as Record<string, unknown>;
  return (
    typeof n.text === 'string' &&
    typeof n.completed === 'boolean' &&
    Array.isArray(n.children) &&
    n.children.every(isBulletNodeShape)
  );
}

function regenerateIds(node: BulletNode, genId: () => string): BulletNode {
  return {
    id: genId(),
    text: node.text,
    completed: node.completed,
    children: node.children.map((c) => regenerateIds(c, genId)),
  };
}

function tryParseJSON(content: string): BulletNode[] | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list.every(isBulletNodeShape) ? (list as BulletNode[]) : null;
  } catch {
    return null;
  }
}

function parseLine(rawLine: string): ParsedLine | null {
  if (!rawLine.trim()) return null;
  const indentMatch = rawLine.match(/^[\t ]*/)![0];
  const depth = Math.floor(indentMatch.replace(/\t/g, '  ').length / 2);
  const rest = rawLine.slice(indentMatch.length);
  const match = rest.match(/^(?:[-*+]\s+)?(?:\[([ xX])\]\s+)?(.*)$/);
  const completed = match?.[1]?.toLowerCase() === 'x';
  const text = (match?.[2] ?? rest).trim();
  return { depth, text, completed };
}

function buildTree(lines: ParsedLine[], genId: () => string): BulletNode[] {
  const roots: BulletNode[] = [];
  const stack: Array<{ node: BulletNode; depth: number }> = [];
  for (const line of lines) {
    const newNode: BulletNode = { id: genId(), text: line.text, completed: line.completed, children: [] };
    while (stack.length > 0 && stack[stack.length - 1]!.depth >= line.depth) stack.pop();
    if (stack.length === 0) roots.push(newNode);
    else stack[stack.length - 1]!.node.children.push(newNode);
    stack.push({ node: newNode, depth: line.depth });
  }
  return roots;
}

/**
 * Parse pasted/uploaded outline content into fresh BulletNode roots.
 * Accepts our own JSON export, a tab-indented plain-text outline, or a
 * (GFM task-list) markdown outline with 2-space indents.
 */
export function parseImportedOutline(content: string, genId: () => string): BulletNode[] {
  const json = tryParseJSON(content);
  if (json) return json.map((n) => regenerateIds(n, genId));

  const lines = content.split(/\r?\n/).map(parseLine).filter((l): l is ParsedLine => l !== null);
  return buildTree(lines, genId);
}
