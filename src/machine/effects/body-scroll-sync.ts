import { bodyScrollEnabledFromState } from "../../layout/scroll-mode";
import type { SheetMachineState } from "../state";
import type { SheetMachineEffect } from "../types";

export function bodyScrollSyncEffect(
  state: SheetMachineState,
): SheetMachineEffect {
  return {
    type: "syncBodyScrollEnabled",
    enabled: bodyScrollEnabledFromState({
      phase: state.phase,
      restingSnap: state.restingSnap,
      visibleHeightPx: state.visibleHeightPx,
      fullHeightPx: state.fullHeightPx,
    }),
  };
}
