import { useEffect, useState } from 'react';

/** Distance from the layout viewport bottom to the visual viewport bottom (keyboard height). */
export function useVisualViewportBottom(): number {
  const [bottom, setBottom] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      setBottom(Math.max(0, offset));
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return bottom;
}
