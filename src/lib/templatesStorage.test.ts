import { describe, it, expect, beforeEach } from 'vitest';
import { listTemplates, saveTemplate, deleteTemplate } from './templatesStorage';
import { node } from '../test/factories';

describe('templatesStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns [] when nothing is saved', () => {
    expect(listTemplates()).toEqual([]);
  });

  it('saves and lists a template', () => {
    saveTemplate('Meeting notes', node('a', [node('b')], { text: 'Meeting notes' }), () => 'tpl-1');
    const templates = listTemplates();
    expect(templates).toHaveLength(1);
    expect(templates[0]).toMatchObject({ id: 'tpl-1', name: 'Meeting notes' });
    expect(templates[0]!.root.children).toHaveLength(1);
  });

  it('deletes a template', () => {
    saveTemplate('A', node('a'), () => 'tpl-1');
    saveTemplate('B', node('b'), () => 'tpl-2');
    deleteTemplate('tpl-1');
    expect(listTemplates().map((t) => t.id)).toEqual(['tpl-2']);
  });
});
