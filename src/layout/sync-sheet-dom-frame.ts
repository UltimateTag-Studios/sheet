import { sheetFrameStyle } from "./sheet-transform";

export function applySheetSlideFrame(
  sheetSlide: HTMLDivElement,
  visibleHeightPx: number,
  phase: "idle" | "dragging" | "settling",
  suppressTransition: boolean,
): void {
  const frameStyle = sheetFrameStyle(
    visibleHeightPx,
    phase,
    suppressTransition,
  );
  sheetSlide.style.height = frameStyle.height;
  sheetSlide.style.transition = frameStyle.transition;
}
