import type { CSSProperties } from "react";

import {
  readContainerHeightPx,
  visibleHeightToTranslateOffsetPx,
} from "./snap-heights";

export { readContainerHeightPx, visibleHeightToTranslateOffsetPx };

export const SHEET_SETTLE_TRANSITION =
  "transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)";

/** Sheet root transform/transition from visible height and drag phase. */
export function sheetTransformStyle(
  visibleHeightPx: number,
  phase: "idle" | "dragging" | "settling",
): CSSProperties {
  const offsetPx = visibleHeightToTranslateOffsetPx(visibleHeightPx);
  return {
    transform: `translate3d(0, ${offsetPx}px, 0)`,
    transition: phase === "dragging" ? "none" : SHEET_SETTLE_TRANSITION,
  };
}
