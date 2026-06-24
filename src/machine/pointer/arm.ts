import { createGestureForArm } from "../helpers/gesture";
import { clearScrollSamples, createPointerArm } from "../helpers/pointer-arm";
import { completeSettleTransition } from "../settle/complete";
import type { SheetMachineState } from "../state";
import type {
  SheetMachineEffect,
  SheetMachinePointerArm,
  SheetMachineResult,
} from "../types";

export function reducePointerArm(
  state: SheetMachineState,
  event: SheetMachinePointerArm,
): SheetMachineResult {
  if (state.phase === "dragging") {
    return { state, effects: [] };
  }

  const effects: SheetMachineEffect[] = [{ type: "cancelScrollMomentum" }];
  let baseState = state;

  if (state.phase === "settling") {
    const settled = completeSettleTransition(
      {
        ...clearScrollSamples(state),
        gesture: null,
        pointerArm: null,
      },
      [{ type: "cancelScrollMomentum" }],
    );
    baseState = settled.state;
    effects.length = 0;
    effects.push(...settled.effects);
  }

  const arm = createPointerArm({
    pointerId: event.pointerId,
    clientY: event.clientY,
    scrollTopPx: event.scrollTopPx,
    surface: event.surface,
    route: event.route,
  });

  const gesture =
    event.route === "sheet" ? createGestureForArm(baseState, arm) : null;

  return {
    state: {
      ...clearScrollSamples(baseState),
      phase: "idle",
      gesture,
      pointerArm: arm,
    },
    effects,
  };
}
