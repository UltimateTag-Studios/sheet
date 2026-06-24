import { createGestureForArm } from "../helpers/gesture";
import type { SheetMachineState } from "../state";
import { SHEET_AXIS_THRESHOLD_PX } from "../state";
import type { SheetMachinePointerCommit, SheetMachineResult } from "../types";
import { reducePointerMove } from "./move";

export function reducePointerCommit(
  state: SheetMachineState,
  event: SheetMachinePointerCommit,
): SheetMachineResult {
  const arm = state.pointerArm;
  if (!arm || arm.pointerId !== event.pointerId || arm.committed) {
    return { state, effects: [] };
  }

  const totalDeltaY = Math.abs(event.clientY - arm.startClientY);
  if (totalDeltaY < SHEET_AXIS_THRESHOLD_PX) {
    return { state, effects: [] };
  }

  let nextState: SheetMachineState = {
    ...state,
    pointerArm: { ...arm, committed: true },
  };

  if (arm.route === "watch") {
    const gesture = createGestureForArm(nextState, arm);
    nextState = { ...nextState, gesture };
  }

  if (nextState.gesture === null) {
    return { state, effects: [] };
  }

  return reducePointerMove(nextState, {
    type: "pointerMove",
    pointerId: event.pointerId,
    clientY: event.clientY,
    scrollTopPx: event.scrollTopPx,
    timeMs: event.timeMs,
  });
}
