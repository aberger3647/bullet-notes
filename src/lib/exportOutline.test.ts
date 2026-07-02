import { describe, it, expect } from 'vitest';
import { node } from '../test/factories';
import { exportToMarkdown, exportToPlainText, exportToJSON } from './exportOutline';

describe('exportToMarkdown', () => {
  it('renders a nested GFM task list', () => {
    const tree = [
      node('a', [node('b', [], { text: 'child', completed: true })], { text: 'root' }),
      node('c', [], { text: 'second root' }),
    ];
    expect(exportToMarkdown(tree)).toBe(
      '- [ ] root\n  - [x] child\n- [ ] second root',
    );
  });

  it('flattens embedded newlines to spaces', () => {
    expect(exportToMarkdown([node('a', [], { text: 'line1\nline2' })])).toBe('- [ ] line1 line2');
  });
});

describe('exportToPlainText', () => {
  it('renders a tab-indented outline with no checkboxes', () => {
    const tree = [node('a', [node('b', [], { text: 'child' })], { text: 'root' })];
    expect(exportToPlainText(tree)).toBe('root\n\tchild');
  });
});

describe('exportToJSON', () => {
  it('round-trips the tree with full fidelity', () => {
    const tree = [node('a', [node('b')], { text: 'root', completed: true })];
    const json = exportToJSON(tree);
    expect(JSON.parse(json)).toEqual(tree);
  });
});
