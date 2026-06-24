import type { SheetMachineState, SheetPhase } from "../machine";
import type { SheetSnap } from "./snap-math";

/** Authoritative sheet slide height from the gesture machine (not CSS transition samples). */
export type SheetLayoutFrameChange = {
  visibleHeightPx: number;
  phase: SheetPhase;
  restingSnap: SheetSnap;
};

export function toSheetLayoutFrameChange(
  state: SheetMachineState,
): SheetLayoutFrameChange {
  return {
    visibleHeightPx: state.visibleHeightPx,
    phase: state.phase,
    restingSnap: state.restingSnap,
  };
}
