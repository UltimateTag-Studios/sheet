import { reduceMeasure } from "./measure/reduce";
import { reducePointerArm } from "./pointer/arm";
import { reducePointerCommit } from "./pointer/commit";
import { reducePointerMove } from "./pointer/move";
import { reducePointerUp } from "./pointer/up";
import { completeSettleTransition } from "./settle/complete";
import { reduceSetSnap } from "./snap/reduce";
import type { SheetMachineState } from "./state";
import type { SheetMachineEvent, SheetMachineResult } from "./types";

export function reduceSheetMachine(
  state: SheetMachineState,
  event: SheetMachineEvent,
): SheetMachineResult {
  switch (event.type) {
    case "measure":
      return reduceMeasure(state, event);
    case "setSnap":
      return reduceSetSnap(state, event);
    case "settleComplete":
      return completeSettleTransition(state, []);
    case "pointerArm":
      return reducePointerArm(state, event);
    case "pointerCommit":
      return reducePointerCommit(state, event);
    case "pointerMove":
      return reducePointerMove(state, event);
    case "pointerUp":
      return reducePointerUp(state, event);
    default:
      return { state, effects: [] };
  }
}

export { measureBootstrapEffects } from "./effects/measure-heights";
export type {
  SheetMachineEffect,
  SheetMachineEvent,
  SheetMachineResult,
} from "./types";
