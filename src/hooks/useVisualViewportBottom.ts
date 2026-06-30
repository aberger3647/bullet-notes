import { useEffect, useState } from 'react';

/** Distance from the layout viewport bottom to the visual viewport bottom (keyboard height). */
export function useVisualViewportBottom(): number {
  const [bottom, setBottom] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const offset = window.innerHeight - vv.height - vv.offsetTop;
        setBottom(Math.max(0, Math.round(offset)));
      });
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    vv.addEventListener('geometrychange', update);
    window.addEventListener('resize', update);
    update();

    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      vv.removeEventListener('geometrychange', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return bottom;
}
