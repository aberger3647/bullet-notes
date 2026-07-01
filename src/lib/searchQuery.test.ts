import { describe, it, expect } from 'vitest';
import {
  parseSegment,
  parseSearchQuery,
  matchesSegment,
  matchesHierarchy,
  nodeMatchesSearchQuery,
} from './searchQuery';

const n = (text: string, completed = false) => ({ text, completed });

describe('parseSegment', () => {
  it('splits plain terms', () => {
    const seg = parseSegment('buy milk');
    expect(seg.includeAlternatives).toEqual([{ terms: ['buy', 'milk'], properties: [] }]);
    expect(seg.excludeTerms).toEqual([]);
  });

  it('captures leading and mid-string excludes', () => {
    const seg = parseSegment('buy -milk -eggs');
    expect(seg.excludeTerms).toEqual(['milk', 'eggs']);
    expect(seg.includeAlternatives).toEqual([{ terms: ['buy'], properties: [] }]);
  });

  it('does NOT treat an intra-word hyphen as an exclude', () => {
    const seg = parseSegment('twenty-one');
    expect(seg.excludeTerms).toEqual([]);
    expect(seg.includeAlternatives).toEqual([{ terms: ['twenty-one'], properties: [] }]);
  });

  it('parses property filters is:complete / is:open / is:incomplete', () => {
    expect(parseSegment('is:complete').includeAlternatives).toEqual([
      { terms: [], properties: ['complete'] },
    ]);
    expect(parseSegment('is:open').includeAlternatives).toEqual([
      { terms: [], properties: ['open'] },
    ]);
    expect(parseSegment('is:incomplete').includeAlternatives).toEqual([
      { terms: [], properties: ['open'] },
    ]);
  });

  it('splits OR alternatives (case-insensitive)', () => {
    const seg = parseSegment('milk or eggs');
    expect(seg.includeAlternatives).toEqual([
      { terms: ['milk'], properties: [] },
      { terms: ['eggs'], properties: [] },
    ]);
  });

  it('returns empty criteria for blank input', () => {
    expect(parseSegment('   ')).toEqual({ includeAlternatives: [], excludeTerms: [] });
  });
});

describe('parseSearchQuery', () => {
  it('returns no alternatives for an empty query', () => {
    expect(parseSearchQuery('   ')).toEqual({ alternatives: [] });
  });

  it('splits hierarchy segments on spaced >', () => {
    const parsed = parseSearchQuery('projects > write');
    expect(parsed.alternatives).toHaveLength(1);
    expect(parsed.alternatives[0]).toHaveLength(2);
  });

  it('treats > without surrounding spaces as a literal term (single segment)', () => {
    const parsed = parseSearchQuery('a>b');
    expect(parsed.alternatives).toHaveLength(1);
    expect(parsed.alternatives[0]).toHaveLength(1);
    expect(parsed.alternatives[0]![0]!.includeAlternatives).toEqual([
      { terms: ['a>b'], properties: [] },
    ]);
  });

  it('splits top-level OR into separate alternatives', () => {
    const parsed = parseSearchQuery('milk OR eggs');
    expect(parsed.alternatives).toHaveLength(2);
  });
});

describe('matchesSegment', () => {
  it('matches when all terms are present (AND within an alternative)', () => {
    const seg = parseSegment('buy milk');
    expect(matchesSegment(n('buy some milk'), seg)).toBe(true);
    expect(matchesSegment(n('buy some eggs'), seg)).toBe(false);
  });

  it('excludes nodes containing an excluded term', () => {
    const seg = parseSegment('buy -milk');
    expect(matchesSegment(n('buy eggs'), seg)).toBe(true);
    expect(matchesSegment(n('buy milk'), seg)).toBe(false);
  });

  it('an exclude-only segment matches when the excluded term is absent', () => {
    const seg = parseSegment('-milk');
    expect(matchesSegment(n('buy eggs'), seg)).toBe(true);
    expect(matchesSegment(n('buy milk'), seg)).toBe(false);
  });

  it('respects property filters', () => {
    expect(matchesSegment(n('task', true), parseSegment('is:complete'))).toBe(true);
    expect(matchesSegment(n('task', false), parseSegment('is:complete'))).toBe(false);
    expect(matchesSegment(n('task', false), parseSegment('is:open'))).toBe(true);
  });

  it('OR alternatives match if any alternative matches', () => {
    const seg = parseSegment('milk OR eggs');
    expect(matchesSegment(n('buy eggs'), seg)).toBe(true);
  });
});

describe('matchesHierarchy', () => {
  const segs = parseSearchQuery('projects > write').alternatives[0]!;

  it('matches when segments appear in order along the path (subsequence)', () => {
    const path = [n('my projects'), n('misc'), n('write the report')];
    expect(matchesHierarchy(path, segs)).toBe(true);
  });

  it('fails when the path is shorter than the number of segments', () => {
    expect(matchesHierarchy([n('projects and write')], segs)).toBe(false);
  });

  it('fails when segments are out of order', () => {
    const path = [n('write'), n('projects')];
    expect(matchesHierarchy(path, segs)).toBe(false);
  });
});

describe('nodeMatchesSearchQuery', () => {
  it('combines ancestors + node and matches a hierarchy query', () => {
    const parsed = parseSearchQuery('projects > write');
    const ancestors = [n('projects')];
    expect(nodeMatchesSearchQuery(n('write it'), ancestors, parsed)).toBe(true);
  });

  it('returns false for an empty parsed query', () => {
    expect(nodeMatchesSearchQuery(n('anything'), [], { alternatives: [] })).toBe(false);
  });
});
