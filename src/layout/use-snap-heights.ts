import type { RefObject } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { measureCollapsedHeightPx, readHostHeightPx } from "./snap-heights";

export type UseSheetSnapHeightsOptions = {
  hostEl: HTMLElement | null;
  chromeRef: RefObject<HTMLElement | null>;
  getReserveHeightPx: () => number;
  /** Already normalized half snap fraction (0–1). */
  halfSnapFraction: number;
  /** Called whenever snap heights are synced (layout + resize). */
  onHeightsChangeRef?: RefObject<
    ((heights: SheetSnapHeights) => void) | undefined
  >;
};

export type SheetSnapHeights = {
  collapsedHeightPx: number;
  halfHeightPx: number;
  fullHeightPx: number;
};

function heightsEqual(a: SheetSnapHeights, b: SheetSnapHeights): boolean {
  return (
    a.collapsedHeightPx === b.collapsedHeightPx &&
    a.halfHeightPx === b.halfHeightPx &&
    a.fullHeightPx === b.fullHeightPx
  );
}

export function measureSnapHeights(
  hostEl: HTMLElement | null,
  chromeEl: HTMLElement | null,
  reserveHeightPx: number,
  halfSnapFraction: number,
): SheetSnapHeights {
  const fullHeightPx = readHostHeightPx(hostEl);

  return {
    collapsedHeightPx: measureCollapsedHeightPx(
      chromeEl,
      fullHeightPx,
      halfSnapFraction,
      reserveHeightPx,
    ),
    halfHeightPx: Math.round(fullHeightPx * halfSnapFraction),
    fullHeightPx,
  };
}

export function useSheetSnapHeights({
  hostEl,
  chromeRef,
  getReserveHeightPx,
  halfSnapFraction,
  onHeightsChangeRef,
}: UseSheetSnapHeightsOptions): SheetSnapHeights & {
  syncLayoutHeights: () => void;
} {
  const readHeights = useCallback(
    () =>
      measureSnapHeights(
        hostEl,
        chromeRef.current,
        getReserveHeightPx(),
        halfSnapFraction,
      ),
    [chromeRef, getReserveHeightPx, halfSnapFraction, hostEl],
  );

  const [heights, setHeights] = useState<SheetSnapHeights>(() => readHeights());
  const notifiedHeightsRef = useRef(heights);

  const syncHeights = useCallback(() => {
    const next = readHeights();
    setHeights((current) => {
      if (heightsEqual(current, next)) {
        return current;
      }
      return next;
    });
  }, [readHeights]);

  useLayoutEffect(() => {
    if (heightsEqual(notifiedHeightsRef.current, heights)) {
      return;
    }
    notifiedHeightsRef.current = heights;
    onHeightsChangeRef?.current?.(heights);
  }, [heights, onHeightsChangeRef]);

  useLayoutEffect(() => {
    if (!hostEl) {
      return;
    }
    syncHeights();
  }, [hostEl, syncHeights]);

  useEffect(() => {
    if (!hostEl) {
      return;
    }

    let hostObserver: ResizeObserver | undefined;
    let chromeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      hostObserver = new ResizeObserver(syncHeights);
      hostObserver.observe(hostEl);
      const chromeEl = chromeRef.current;
      if (chromeEl) {
        chromeObserver = new ResizeObserver(syncHeights);
        chromeObserver.observe(chromeEl);
      }
    }

    window.addEventListener("resize", syncHeights);

    return () => {
      hostObserver?.disconnect();
      chromeObserver?.disconnect();
      window.removeEventListener("resize", syncHeights);
    };
  }, [chromeRef, hostEl, syncHeights]);

  return { ...heights, syncLayoutHeights: syncHeights };
}
