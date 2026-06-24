import type { SheetMachineState } from "../state";
import type { SheetMachineEffect, SheetMachineMeasure } from "../types";
import { bodyScrollSyncEffect } from "./body-scroll-sync";

export function measureHeightsChanged(
  state: SheetMachineState,
  event: SheetMachineMeasure,
): boolean {
  return (
    state.collapsedHeightPx !== event.collapsedHeightPx ||
    state.halfHeightPx !== event.halfHeightPx ||
    state.fullHeightPx !== event.fullHeightPx
  );
}

export function notifySnapHeightsChangeEffect(
  event: SheetMachineMeasure,
): SheetMachineEffect {
  return {
    type: "notifySnapHeightsChange",
    collapsedHeightPx: event.collapsedHeightPx,
    halfHeightPx: event.halfHeightPx,
    fullHeightPx: event.fullHeightPx,
  };
}

export function measureBootstrapEffects(
  state: SheetMachineState,
  event: SheetMachineMeasure,
): SheetMachineEffect[] {
  return [
    notifySnapHeightsChangeEffect(event),
    bodyScrollSyncEffect(state),
    { type: "notifyLayoutFrame" },
  ];
}
