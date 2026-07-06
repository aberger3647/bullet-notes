import { flushSync } from 'react-dom';

export type ZoomDirection = 'forward' | 'backward';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Runs a zoom-navigation state update inside a View Transition so the outline
 * and title can slide in the given direction instead of swapping instantly.
 * Falls back to a plain update when the API is unsupported or motion is reduced.
 *
 * When `morphSource` is given (the bullet text just clicked to zoom into), it
 * temporarily claims the shared "zoom-title" view-transition-name so that text
 * grows and floats into the title position instead of the title crossfading in
 * place. The current title (if any) has to give up that name for the old-state
 * capture, then reclaim it once the DOM has updated, or the browser sees a
 * duplicate name and skips the whole transition.
 */
export function runZoomTransition(
  direction: ZoomDirection,
  update: () => void,
  morphSource?: HTMLElement | null,
): void {
  if (!document.startViewTransition || prefersReducedMotion()) {
    update();
    return;
  }

  document.documentElement.dataset.zoomDirection = direction;

  const titleEl = morphSource ? document.querySelector<HTMLElement>('.zoom-title') : null;
  if (morphSource) {
    if (titleEl && titleEl !== morphSource) titleEl.style.viewTransitionName = 'none';
    morphSource.style.viewTransitionName = 'zoom-title';
  }

  const transition = document.startViewTransition(() =>
    flushSync(() => {
      if (titleEl) titleEl.style.viewTransitionName = '';
      update();
    }),
  );

  transition.finished.finally(() => {
    delete document.documentElement.dataset.zoomDirection;
    if (morphSource) morphSource.style.viewTransitionName = '';
  });
}
