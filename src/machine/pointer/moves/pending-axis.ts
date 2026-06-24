import {
  beginScrollGesture,
  reanchorSheetGesture,
} from "../../helpers/gesture";
import { clampHeight } from "../../helpers/height";
import type { SheetGesture, SheetMachineState } from "../../state";
import { SHEET_AXIS_THRESHOLD_PX } from "../../state";
import type {
  SheetMachineEffect,
  SheetMachinePointerMove,
  SheetMachineResult,
} from "../../types";

export function reducePendingAxisMove(
  state: SheetMachineState,
  event: SheetMachinePointerMove,
  gesture: SheetGesture,
  effects: SheetMachineEffect[],
): SheetMachineResult {
  const totalDeltaY = event.clientY - gesture.startClientY;
  if (Math.abs(totalDeltaY) < SHEET_AXIS_THRESHOLD_PX) {
    return { state, effects: [] };
  }

  if (totalDeltaY < 0) {
    const excessUp = -totalDeltaY - SHEET_AXIS_THRESHOLD_PX;
    const scrollEffects =
      excessUp > 0
        ? [...effects, { type: "scrollBody" as const, deltaPx: excessUp }]
        : effects;

    return {
      state: {
        ...state,
        visibleHeightPx: state.fullHeightPx,
        gesture: beginScrollGesture(gesture, event.clientY),
      },
      effects: scrollEffects,
    };
  }

  const excessDown = totalDeltaY - SHEET_AXIS_THRESHOLD_PX;
  const nextHeight = clampHeight(state, state.fullHeightPx - excessDown);
  effects.push({ type: "notifyDragStart" });

  return {
    state: {
      ...state,
      visibleHeightPx: nextHeight,
      gesture: reanchorSheetGesture(gesture, event.clientY, nextHeight),
    },
    effects,
  };
}
