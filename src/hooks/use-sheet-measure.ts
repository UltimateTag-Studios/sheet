import type { RefObject } from "react";
import { useCallback, useRef } from "react";

import {
  type SheetSnapHeights,
  useSheetSnapHeights,
} from "../layout/use-snap-heights";

export type UseSheetMeasureOptions = {
  hostEl: HTMLElement | null;
  halfSnapFraction: number;
  onLayoutMeasureRef: RefObject<
    ((heights: SheetSnapHeights) => void) | undefined
  >;
};

export function useSheetMeasure({
  hostEl,
  halfSnapFraction,
  onLayoutMeasureRef,
}: UseSheetMeasureOptions) {
  const chromeRef = useRef<HTMLElement | null>(null);
  const reserveHeightRef = useRef(0);
  const getReserveHeightPx = useCallback(() => reserveHeightRef.current, []);

  const { syncLayoutHeights } = useSheetSnapHeights({
    hostEl,
    chromeRef,
    getReserveHeightPx,
    halfSnapFraction,
    onHeightsChangeRef: onLayoutMeasureRef,
  });

  const registerChromeMeasure = useCallback((node: HTMLElement | null) => {
    chromeRef.current = node;
  }, []);

  const syncReserveHeightPx = useCallback(
    (heightPx: number) => {
      reserveHeightRef.current = heightPx;
      syncLayoutHeights();
    },
    [syncLayoutHeights],
  );

  return {
    registerChromeMeasure,
    syncReserveHeightPx,
  };
}
