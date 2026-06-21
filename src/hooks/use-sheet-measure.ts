import type { RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";

import {
  type SheetSnapHeights,
  useSheetSnapHeights,
} from "../layout/use-snap-heights";

export type UseSheetMeasureOptions = {
  hostEl: HTMLElement | null;
  halfSnapFraction: number;
  onSnapHeightsChange?: (heights: {
    collapsedHeightPx: number;
    halfHeightPx: number;
    fullHeightPx: number;
  }) => void;
  onLayoutMeasureRef: RefObject<
    ((heights: SheetSnapHeights) => void) | undefined
  >;
};

export function useSheetMeasure({
  hostEl,
  halfSnapFraction,
  onSnapHeightsChange,
  onLayoutMeasureRef,
}: UseSheetMeasureOptions) {
  const chromeRef = useRef<HTMLElement | null>(null);
  const reserveHeightRef = useRef(0);
  const getReserveHeightPx = useCallback(() => reserveHeightRef.current, []);

  const onSnapHeightsChangeRef = useRef(onSnapHeightsChange);
  onSnapHeightsChangeRef.current = onSnapHeightsChange;

  const { collapsedHeightPx, halfHeightPx, fullHeightPx, syncLayoutHeights } =
    useSheetSnapHeights({
      hostEl,
      chromeRef,
      getReserveHeightPx,
      halfSnapFraction,
      onHeightsChangeRef: onLayoutMeasureRef,
    });

  useEffect(() => {
    onSnapHeightsChangeRef.current?.({
      collapsedHeightPx,
      halfHeightPx,
      fullHeightPx,
    });
  }, [collapsedHeightPx, halfHeightPx, fullHeightPx]);

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
    collapsedHeightPx,
    halfHeightPx,
    fullHeightPx,
    registerChromeMeasure,
    syncReserveHeightPx,
  };
}
