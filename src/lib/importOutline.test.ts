import { describe, it, expect } from 'vitest';
import { parseImportedOutline, looksLikeOutlineText } from './importOutline';

describe('parseImportedOutline — JSON', () => {
  it('parses a JSON array of nodes with fresh ids', () => {
    const json = JSON.stringify([
      { id: 'old-a', text: 'root', completed: false, children: [{ id: 'old-b', text: 'child', completed: true, children: [] }] },
    ]);
    let n = 0;
    const roots = parseImportedOutline(json, () => `new-${n++}`);
    expect(roots).toHaveLength(1);
    expect(roots[0]!.id).toBe('new-0');
    expect(roots[0]!.text).toBe('root');
    expect(roots[0]!.children[0]!.id).toBe('new-1');
    expect(roots[0]!.children[0]!.text).toBe('child');
    expect(roots[0]!.children[0]!.completed).toBe(true);
  });

  it('wraps a single JSON node object into an array', () => {
    const json = JSON.stringify({ id: 'x', text: 'solo', completed: false, children: [] });
    const roots = parseImportedOutline(json, () => 'fresh');
    expect(roots).toHaveLength(1);
    expect(roots[0]!.text).toBe('solo');
  });

  it('falls back to text parsing for malformed JSON-looking input', () => {
    const roots = parseImportedOutline('[not valid json', () => 'x');
    expect(roots).toHaveLength(1);
    expect(roots[0]!.text).toBe('[not valid json');
  });
});

describe('parseImportedOutline — plain/markdown text', () => {
  it('parses a tab-indented plain-text outline', () => {
    let n = 0;
    const roots = parseImportedOutline('root\n\tchild\n\t\tgrandchild\nsecond root', () => `id-${n++}`);
    expect(roots.map((r) => r.text)).toEqual(['root', 'second root']);
    expect(roots[0]!.children[0]!.text).toBe('child');
    expect(roots[0]!.children[0]!.children[0]!.text).toBe('grandchild');
  });

  it('parses a GFM task-list markdown outline, honoring checkboxes and 2-space indents', () => {
    const md = '- [ ] root\n  - [x] done child\n  - [ ] open child';
    const roots = parseImportedOutline(md, () => 'id');
    expect(roots).toHaveLength(1);
    expect(roots[0]!.text).toBe('root');
    expect(roots[0]!.completed).toBe(false);
    expect(roots[0]!.children.map((c) => c.text)).toEqual(['done child', 'open child']);
    expect(roots[0]!.children[0]!.completed).toBe(true);
    expect(roots[0]!.children[1]!.completed).toBe(false);
  });

  it('skips blank lines', () => {
    const roots = parseImportedOutline('a\n\n\nb', () => 'id');
    expect(roots.map((r) => r.text)).toEqual(['a', 'b']);
  });

  it('returns [] for empty input', () => {
    expect(parseImportedOutline('   \n  ', () => 'id')).toEqual([]);
  });
});

describe('looksLikeOutlineText', () => {
  it('is false for plain multi-line text with no indentation or markers', () => {
    expect(looksLikeOutlineText('line1\nline2')).toBe(false);
  });

  it('is true when a line has a markdown bullet marker', () => {
    expect(looksLikeOutlineText('- item1\n- item2')).toBe(true);
  });

  it('is true when a line has real leading indentation', () => {
    expect(looksLikeOutlineText('parent\n\tchild')).toBe(true);
  });

  it('is false for a single line with no markers', () => {
    expect(looksLikeOutlineText('just one line')).toBe(false);
  });

  it('is true for a lone GFM checkbox marker', () => {
    expect(looksLikeOutlineText('- [ ] todo')).toBe(true);
  });
});
