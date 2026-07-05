import { describe, it, expect } from 'vitest';
import { htmlHasListStructure, parseHtmlOutline } from './htmlOutline';

describe('htmlHasListStructure', () => {
  it('is false for a plain paragraph', () => {
    expect(htmlHasListStructure('<p>hello</p>')).toBe(false);
  });

  it('is true when the html contains a list item', () => {
    expect(htmlHasListStructure('<ul><li>a</li></ul>')).toBe(true);
  });
});

describe('parseHtmlOutline', () => {
  it('parses a flat unordered list into flat roots', () => {
    const roots = parseHtmlOutline('<ul><li>a</li><li>b</li></ul>', () => 'id');
    expect(roots.map((r) => r.text)).toEqual(['a', 'b']);
    expect(roots[0]!.children).toEqual([]);
    expect(roots[1]!.children).toEqual([]);
  });

  it('parses a nested list into a nested tree', () => {
    const html = '<ul><li>a<ul><li>a1</li></ul></li></ul>';
    const roots = parseHtmlOutline(html, () => 'id');
    expect(roots).toHaveLength(1);
    expect(roots[0]!.text).toBe('a');
    expect(roots[0]!.children).toHaveLength(1);
    expect(roots[0]!.children[0]!.text).toBe('a1');
  });

  it('parses an ordered list the same as an unordered list', () => {
    const roots = parseHtmlOutline('<ol><li>a</li><li>b</li></ol>', () => 'id');
    expect(roots.map((r) => r.text)).toEqual(['a', 'b']);
  });

  it('marks a list item completed when it contains a checked checkbox, and strips the checkbox from the text', () => {
    const html = '<ul><li><input type="checkbox" checked>done</li></ul>';
    const roots = parseHtmlOutline(html, () => 'id');
    expect(roots[0]!.text).toBe('done');
    expect(roots[0]!.completed).toBe(true);
  });

  it('leaves completed false for an unchecked checkbox', () => {
    const html = '<ul><li><input type="checkbox">todo</li></ul>';
    const roots = parseHtmlOutline(html, () => 'id');
    expect(roots[0]!.completed).toBe(false);
  });

  it('finds the root list even when wrapped in other markup (e.g. Google Docs export)', () => {
    const html = '<div><b><ul><li>a</li></ul></b></div>';
    const roots = parseHtmlOutline(html, () => 'id');
    expect(roots.map((r) => r.text)).toEqual(['a']);
  });

  it('uses the passed genId for every generated node', () => {
    let n = 0;
    const roots = parseHtmlOutline('<ul><li>a<ul><li>a1</li></ul></li></ul>', () => `id-${n++}`);
    expect(roots[0]!.id).toBe('id-0');
    expect(roots[0]!.children[0]!.id).toBe('id-1');
  });
});
