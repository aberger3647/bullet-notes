import type { BulletNode } from '../state/types';

const TEMPLATES_STORAGE_KEY = 'bullet-notes:v1:templates';

export type Template = {
  id: string;
  name: string;
  root: BulletNode;
};

export function listTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Template[]) : [];
  } catch {
    return [];
  }
}

function writeTemplates(templates: Template[]) {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch {
    /* ignore quota/availability errors */
  }
}

export function saveTemplate(name: string, root: BulletNode, genId: () => string = () => crypto.randomUUID()): void {
  const templates = listTemplates();
  templates.push({ id: genId(), name, root });
  writeTemplates(templates);
}

export function deleteTemplate(id: string): void {
  writeTemplates(listTemplates().filter((t) => t.id !== id));
}
