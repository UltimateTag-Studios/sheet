import {
  computeScrollReleaseVelocityPxPerMs,
  shouldStartScrollMomentum,
} from "../../hooks/sheet-body-scroll-momentum";
import type { SheetMachineState } from "../state";
import type { SheetMachineEffect } from "../types";

export function scrollMomentumEffects(
  state: SheetMachineState,
): SheetMachineEffect[] {
  const velocityPxPerMs = computeScrollReleaseVelocityPxPerMs(
    state.scrollPointerSamples,
  );
  if (!shouldStartScrollMomentum(velocityPxPerMs)) {
    return [];
  }
  return [{ type: "startScrollMomentum", velocityPxPerMs }];
}
