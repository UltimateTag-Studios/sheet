import { snapHeightFromPanDelta } from "../../../layout/snap-math";
import { beginScrollGesture } from "../../helpers/gesture";
import { clampHeight, scrollEnabled } from "../../helpers/height";
import type { SheetGesture, SheetMachineState } from "../../state";
import type {
  SheetMachineEffect,
  SheetMachinePointerMove,
  SheetMachineResult,
} from "../../types";

export function reduceSheetMove(
  state: SheetMachineState,
  event: SheetMachinePointerMove,
  gesture: SheetGesture,
  effects: SheetMachineEffect[],
): SheetMachineResult {
  const nextHeight = clampHeight(
    state,
    snapHeightFromPanDelta({
      startHeightPx: gesture.startHeightPx,
      startClientY: gesture.startClientY,
      currentClientY: event.clientY,
      minHeightPx: state.collapsedHeightPx,
      maxHeightPx: state.fullHeightPx,
    }),
  );

  if (gesture.surface === "body" && scrollEnabled(state)) {
    const fingerUpPx = Math.max(0, gesture.lastClientY - event.clientY);
    const sheetGrowthPx = Math.max(0, nextHeight - state.visibleHeightPx);
    const scrollExcessPx = fingerUpPx - sheetGrowthPx;

    if (scrollExcessPx > 0) {
      return {
        state: {
          ...state,
          visibleHeightPx: state.fullHeightPx,
          gesture: beginScrollGesture(gesture, event.clientY),
        },
        effects: [...effects, { type: "scrollBody", deltaPx: scrollExcessPx }],
      };
    }
  }

  return {
    state: {
      ...state,
      visibleHeightPx: nextHeight,
      gesture: { ...gesture, lastClientY: event.clientY },
    },
    effects,
  };
}
