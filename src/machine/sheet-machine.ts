import { FULL_HEIGHT_EPSILON_PX } from "../layout/scroll-mode";
import {
  heightForSnap,
  nearestSnapHeight,
  type SheetSnap,
  snapHeightFromPanDelta,
} from "../layout/snap-math";

export type SheetPhase = "idle" | "dragging" | "settling";

export type SheetGestureIntent = "pendingAxis" | "sheet" | "scroll";

export type SheetGesture = {
  pointerId: number;
  startClientY: number;
  startHeightPx: number;
  intent: SheetGestureIntent;
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

export type SheetMachinePointerDown = {
  type: "pointerDown";
  pointerId: number;
  clientY: number;
  scrollTopPx: number;
};

export type SheetMachinePointerMove = {
  type: "pointerMove";
  pointerId: number;
  clientY: number;
  scrollTopPx: number;
};

export type SheetMachinePointerUp = {
  type: "pointerUp";
  pointerId: number;
};

export type SheetMachineMeasure = {
  type: "measure";
  collapsedHeightPx: number;
  halfHeightPx: number;
  fullHeightPx: number;
};

export type SheetMachineSetSnap = {
  type: "setSnap";
  snap: SheetSnap;
};

export type SheetMachineSettleComplete = {
  type: "settleComplete";
};

export type SheetMachineEvent =
  | SheetMachinePointerDown
  | SheetMachinePointerMove
  | SheetMachinePointerUp
  | SheetMachineMeasure
  | SheetMachineSetSnap
  | SheetMachineSettleComplete;

export type SheetMachineEffect =
  | { type: "notifySnapChange"; snap: SheetSnap }
  | { type: "notifyDragStart" }
  | { type: "notifyDragEnd" };

export type SheetMachineResult = {
  state: SheetMachineState;
  effects: SheetMachineEffect[];
  /** When true, caller should not capture pointer — native scroll takes over. */
  releaseToScroll?: boolean;
};

function scrollEnabled(state: SheetMachineState): boolean {
  return state.visibleHeightPx >= state.fullHeightPx - FULL_HEIGHT_EPSILON_PX;
}

function clampHeight(state: SheetMachineState, heightPx: number): number {
  return Math.min(
    state.fullHeightPx,
    Math.max(state.collapsedHeightPx, heightPx),
  );
}

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

export function reduceSheetMachine(
  state: SheetMachineState,
  event: SheetMachineEvent,
): SheetMachineResult {
  switch (event.type) {
    case "measure":
      return reduceMeasure(state, event);
    case "setSnap":
      return reduceSetSnap(state, event);
    case "settleComplete":
      return { state: { ...state, phase: "idle" }, effects: [] };
    case "pointerDown":
      return reducePointerDown(state, event);
    case "pointerMove":
      return reducePointerMove(state, event);
    case "pointerUp":
      return reducePointerUp(state, event);
    default:
      return { state, effects: [] };
  }
}

function reduceMeasure(
  state: SheetMachineState,
  event: SheetMachineMeasure,
): SheetMachineResult {
  const measuredHeights = {
    collapsedHeightPx: event.collapsedHeightPx,
    halfHeightPx: event.halfHeightPx,
    fullHeightPx: event.fullHeightPx,
  };
  const nextHeight = clampHeight(
    { ...state, ...measuredHeights },
    heightForSnap(
      state.restingSnap,
      event.collapsedHeightPx,
      event.halfHeightPx,
      event.fullHeightPx,
    ),
  );

  if (state.phase !== "idle") {
    return {
      state: { ...state, ...measuredHeights },
      effects: [],
    };
  }

  return {
    state: { ...state, ...measuredHeights, visibleHeightPx: nextHeight },
    effects: [],
  };
}

function reduceSetSnap(
  state: SheetMachineState,
  event: SheetMachineSetSnap,
): SheetMachineResult {
  const heightPx = heightForSnap(
    event.snap,
    state.collapsedHeightPx,
    state.halfHeightPx,
    state.fullHeightPx,
  );
  const effects: SheetMachineEffect[] = [];
  if (event.snap !== state.restingSnap) {
    effects.push({ type: "notifySnapChange", snap: event.snap });
  }

  return {
    state: {
      ...state,
      phase: "settling",
      restingSnap: event.snap,
      visibleHeightPx: heightPx,
      gesture: null,
    },
    effects,
  };
}

function reducePointerDown(
  state: SheetMachineState,
  event: SheetMachinePointerDown,
): SheetMachineResult {
  if (state.phase === "dragging") {
    return { state, effects: [] };
  }

  const canScroll = scrollEnabled(state);
  if (canScroll && event.scrollTopPx > 1) {
    return { state, effects: [], releaseToScroll: true };
  }

  const gesture: SheetGesture = {
    pointerId: event.pointerId,
    startClientY: event.clientY,
    startHeightPx: state.visibleHeightPx,
    intent: canScroll ? "pendingAxis" : "sheet",
  };

  return {
    state: { ...state, phase: "dragging", gesture },
    effects: gesture.intent === "sheet" ? [{ type: "notifyDragStart" }] : [],
  };
}

function releaseToScrollResult(state: SheetMachineState): SheetMachineResult {
  return {
    state: { ...state, phase: "idle", gesture: null },
    effects: [{ type: "notifyDragEnd" }],
    releaseToScroll: true,
  };
}

function reducePointerMove(
  state: SheetMachineState,
  event: SheetMachinePointerMove,
): SheetMachineResult {
  let gesture = state.gesture;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return { state, effects: [] };
  }

  const effects: SheetMachineEffect[] = [];

  if (gesture.intent === "pendingAxis") {
    const deltaY = event.clientY - gesture.startClientY;
    if (Math.abs(deltaY) < SHEET_AXIS_THRESHOLD_PX) {
      return { state, effects: [] };
    }
    if (deltaY < 0) {
      return releaseToScrollResult(state);
    }
    gesture = { ...gesture, intent: "sheet" };
    effects.push({ type: "notifyDragStart" });
  }

  if (gesture.intent !== "sheet") {
    return { state, effects: [] };
  }

  if (
    scrollEnabled(state) &&
    event.scrollTopPx > 1 &&
    gesture.startHeightPx >= state.fullHeightPx - FULL_HEIGHT_EPSILON_PX
  ) {
    return releaseToScrollResult(state);
  }

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

  return {
    state: { ...state, visibleHeightPx: nextHeight, gesture },
    effects,
  };
}

function reducePointerUp(
  state: SheetMachineState,
  event: SheetMachinePointerUp,
): SheetMachineResult {
  const gesture = state.gesture;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return { state, effects: [] };
  }

  if (gesture.intent !== "sheet") {
    return {
      state: { ...state, phase: "idle", gesture: null },
      effects: [{ type: "notifyDragEnd" }],
    };
  }

  const { snap, heightPx } = nearestSnapHeight(
    state.visibleHeightPx,
    state.collapsedHeightPx,
    state.halfHeightPx,
    state.fullHeightPx,
  );

  const effects: SheetMachineEffect[] = [{ type: "notifyDragEnd" }];
  if (snap !== state.restingSnap) {
    effects.push({ type: "notifySnapChange", snap });
  }

  return {
    state: {
      ...state,
      phase: "settling",
      restingSnap: snap,
      visibleHeightPx: heightPx,
      gesture: null,
    },
    effects,
  };
}
