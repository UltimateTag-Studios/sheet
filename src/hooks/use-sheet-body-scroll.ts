import { useCallback, useEffect, useRef } from "react";

import type { SheetSnap } from "../layout/snap-math";
import {
  computeScrollReleaseVelocityPxPerMs,
  runScrollMomentum,
  type ScrollPointerSample,
  shouldStartScrollMomentum,
} from "./sheet-body-scroll-momentum";

export function useSheetBodyScroll(restingSnap: SheetSnap) {
  const bodyElRef = useRef<HTMLDivElement | null>(null);
  const bodyScrollCleanupRef = useRef<(() => void) | null>(null);
  const scrollTopRef = useRef(0);
  const prevRestingSnapRef = useRef(restingSnap);
  const scrollSamplesRef = useRef<ScrollPointerSample[]>([]);
  const scrollTrackingRef = useRef(false);
  const stopMomentumRef = useRef<(() => void) | null>(null);

  const cancelScrollMomentum = useCallback(() => {
    stopMomentumRef.current?.();
    stopMomentumRef.current = null;
  }, []);

  const readScrollTop = useCallback(() => {
    if (bodyElRef.current) {
      scrollTopRef.current = bodyElRef.current.scrollTop;
    }
    return scrollTopRef.current;
  }, []);

  const applyBodyScrollDelta = useCallback(
    (deltaPx: number) => {
      const bodyEl = bodyElRef.current;
      if (!bodyEl) {
        return;
      }

      cancelScrollMomentum();

      const maxScrollTop = bodyEl.scrollHeight - bodyEl.clientHeight;
      bodyEl.scrollTop = Math.min(
        maxScrollTop,
        Math.max(0, bodyEl.scrollTop + deltaPx),
      );
      scrollTopRef.current = bodyEl.scrollTop;
    },
    [cancelScrollMomentum],
  );

  const clearScrollPointerTracking = useCallback(() => {
    scrollSamplesRef.current = [];
    scrollTrackingRef.current = false;
  }, []);

  const recordScrollPointerSample = useCallback((clientY: number) => {
    scrollTrackingRef.current = true;
    scrollSamplesRef.current.push({
      timeMs: performance.now(),
      clientY,
    });

    const cutoffMs = performance.now() - 120;
    scrollSamplesRef.current = scrollSamplesRef.current.filter(
      (sample) => sample.timeMs >= cutoffMs,
    );
  }, []);

  const releaseScrollMomentum = useCallback(() => {
    if (!scrollTrackingRef.current) {
      clearScrollPointerTracking();
      return;
    }

    const bodyEl = bodyElRef.current;
    const velocityPxPerMs = computeScrollReleaseVelocityPxPerMs(
      scrollSamplesRef.current,
    );
    clearScrollPointerTracking();

    if (!bodyEl || !shouldStartScrollMomentum(velocityPxPerMs)) {
      return;
    }

    cancelScrollMomentum();
    stopMomentumRef.current = runScrollMomentum({
      bodyEl,
      initialVelocityPxPerMs: velocityPxPerMs,
      onScrollTopChange: () => {
        scrollTopRef.current = bodyEl.scrollTop;
      },
      onComplete: () => {
        stopMomentumRef.current = null;
      },
    });
  }, [cancelScrollMomentum, clearScrollPointerTracking]);

  const registerBodyEl = useCallback(
    (node: HTMLDivElement | null) => {
      bodyScrollCleanupRef.current?.();
      bodyScrollCleanupRef.current = null;
      cancelScrollMomentum();
      bodyElRef.current = node;
      if (node) {
        const onScroll = () => {
          scrollTopRef.current = node.scrollTop;
        };
        onScroll();
        node.addEventListener("scroll", onScroll, { passive: true });
        bodyScrollCleanupRef.current = () => {
          node.removeEventListener("scroll", onScroll);
        };
      }
    },
    [cancelScrollMomentum],
  );

  useEffect(
    () => () => {
      bodyScrollCleanupRef.current?.();
      cancelScrollMomentum();
    },
    [cancelScrollMomentum],
  );

  useEffect(() => {
    if (prevRestingSnapRef.current === restingSnap) {
      return;
    }

    prevRestingSnapRef.current = restingSnap;
    cancelScrollMomentum();
    clearScrollPointerTracking();

    const bodyEl = bodyElRef.current;
    if (!bodyEl) {
      return;
    }

    bodyEl.scrollTop = 0;
    scrollTopRef.current = 0;
  }, [cancelScrollMomentum, clearScrollPointerTracking, restingSnap]);

  return {
    readScrollTop,
    applyBodyScrollDelta,
    registerBodyEl,
    recordScrollPointerSample,
    releaseScrollMomentum,
    cancelScrollMomentum,
    clearScrollPointerTracking,
  };
}
