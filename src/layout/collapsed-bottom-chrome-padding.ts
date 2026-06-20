import type { SheetSnap } from "./snap-math";

const COLLAPSED_HEIGHT_EPSILON_PX = 2;

/** Header bottom padding so collapsed content clears bottom chrome (e.g. floating tab bar). */
export function showCollapsedBottomChromePadding(args: {
  reserveBottomChrome: boolean;
  sheetSnap: SheetSnap;
  isDragging: boolean;
  visibleHeightPx: number;
  collapsedHeightPx: number;
}): boolean {
  if (!args.reserveBottomChrome) {
    return false;
  }

  if (!args.isDragging) {
    return args.sheetSnap === "collapsed";
  }

  return (
    args.visibleHeightPx <= args.collapsedHeightPx + COLLAPSED_HEIGHT_EPSILON_PX
  );
}
