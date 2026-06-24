import { bodyScrollSyncEffect } from "../effects/body-scroll-sync";
import { idleHeightForRestingSnap } from "../helpers/height";
import type { SheetMachineState } from "../state";
import type { SheetMachineEffect, SheetMachineResult } from "../types";

export function settleCompleteEffects(
  state: SheetMachineState,
): SheetMachineEffect[] {
  return [
    { type: "syncIdleFrame", suppressTransition: true },
    {
      type: "notifySnapSettled",
      snap: state.restingSnap,
      settleEpoch: state.settleEpoch,
    },
    { type: "notifyLayoutFrame" },
    bodyScrollSyncEffect(state),
  ];
}

export function completeSettleTransition(
  settlingState: SheetMachineState,
  priorEffects: SheetMachineEffect[],
): SheetMachineResult {
  const idleState: SheetMachineState = {
    ...settlingState,
    phase: "idle",
    visibleHeightPx: idleHeightForRestingSnap(settlingState),
  };
  return {
    state: idleState,
    effects: [...priorEffects, ...settleCompleteEffects(idleState)],
  };
}
