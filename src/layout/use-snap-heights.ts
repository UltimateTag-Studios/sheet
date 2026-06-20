import { useEffect, useState } from "react";

import { normalizeHalfSnapFraction } from "./normalize-half-snap-fraction";
import { measureCollapsedHeightPx, readFullHeightPx } from "./snap-heights";

export type UseSheetSnapHeightsOptions = {
  chromeEl: HTMLElement | null;
  reserveSpacerEl: HTMLElement | null;
  collapsedBottomInsetPx?: number;
  halfSnapFraction?: number;
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

export function useSheetSnapHeights({
  chromeEl,
  reserveSpacerEl,
  collapsedBottomInsetPx = 0,
  halfSnapFraction,
}: UseSheetSnapHeightsOptions): SheetSnapHeights {
  const resolvedHalfSnap = normalizeHalfSnapFraction(halfSnapFraction);

  const [heights, setHeights] = useState<SheetSnapHeights>(() => {
    const fullHeightPx = readFullHeightPx();
    return {
      collapsedHeightPx: measureCollapsedHeightPx(
        chromeEl,
        collapsedBottomInsetPx,
        fullHeightPx,
        resolvedHalfSnap,
        reserveSpacerEl,
      ),
      halfHeightPx: Math.round(fullHeightPx * resolvedHalfSnap),
      fullHeightPx,
    };
  });

  useEffect(() => {
    const syncHeights = () => {
      const fullHeightPx = readFullHeightPx();
      const next = {
        collapsedHeightPx: measureCollapsedHeightPx(
          chromeEl,
          collapsedBottomInsetPx,
          fullHeightPx,
          resolvedHalfSnap,
          reserveSpacerEl,
        ),
        halfHeightPx: Math.round(fullHeightPx * resolvedHalfSnap),
        fullHeightPx,
      };
      setHeights((current) => (heightsEqual(current, next) ? current : next));
    };

    syncHeights();

    const observers: ResizeObserver[] = [];
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(syncHeights);
      if (chromeEl) {
        observer.observe(chromeEl);
      }
      if (reserveSpacerEl) {
        observer.observe(reserveSpacerEl);
      }
      observers.push(observer);
    }

    window.addEventListener("resize", syncHeights);
    window.visualViewport?.addEventListener("resize", syncHeights);

    return () => {
      for (const observer of observers) {
        observer.disconnect();
      }
      window.removeEventListener("resize", syncHeights);
      window.visualViewport?.removeEventListener("resize", syncHeights);
    };
  }, [chromeEl, reserveSpacerEl, collapsedBottomInsetPx, resolvedHalfSnap]);

  return heights;
}
