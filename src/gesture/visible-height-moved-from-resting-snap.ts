import { heightForSnap } from "../layout/snap-math";
import type { SheetMachineState } from "../machine/sheet-machine";

export function visibleHeightMovedFromRestingSnap(
  state: SheetMachineState,
): boolean {
  return (
    state.visibleHeightPx !==
    heightForSnap(
      state.restingSnap,
      state.collapsedHeightPx,
      state.halfHeightPx,
      state.fullHeightPx,
    )
  );
}
