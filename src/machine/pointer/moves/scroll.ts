import { SCROLL_TOP_EPSILON_PX } from "../../../layout/scroll-mode";
import { reanchorSheetGesture } from "../../helpers/gesture";
import { clampHeight } from "../../helpers/height";
import type { SheetGesture, SheetMachineState } from "../../state";
import type {
  SheetMachineEffect,
  SheetMachinePointerMove,
  SheetMachineResult,
} from "../../types";

export function reduceScrollMove(
  state: SheetMachineState,
  event: SheetMachinePointerMove,
  gesture: SheetGesture,
  effects: SheetMachineEffect[],
): SheetMachineResult {
  const deltaY = event.clientY - gesture.lastClientY;
  const atScrollTop = event.scrollTopPx <= SCROLL_TOP_EPSILON_PX;

  if (atScrollTop && deltaY > 0) {
    const nextHeight = clampHeight(state, state.visibleHeightPx - deltaY);
    effects.push({ type: "notifyDragStart" });
    return {
      state: {
        ...state,
        visibleHeightPx: nextHeight,
        gesture: reanchorSheetGesture(gesture, event.clientY, nextHeight),
      },
      effects,
    };
  }

  return {
    state: {
      ...state,
      gesture: { ...gesture, lastClientY: event.clientY },
    },
    effects: [...effects, { type: "scrollBody", deltaPx: -deltaY }],
  };
}
