export const SHEET_SETTLE_HEIGHT_TRANSITION =
  "height 0.5s cubic-bezier(0.32, 0.72, 0, 1)";

export type SheetFrameStyle = {
  height: string;
  transition: string;
};

/** Bottom-anchored slide height for the current snap / drag phase. */
export function sheetFrameStyle(
  visibleHeightPx: number,
  phase: "idle" | "dragging" | "settling",
): SheetFrameStyle {
  return {
    height: `${Math.round(visibleHeightPx)}px`,
    transition: phase === "dragging" ? "none" : SHEET_SETTLE_HEIGHT_TRANSITION,
  };
}
