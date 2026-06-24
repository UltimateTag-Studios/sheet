import { SCROLL_TOP_EPSILON_PX } from "../../layout/scroll-mode";
import type {
  SheetGesture,
  SheetGestureIntent,
  SheetMachineState,
  SheetPointerArm,
  SheetPointerSurface,
} from "../state";
import { scrollEnabled } from "./height";

export function createGesture(args: {
  pointerId: number;
  clientY: number;
  startHeightPx: number;
  intent: SheetGestureIntent;
  surface: SheetPointerSurface;
}): SheetGesture {
  return {
    pointerId: args.pointerId,
    startClientY: args.clientY,
    startHeightPx: args.startHeightPx,
    intent: args.intent,
    surface: args.surface,
    lastClientY: args.clientY,
  };
}

export function reanchorSheetGesture(
  gesture: SheetGesture,
  clientY: number,
  visibleHeightPx: number,
): SheetGesture {
  return {
    ...gesture,
    intent: "sheet",
    startClientY: clientY,
    startHeightPx: visibleHeightPx,
    lastClientY: clientY,
  };
}

export function beginScrollGesture(
  gesture: SheetGesture,
  clientY: number,
): SheetGesture {
  return {
    ...gesture,
    intent: "scroll",
    lastClientY: clientY,
  };
}

export function createGestureForArm(
  state: SheetMachineState,
  arm: SheetPointerArm,
): SheetGesture {
  if (arm.surface === "chrome") {
    return createGesture({
      pointerId: arm.pointerId,
      clientY: arm.startClientY,
      startHeightPx: state.visibleHeightPx,
      intent: "sheet",
      surface: "chrome",
    });
  }

  const canScroll = scrollEnabled(state);
  const intent: SheetGestureIntent = canScroll
    ? arm.scrollTopPx <= SCROLL_TOP_EPSILON_PX
      ? "pendingAxis"
      : "scroll"
    : "sheet";

  return createGesture({
    pointerId: arm.pointerId,
    clientY: arm.startClientY,
    startHeightPx: state.visibleHeightPx,
    intent,
    surface: "body",
  });
}
