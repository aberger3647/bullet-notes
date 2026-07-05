import type { BulletNode } from '../state/types';

/** Cheap check for whether pasted HTML contains list structure worth converting to a bullet tree. */
export function htmlHasListStructure(html: string): boolean {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.querySelectorAll('li').length > 0;
}

function textOf(li: HTMLLIElement): string {
  const clone = li.cloneNode(true) as HTMLLIElement;
  clone.querySelectorAll('ul, ol, input[type="checkbox"]').forEach((el) => el.remove());
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function isCompleted(li: HTMLLIElement): boolean {
  const checkbox = li.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
  return checkbox?.checked ?? false;
}

function walkList(list: Element, genId: () => string): BulletNode[] {
  return Array.from(list.children)
    .filter((child): child is HTMLLIElement => child.tagName === 'LI')
    .map((li) => {
      const nestedList = li.querySelector('ul, ol');
      return {
        id: genId(),
        text: textOf(li),
        completed: isCompleted(li),
        children: nestedList ? walkList(nestedList, genId) : [],
      };
    });
}

/** Parse pasted HTML (e.g. from Word/Google Docs/Notion) into fresh BulletNode roots. */
export function parseHtmlOutline(html: string, genId: () => string): BulletNode[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rootLists = Array.from(doc.querySelectorAll('ul, ol')).filter((list) => !list.closest('li'));
  return rootLists.flatMap((list) => walkList(list, genId));
}
