export const SHEET_SETTLE_HEIGHT_TRANSITION =
  "height 0.18s cubic-bezier(0, 0, 0.2, 1)";

export type SheetFrameStyle = {
  height: string;
  transition: string;
};

/** Bottom-anchored slide height for the current snap / drag phase. */
export function sheetFrameStyle(
  visibleHeightPx: number,
  phase: "idle" | "dragging" | "settling",
  suppressTransition = false,
): SheetFrameStyle {
  return {
    height: `${Math.round(visibleHeightPx)}px`,
    transition:
      phase === "dragging" || suppressTransition
        ? "none"
        : SHEET_SETTLE_HEIGHT_TRANSITION,
  };
}
