"use client";

import { useEffect, useRef, useCallback } from "react";

interface SwipeBackOptions {
  /** Minimum horizontal distance (px) to consider it a swipe. Default: 72 */
  minDistance?: number;
  /** Max px from left edge where swipe must start. Default: 32 */
  edgeZone?: number;
  /** Minimum velocity (px/ms) to trigger back on release. Default: 0.25 */
  minVelocity?: number;
  /** Called while dragging with current x offset (0 → maxOffset). */
  onDrag?: (offset: number) => void;
  /** Called when swipe is cancelled (released too early). */
  onCancel?: () => void;
  /** Called when swipe triggers history.back(). */
  onBack?: () => void;
}

/**
 * Attaches a swipe-right-from-left-edge gesture to trigger browser history.back().
 * Only activates on touch devices. Returns a ref to attach to the scroll container.
 */
export function useSwipeBack({
  minDistance = 72,
  edgeZone    = 32,
  minVelocity = 0.25,
  onDrag,
  onCancel,
  onBack,
}: SwipeBackOptions = {}) {
  const startX    = useRef<number | null>(null);
  const startY    = useRef<number | null>(null);
  const startTime = useRef<number>(0);
  const tracking  = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    // Only activate if touch starts in the edge zone
    if (touch.clientX > edgeZone) return;
    startX.current    = touch.clientX;
    startY.current    = touch.clientY;
    startTime.current = performance.now();
    tracking.current  = true;
  }, [edgeZone]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!tracking.current || startX.current === null || startY.current === null) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;

    // If more vertical than horizontal, abandon tracking
    if (Math.abs(dy) > Math.abs(dx) && dx < 20) {
      tracking.current = false;
      onCancel?.();
      return;
    }

    if (dx > 0) {
      onDrag?.(Math.min(dx, 120));
    }
  }, [onDrag, onCancel]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!tracking.current || startX.current === null) return;
    tracking.current = false;

    const touch    = e.changedTouches[0];
    const dx       = touch.clientX - startX.current;
    const elapsed  = performance.now() - startTime.current;
    const velocity = dx / elapsed; // px/ms

    if (dx >= minDistance || velocity >= minVelocity) {
      onBack?.();
      window.history.back();
    } else {
      onCancel?.();
    }

    startX.current = null;
    startY.current = null;
  }, [minDistance, minVelocity, onBack, onCancel]);

  useEffect(() => {
    // Only mount on touch-capable (mobile) environments
    if (typeof window === "undefined") return;
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    if (!isTouchDevice) return;

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove",  handleTouchMove,  { passive: true });
    window.addEventListener("touchend",   handleTouchEnd,   { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove",  handleTouchMove);
      window.removeEventListener("touchend",   handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
}
