'use client';

import { useMouse, useThrottle } from '@uidotdev/usehooks';
import { useMemo } from 'react';

/**
 * A performance-optimized mouse position hook that throttles updates to 16ms (60fps).
 * This reduces the number of re-renders caused by mouse movement events.
 */
export function useThrottledMouse<T extends Element = Element>() {
  const [rawMousePosition, ref] = useMouse<T>();

  // Throttle mouse position to 16ms (60fps)
  const throttledX = useThrottle(rawMousePosition.x, 16);
  const throttledY = useThrottle(rawMousePosition.y, 16);
  const throttledElementX = useThrottle(rawMousePosition.elementX, 16);
  const throttledElementY = useThrottle(rawMousePosition.elementY, 16);
  const throttledElementPositionX = useThrottle(rawMousePosition.elementPositionX, 16);
  const throttledElementPositionY = useThrottle(rawMousePosition.elementPositionY, 16);

  const throttledPosition = useMemo(() => ({
    x: throttledX,
    y: throttledY,
    elementX: throttledElementX,
    elementY: throttledElementY,
    elementPositionX: throttledElementPositionX,
    elementPositionY: throttledElementPositionY,
  }), [
    throttledX,
    throttledY,
    throttledElementX,
    throttledElementY,
    throttledElementPositionX,
    throttledElementPositionY,
  ]);

  return [throttledPosition, ref] as const;
}
