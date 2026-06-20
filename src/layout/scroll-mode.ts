import type { SheetSnap } from "./snap-math";

export const FULL_HEIGHT_EPSILON_PX = 2;
export const SCROLL_TOP_EPSILON_PX = 1;

/** Body overflow scroll when at full height (live during drag, resting snap when idle). */
export function canBodyScroll(args: {
  sheetSnap: SheetSnap;
  visibleHeightPx: number;
  fullHeightPx: number;
  isDragging: boolean;
}): boolean {
  if (args.isDragging) {
    return args.visibleHeightPx >= args.fullHeightPx - FULL_HEIGHT_EPSILON_PX;
  }
  return args.sheetSnap === "full";
}

export function shouldCaptureSheetGesture(args: {
  canBodyScroll: boolean;
  scrollTopPx: number;
}): boolean {
  if (!args.canBodyScroll) {
    return true;
  }
  return args.scrollTopPx <= SCROLL_TOP_EPSILON_PX;
}

export const SHEET_BODY_ROOT_BASE_CLASS = "sheet-body-root";

export const SHEET_BODY_SCROLLABLE_CLASS = "sheet-body-root--scroll";

export const SHEET_BODY_DRAG_CLASS = "sheet-body-root--drag";

/** Body scroll root below the sheet header chrome. */
export function sheetBodyRootClass(canBodyScroll: boolean): string {
  return canBodyScroll
    ? `${SHEET_BODY_ROOT_BASE_CLASS} ${SHEET_BODY_SCROLLABLE_CLASS}`
    : `${SHEET_BODY_ROOT_BASE_CLASS} ${SHEET_BODY_DRAG_CLASS}`;
}
