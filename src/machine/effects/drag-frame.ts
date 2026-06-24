import { bodyScrollEnabledFromState } from "../../layout/scroll-mode";
import type { SheetMachineResult } from "../types";

export function withDragFrameEffects(
  result: SheetMachineResult,
): SheetMachineResult {
  if (result.state.phase !== "dragging") {
    return result;
  }

  return {
    state: result.state,
    effects: [
      ...result.effects,
      {
        type: "syncDragFrame",
        heightPx: result.state.visibleHeightPx,
        bodyScrollEnabled: bodyScrollEnabledFromState({
          phase: "dragging",
          restingSnap: result.state.restingSnap,
          visibleHeightPx: result.state.visibleHeightPx,
          fullHeightPx: result.state.fullHeightPx,
        }),
      },
      { type: "notifyLayoutFrame" },
    ],
  };
}
