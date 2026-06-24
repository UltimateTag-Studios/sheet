import { heightsMatchForSettle, type SheetSnap } from "../../layout/snap-math";
import { bodyScrollSyncEffect } from "../effects/body-scroll-sync";
import type { SheetMachineState } from "../state";
import type { SheetMachineEffect, SheetMachineResult } from "../types";
import { completeSettleTransition } from "./complete";

export function enterSettle(
  state: SheetMachineState,
  snap: SheetSnap,
  heightPx: number,
  effects: SheetMachineEffect[],
): SheetMachineResult {
  const settleEffects =
    snap === "full"
      ? effects
      : [...effects, { type: "resetBodyScroll" as const }];
  const settleEpoch = state.settleEpoch + 1;
  const settlingState: SheetMachineState = {
    ...state,
    phase: "settling",
    restingSnap: snap,
    visibleHeightPx: heightPx,
    settleEpoch,
    gesture: null,
    pointerArm: null,
    scrollPointerSamples: [],
  };

  if (heightsMatchForSettle(heightPx, state.visibleHeightPx)) {
    return completeSettleTransition(settlingState, settleEffects);
  }

  return {
    state: settlingState,
    effects: [
      ...settleEffects,
      { type: "syncSettleFrame", heightPx, settleEpoch },
      { type: "notifyLayoutFrame" },
      bodyScrollSyncEffect(settlingState),
    ],
  };
}
