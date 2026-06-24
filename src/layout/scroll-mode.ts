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

export function bodyScrollEnabledFromState(args: {
  phase: "idle" | "dragging" | "settling";
  restingSnap: SheetSnap;
  visibleHeightPx: number;
  fullHeightPx: number;
}): boolean {
  return canBodyScroll({
    sheetSnap: args.restingSnap,
    visibleHeightPx: args.visibleHeightPx,
    fullHeightPx: args.fullHeightPx,
    isDragging: args.phase === "dragging",
  });
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
