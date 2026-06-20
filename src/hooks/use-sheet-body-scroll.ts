import { useCallback, useEffect, useRef } from "react";

import type { SheetSnap } from "../layout/snap-math";

export function useSheetBodyScroll(restingSnap: SheetSnap) {
  const bodyElRef = useRef<HTMLDivElement | null>(null);
  const bodyScrollCleanupRef = useRef<(() => void) | null>(null);
  const scrollTopRef = useRef(0);
  const prevRestingSnapRef = useRef(restingSnap);

  const readScrollTop = useCallback(() => {
    if (bodyElRef.current) {
      scrollTopRef.current = bodyElRef.current.scrollTop;
    }
    return scrollTopRef.current;
  }, []);

  const applyBodyScrollDelta = useCallback((deltaPx: number) => {
    const bodyEl = bodyElRef.current;
    if (!bodyEl) {
      return;
    }

    const maxScrollTop = bodyEl.scrollHeight - bodyEl.clientHeight;
    bodyEl.scrollTop = Math.min(
      maxScrollTop,
      Math.max(0, bodyEl.scrollTop + deltaPx),
    );
    scrollTopRef.current = bodyEl.scrollTop;
  }, []);

  const registerBodyEl = useCallback((node: HTMLDivElement | null) => {
    bodyScrollCleanupRef.current?.();
    bodyScrollCleanupRef.current = null;
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
  }, []);

  useEffect(
    () => () => {
      bodyScrollCleanupRef.current?.();
    },
    [],
  );

  useEffect(() => {
    if (prevRestingSnapRef.current === restingSnap) {
      return;
    }

    prevRestingSnapRef.current = restingSnap;

    const bodyEl = bodyElRef.current;
    if (!bodyEl) {
      return;
    }

    bodyEl.scrollTop = 0;
    scrollTopRef.current = 0;
  }, [restingSnap]);

  return {
    readScrollTop,
    applyBodyScrollDelta,
    registerBodyEl,
  };
}
