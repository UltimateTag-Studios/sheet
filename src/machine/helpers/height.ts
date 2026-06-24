import { FULL_HEIGHT_EPSILON_PX } from "../../layout/scroll-mode";
import { heightForSnap } from "../../layout/snap-math";
import type { SheetMachineState } from "../state";

export function scrollEnabled(state: SheetMachineState): boolean {
  return state.visibleHeightPx >= state.fullHeightPx - FULL_HEIGHT_EPSILON_PX;
}

export function clampHeight(
  state: SheetMachineState,
  heightPx: number,
): number {
  return Math.min(
    state.fullHeightPx,
    Math.max(state.collapsedHeightPx, heightPx),
  );
}

export function idleHeightForRestingSnap(state: SheetMachineState): number {
  return clampHeight(
    state,
    heightForSnap(
      state.restingSnap,
      state.collapsedHeightPx,
      state.halfHeightPx,
      state.fullHeightPx,
    ),
  );
}
