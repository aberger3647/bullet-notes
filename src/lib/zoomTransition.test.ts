import { describe, it, expect, vi, afterEach } from 'vitest';
import { runZoomTransition } from './zoomTransition';

afterEach(() => {
  delete (document as { startViewTransition?: unknown }).startViewTransition;
  delete document.documentElement.dataset.zoomDirection;
  vi.restoreAllMocks();
});

describe('runZoomTransition', () => {
  it('runs the update directly when the View Transition API is unsupported', () => {
    const update = vi.fn();
    runZoomTransition('forward', update);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('runs the update directly when the user prefers reduced motion, even if supported', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const startViewTransition = vi.fn();
    (document as { startViewTransition?: unknown }).startViewTransition = startViewTransition;

    const update = vi.fn();
    runZoomTransition('forward', update);

    expect(update).toHaveBeenCalledTimes(1);
    expect(startViewTransition).not.toHaveBeenCalled();
  });

  it('sets the zoom direction and runs the update inside startViewTransition when supported', () => {
    const update = vi.fn();
    const startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return { finished: Promise.resolve() };
    });
    (document as { startViewTransition?: unknown }).startViewTransition = startViewTransition;

    runZoomTransition('backward', update);

    expect(document.documentElement.dataset.zoomDirection).toBe('backward');
    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('clears the zoom direction once the transition finishes', async () => {
    let resolveFinished!: () => void;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });
    const startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return { finished };
    });
    (document as { startViewTransition?: unknown }).startViewTransition = startViewTransition;

    runZoomTransition('forward', () => {});
    expect(document.documentElement.dataset.zoomDirection).toBe('forward');

    resolveFinished();
    await finished;
    await Promise.resolve();

    expect(document.documentElement.dataset.zoomDirection).toBeUndefined();
  });

  it('morphs the clicked bullet text into the title: claims the name, hands it off, then releases it', async () => {
    const title = document.createElement('h1');
    title.className = 'zoom-title';
    const source = document.createElement('div');
    document.body.append(title, source);

    let resolveFinished!: () => void;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });
    const startViewTransition = vi.fn((cb: () => void) => {
      // Before the callback runs (the "old" capture), only the source should
      // own the name — the old title must give it up to avoid a duplicate.
      expect(title.style.viewTransitionName).toBe('none');
      expect(source.style.viewTransitionName).toBe('zoom-title');
      cb();
      // After the callback (the DOM update), the title reclaims the name so
      // the browser's "new" capture finds it there instead.
      expect(title.style.viewTransitionName).toBe('');
      return { finished };
    });
    (document as { startViewTransition?: unknown }).startViewTransition = startViewTransition;

    runZoomTransition('forward', () => {}, source);

    resolveFinished();
    await finished;
    await Promise.resolve();

    expect(source.style.viewTransitionName).toBe('');

    title.remove();
    source.remove();
  });
});
