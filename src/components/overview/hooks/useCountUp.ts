'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Animate a number from its previous value to `target` with an ease-out curve.
 * Respects prefers-reduced-motion (jumps straight to the target).
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = target;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || from === target) {
      setValue(target);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const progress = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}
