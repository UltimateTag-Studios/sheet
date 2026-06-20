import type { SheetSnap } from "./snap-math";

const COLLAPSED_HEIGHT_EPSILON_PX = 2;

/** Whether the sheet is at collapsed header height (resting or mid-drag). */
export function isSheetAtCollapsedHeader(args: {
  sheetSnap: SheetSnap;
  isDragging: boolean;
  visibleHeightPx: number;
  collapsedHeightPx: number;
}): boolean {
  if (!args.isDragging) {
    return args.sheetSnap === "collapsed";
  }

  return (
    args.visibleHeightPx <= args.collapsedHeightPx + COLLAPSED_HEIGHT_EPSILON_PX
  );
}
