import {
  isVisibleHeightAtRestingSnap,
  nearestSnapHeight,
} from "../../layout/snap-math";
import { bodyScrollSyncEffect } from "../effects/body-scroll-sync";
import { scrollMomentumEffects } from "../effects/scroll-momentum";
import { enterSettle } from "../settle/enter";
import type { SheetMachineState } from "../state";
import type {
  SheetMachineEffect,
  SheetMachinePointerUp,
  SheetMachineResult,
} from "../types";

export function reducePointerUp(
  state: SheetMachineState,
  event: SheetMachinePointerUp,
): SheetMachineResult {
  const gesture = state.gesture;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return { state, effects: [] };
  }

  const hadEffect = state.pointerArm?.hadEffect ?? false;
  const clearArmState = (next: SheetMachineState): SheetMachineState => ({
    ...next,
    gesture: null,
    pointerArm: null,
    scrollPointerSamples: [],
  });

  if (state.phase === "idle") {
    return {
      state: clearArmState(state),
      effects: [],
    };
  }

  const isScrollRelease = gesture.intent !== "sheet";

  if (!isVisibleHeightAtRestingSnap(state)) {
    const { snap, heightPx } = nearestSnapHeight(
      state.visibleHeightPx,
      state.collapsedHeightPx,
      state.halfHeightPx,
      state.fullHeightPx,
    );

    const effects: SheetMachineEffect[] = [{ type: "notifyDragEnd" }];
    if (snap !== state.restingSnap) {
      effects.unshift({ type: "notifySnapChange", snap });
    }
    if (hadEffect) {
      effects.push({ type: "activatePostDragClickRepair" });
    }

    return enterSettle(
      clearArmState({
        ...state,
        gesture: null,
        pointerArm: null,
        scrollPointerSamples: [],
      }),
      snap,
      heightPx,
      effects,
    );
  }

  const effects: SheetMachineEffect[] = [{ type: "notifyDragEnd" }];
  if (isScrollRelease) {
    effects.push(...scrollMomentumEffects(state));
  }
  if (hadEffect) {
    effects.push({ type: "activatePostDragClickRepair" });
  }

  return {
    state: clearArmState({ ...state, phase: "idle" }),
    effects: [
      ...effects,
      { type: "notifyLayoutFrame" },
      bodyScrollSyncEffect({ ...state, phase: "idle" }),
    ],
  };
}
