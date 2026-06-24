import { heightForSnap } from "../../layout/snap-math";
import { enterSettle } from "../settle/enter";
import type { SheetMachineState } from "../state";
import type {
  SheetMachineEffect,
  SheetMachineResult,
  SheetMachineSetSnap,
} from "../types";

export function reduceSetSnap(
  state: SheetMachineState,
  event: SheetMachineSetSnap,
): SheetMachineResult {
  const heightPx = heightForSnap(
    event.snap,
    state.collapsedHeightPx,
    state.halfHeightPx,
    state.fullHeightPx,
  );
  const effects: SheetMachineEffect[] = [];
  if (event.snap !== state.restingSnap) {
    effects.push({ type: "notifySnapChange", snap: event.snap });
  }

  return enterSettle(state, event.snap, heightPx, effects);
}
