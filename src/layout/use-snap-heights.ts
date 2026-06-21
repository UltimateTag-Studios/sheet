import { useEffect, useState } from "react";

import { measureCollapsedHeightPx, readHostHeightPx } from "./snap-heights";

export type UseSheetSnapHeightsOptions = {
  hostEl: HTMLElement | null;
  chromeEl: HTMLElement | null;
  /** Laid-out reserve spacer height in px — derived from the CSS length prop, not observed. */
  reserveHeightPx: number;
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

function measureSnapHeights(
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
  chromeEl,
  reserveHeightPx,
  halfSnapFraction,
}: UseSheetSnapHeightsOptions): SheetSnapHeights {
  const [heights, setHeights] = useState<SheetSnapHeights>(() =>
    measureSnapHeights(hostEl, chromeEl, reserveHeightPx, halfSnapFraction),
  );

  useEffect(() => {
    const syncHeights = () => {
      const next = measureSnapHeights(
        hostEl,
        chromeEl,
        reserveHeightPx,
        halfSnapFraction,
      );
      setHeights((current) => (heightsEqual(current, next) ? current : next));
    };

    syncHeights();

    let hostObserver: ResizeObserver | undefined;
    let chromeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      if (hostEl) {
        hostObserver = new ResizeObserver(syncHeights);
        hostObserver.observe(hostEl);
      }
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
  }, [hostEl, chromeEl, reserveHeightPx, halfSnapFraction]);

  return heights;
}
