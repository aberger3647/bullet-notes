export type PropertyFilter = 'complete' | 'open';

export type ParsedSegment = {
  includeAlternatives: Array<{ terms: string[]; properties: PropertyFilter[] }>;
  excludeTerms: string[];
};

export type ParsedSearchQuery = {
  /** Each alternative is a full hierarchical path of segment filters. */
  alternatives: ParsedSegment[][];
};

type MatchableNode = {
  text: string;
  completed: boolean;
};

export function parseSegment(segment: string): ParsedSegment {
  const trimmed = segment.trim();
  if (!trimmed) {
    return { includeAlternatives: [], excludeTerms: [] };
  }

  const excludeTerms: string[] = [];
  const withoutExcludes = trimmed
    .replace(/(?:^|\s)-(\S+)/g, (_, term: string) => {
      excludeTerms.push(term);
      return ' ';
    })
    .trim();

  const includeAlternatives: ParsedSegment['includeAlternatives'] = [];
  if (withoutExcludes) {
    for (const part of withoutExcludes.split(/\s+OR\s+/i)) {
      const tokens = part.trim().split(/\s+/).filter(Boolean);
      const terms: string[] = [];
      const properties: PropertyFilter[] = [];
      for (const token of tokens) {
        const lower = token.toLowerCase();
        if (lower === 'is:complete') properties.push('complete');
        else if (lower === 'is:open' || lower === 'is:incomplete') properties.push('open');
        else terms.push(token);
      }
      if (terms.length > 0 || properties.length > 0) {
        includeAlternatives.push({ terms, properties });
      }
    }
  }

  return { includeAlternatives, excludeTerms };
}

export function parseSearchQuery(query: string): ParsedSearchQuery {
  const trimmed = query.trim();
  if (!trimmed) return { alternatives: [] };

  const alternatives: ParsedSegment[][] = [];
  for (const orPart of trimmed.split(/\s+OR\s+/i)) {
    const part = orPart.trim();
    if (!part) continue;
    const segments = part.split(/\s+>\s+/).map(parseSegment).filter((s) => segmentHasCriteria(s));
    if (segments.length > 0) alternatives.push(segments);
  }

  return { alternatives };
}

function segmentHasCriteria(segment: ParsedSegment): boolean {
  return segment.excludeTerms.length > 0 || segment.includeAlternatives.length > 0;
}

function matchesProperty(node: MatchableNode, property: PropertyFilter): boolean {
  if (property === 'complete') return node.completed;
  return !node.completed;
}

export function matchesSegment(node: MatchableNode, segment: ParsedSegment): boolean {
  const lower = node.text.toLowerCase();

  for (const term of segment.excludeTerms) {
    if (lower.includes(term.toLowerCase())) return false;
  }

  if (segment.includeAlternatives.length === 0) {
    return segment.excludeTerms.length > 0;
  }

  return segment.includeAlternatives.some((alternative) => {
    for (const property of alternative.properties) {
      if (!matchesProperty(node, property)) return false;
    }
    return alternative.terms.every((term) => lower.includes(term.toLowerCase()));
  });
}

/** Segments must match in order along the root-to-node path (subsequence). */
export function matchesHierarchy(path: MatchableNode[], segments: ParsedSegment[]): boolean {
  if (segments.length === 0 || path.length < segments.length) return false;

  let segIdx = 0;
  for (let i = 0; i < path.length && segIdx < segments.length; i++) {
    if (matchesSegment(path[i]!, segments[segIdx]!)) segIdx++;
  }
  return segIdx === segments.length;
}

export function nodeMatchesSearchQuery(
  node: MatchableNode,
  ancestors: MatchableNode[],
  parsed: ParsedSearchQuery,
): boolean {
  if (parsed.alternatives.length === 0) return false;

  const path = [...ancestors, node];
  return parsed.alternatives.some((segments) => matchesHierarchy(path, segments));
}
