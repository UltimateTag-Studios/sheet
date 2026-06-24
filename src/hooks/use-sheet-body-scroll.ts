import { useCallback, useEffect, useRef } from "react";

import type { SheetSnap } from "../layout/snap-math";
import { runScrollMomentum } from "./sheet-body-scroll-momentum";

export function useSheetBodyScroll(restingSnap: SheetSnap) {
  const bodyElRef = useRef<HTMLDivElement | null>(null);
  const bodyScrollCleanupRef = useRef<(() => void) | null>(null);
  const scrollTopRef = useRef(0);
  const prevRestingSnapRef = useRef(restingSnap);
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

  const startScrollMomentum = useCallback(
    (velocityPxPerMs: number) => {
      const bodyEl = bodyElRef.current;
      if (!bodyEl) {
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
    },
    [cancelScrollMomentum],
  );

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

    const bodyEl = bodyElRef.current;
    if (!bodyEl) {
      return;
    }

    bodyEl.scrollTop = 0;
    scrollTopRef.current = 0;
  }, [cancelScrollMomentum, restingSnap]);

  return {
    readScrollTop,
    applyBodyScrollDelta,
    registerBodyEl,
    startScrollMomentum,
    cancelScrollMomentum,
  };
}
