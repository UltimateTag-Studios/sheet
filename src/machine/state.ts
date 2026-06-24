import { heightForSnap, type SheetSnap } from "../layout/snap-math";

/**
 * Sheet gesture state machine.
 *
 * Body pointer intents: sheet (move height) | scroll (content delta) | pendingAxis (disambiguate at full + scroll top).
 * Chrome pointers always use sheet intent. One continuous drag can transition between intents.
 */
export type SheetPhase = "idle" | "dragging" | "settling";

export type SheetGestureIntent = "pendingAxis" | "sheet" | "scroll";

export type SheetPointerSurface = "chrome" | "body";

export type SheetGesture = {
  pointerId: number;
  startClientY: number;
  startHeightPx: number;
  intent: SheetGestureIntent;
  surface: SheetPointerSurface;
  lastClientY: number;
};

export type SheetMachineState = {
  phase: SheetPhase;
  visibleHeightPx: number;
  restingSnap: SheetSnap;
  gesture: SheetGesture | null;
  collapsedHeightPx: number;
  halfHeightPx: number;
  fullHeightPx: number;
};

export const SHEET_AXIS_THRESHOLD_PX = 8;

export function createInitialSheetMachineState(args: {
  restingSnap: SheetSnap;
  collapsedHeightPx: number;
  halfHeightPx: number;
  fullHeightPx: number;
}): SheetMachineState {
  return {
    phase: "idle",
    visibleHeightPx: heightForSnap(
      args.restingSnap,
      args.collapsedHeightPx,
      args.halfHeightPx,
      args.fullHeightPx,
    ),
    restingSnap: args.restingSnap,
    gesture: null,
    collapsedHeightPx: args.collapsedHeightPx,
    halfHeightPx: args.halfHeightPx,
    fullHeightPx: args.fullHeightPx,
  };
}
