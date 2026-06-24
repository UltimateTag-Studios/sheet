import { isVisibleHeightAtRestingSnap } from "../../layout/snap-math";
import { withDragFrameEffects } from "../effects/drag-frame";
import {
  appendScrollSample,
  clearScrollSamples,
  markPointerHadEffect,
} from "../helpers/pointer-arm";
import type { SheetGesture, SheetMachineState } from "../state";
import { SHEET_AXIS_THRESHOLD_PX } from "../state";
import type {
  SheetMachineEffect,
  SheetMachinePointerMove,
  SheetMachineResult,
} from "../types";
import { reducePendingAxisMove } from "./moves/pending-axis";
import { reduceScrollMove } from "./moves/scroll";
import { reduceSheetMove } from "./moves/sheet";

export function reduceArmedMove(
  state: SheetMachineState,
  event: SheetMachinePointerMove,
  gesture: SheetGesture,
): SheetMachineResult {
  const totalDeltaY = event.clientY - gesture.startClientY;
  if (Math.abs(totalDeltaY) < SHEET_AXIS_THRESHOLD_PX) {
    return { state, effects: [] };
  }

  const draggingState: SheetMachineState = {
    ...state,
    phase: "dragging",
  };
  const effects: SheetMachineEffect[] = [];

  if (gesture.intent === "pendingAxis") {
    return withDragFrameEffects(
      reducePendingAxisMove(draggingState, event, gesture, effects),
    );
  }

  if (gesture.intent === "scroll") {
    return withDragFrameEffects(
      reduceScrollMove(draggingState, event, gesture, effects),
    );
  }

  effects.push({ type: "notifyDragStart" });
  return withDragFrameEffects(
    reduceSheetMove(draggingState, event, gesture, effects),
  );
}

export function finalizePointerMoveResult(
  _previous: SheetMachineState,
  event: SheetMachinePointerMove,
  result: SheetMachineResult,
): SheetMachineResult {
  let nextState = result.state;
  const intent = nextState.gesture?.intent;

  if (intent === "scroll") {
    nextState = appendScrollSample(nextState, {
      timeMs: event.timeMs,
      clientY: event.clientY,
    });
  } else if (intent === "sheet") {
    nextState = clearScrollSamples(nextState);
  }

  const scrolled = result.effects.some(
    (effect) => effect.type === "scrollBody" && effect.deltaPx !== 0,
  );
  if (scrolled || !isVisibleHeightAtRestingSnap(nextState)) {
    nextState = markPointerHadEffect(nextState);
  }

  return { state: nextState, effects: result.effects };
}

export function reducePointerMove(
  state: SheetMachineState,
  event: SheetMachinePointerMove,
): SheetMachineResult {
  const gesture = state.gesture;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return { state, effects: [] };
  }

  let result: SheetMachineResult;
  if (state.phase === "idle") {
    result = reduceArmedMove(state, event, gesture);
  } else if (gesture.intent === "pendingAxis") {
    result = withDragFrameEffects(
      reducePendingAxisMove(state, event, gesture, []),
    );
  } else if (gesture.intent === "scroll") {
    result = withDragFrameEffects(reduceScrollMove(state, event, gesture, []));
  } else {
    result = withDragFrameEffects(reduceSheetMove(state, event, gesture, []));
  }

  return finalizePointerMoveResult(state, event, result);
}
