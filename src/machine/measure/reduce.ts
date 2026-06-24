import { heightForSnap } from "../../layout/snap-math";
import { bodyScrollSyncEffect } from "../effects/body-scroll-sync";
import {
  measureHeightsChanged,
  notifySnapHeightsChangeEffect,
} from "../effects/measure-heights";
import { clampHeight } from "../helpers/height";
import type { SheetMachineState } from "../state";
import type {
  SheetMachineEffect,
  SheetMachineMeasure,
  SheetMachineResult,
} from "../types";

export function reduceMeasure(
  state: SheetMachineState,
  event: SheetMachineMeasure,
): SheetMachineResult {
  const measuredHeights = {
    collapsedHeightPx: event.collapsedHeightPx,
    halfHeightPx: event.halfHeightPx,
    fullHeightPx: event.fullHeightPx,
  };
  const nextState = { ...state, ...measuredHeights };

  const heightsChanged = measureHeightsChanged(state, event);

  if (state.phase === "dragging") {
    return {
      state: nextState,
      effects: heightsChanged ? [notifySnapHeightsChangeEffect(event)] : [],
    };
  }

  if (state.phase === "settling") {
    const nextVisibleHeightPx = state.visibleHeightPx;
    if (!heightsChanged) {
      return { state, effects: [] };
    }
    return {
      state: {
        ...nextState,
        visibleHeightPx: nextVisibleHeightPx,
      },
      effects: [notifySnapHeightsChangeEffect(event)],
    };
  }

  const nextHeight = clampHeight(
    nextState,
    heightForSnap(
      state.restingSnap,
      event.collapsedHeightPx,
      event.halfHeightPx,
      event.fullHeightPx,
    ),
  );

  const idleState = { ...nextState, visibleHeightPx: nextHeight };

  const effects: SheetMachineEffect[] = [
    bodyScrollSyncEffect(idleState),
    { type: "notifyLayoutFrame" },
  ];
  if (heightsChanged) {
    effects.unshift(notifySnapHeightsChangeEffect(event));
  }

  return {
    state: idleState,
    effects,
  };
}
