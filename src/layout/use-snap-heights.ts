import { useEffect, useState } from "react";

import { measureCollapsedHeightPx, readFullHeightPx } from "./snap-heights";

export type UseSheetSnapHeightsOptions = {
  chromeEl: HTMLElement | null;
  /** Laid-out reserve spacer height in px — derived from the CSS length prop, not observed. */
  reserveHeightPx: number;
  collapsedBottomInsetPx?: number;
  /** Already normalized half snap fraction (0–1). */
  halfSnapFraction: number;
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
  reserveHeightPx,
  collapsedBottomInsetPx = 0,
  halfSnapFraction,
}: UseSheetSnapHeightsOptions): SheetSnapHeights {
  const [heights, setHeights] = useState<SheetSnapHeights>(() => {
    const fullHeightPx = readFullHeightPx();
    return {
      collapsedHeightPx: measureCollapsedHeightPx(
        chromeEl,
        collapsedBottomInsetPx,
        fullHeightPx,
        halfSnapFraction,
        reserveHeightPx,
      ),
      halfHeightPx: Math.round(fullHeightPx * halfSnapFraction),
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
          halfSnapFraction,
          reserveHeightPx,
        ),
        halfHeightPx: Math.round(fullHeightPx * halfSnapFraction),
        fullHeightPx,
      };
      setHeights((current) => (heightsEqual(current, next) ? current : next));
    };

    syncHeights();

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined" && chromeEl) {
      resizeObserver = new ResizeObserver(syncHeights);
      resizeObserver.observe(chromeEl);
    }

    window.addEventListener("resize", syncHeights);
    window.visualViewport?.addEventListener("resize", syncHeights);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", syncHeights);
      window.visualViewport?.removeEventListener("resize", syncHeights);
    };
  }, [chromeEl, reserveHeightPx, collapsedBottomInsetPx, halfSnapFraction]);

  return heights;
}
