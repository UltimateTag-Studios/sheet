import {
  FULL_HEIGHT_EPSILON_PX,
  SCROLL_TOP_EPSILON_PX,
} from "../layout/scroll-mode";
import {
  heightForSnap,
  nearestSnapHeight,
  type SheetSnap,
  snapHeightFromPanDelta,
} from "../layout/snap-math";

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

export type SheetMachinePointerDown = {
  type: "pointerDown";
  pointerId: number;
  clientY: number;
  scrollTopPx: number;
  surface: SheetPointerSurface;
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
  /** Positive values scroll content down (increase scrollTop). */
  bodyScrollDeltaPx?: number;
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

function createGesture(args: {
  pointerId: number;
  clientY: number;
  startHeightPx: number;
  intent: SheetGestureIntent;
  surface: SheetPointerSurface;
  scrollTopPx: number;
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

function reanchorSheetGesture(
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

function beginScrollGesture(
  gesture: SheetGesture,
  clientY: number,
): SheetGesture {
  return {
    ...gesture,
    intent: "scroll",
    lastClientY: clientY,
  };
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
  const nextState = { ...state, ...measuredHeights };

  if (state.phase === "dragging") {
    return {
      state: nextState,
      effects: [],
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

  return {
    state: { ...nextState, visibleHeightPx: nextHeight },
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

  if (event.surface === "chrome") {
    const gesture = createGesture({
      pointerId: event.pointerId,
      clientY: event.clientY,
      startHeightPx: state.visibleHeightPx,
      intent: "sheet",
      surface: "chrome",
      scrollTopPx: event.scrollTopPx,
    });

    return {
      state: { ...state, phase: "dragging", gesture },
      effects: [{ type: "notifyDragStart" }],
    };
  }

  const canScroll = scrollEnabled(state);
  const intent: SheetGestureIntent = canScroll
    ? event.scrollTopPx <= SCROLL_TOP_EPSILON_PX
      ? "pendingAxis"
      : "scroll"
    : "sheet";

  const gesture = createGesture({
    pointerId: event.pointerId,
    clientY: event.clientY,
    startHeightPx: state.visibleHeightPx,
    intent,
    surface: "body",
    scrollTopPx: event.scrollTopPx,
  });

  return {
    state: { ...state, phase: "idle", gesture },
    effects: [],
  };
}

function reduceArmedBodyMove(
  state: SheetMachineState,
  event: SheetMachinePointerMove,
  gesture: SheetGesture,
): SheetMachineResult {
  const totalDeltaY = event.clientY - gesture.startClientY;
  if (Math.abs(totalDeltaY) < SHEET_AXIS_THRESHOLD_PX) {
    return { state, effects: [] };
  }

  const draggingState: SheetMachineState = {
    ...state,
    phase: "dragging",
  };
  const effects: SheetMachineEffect[] = [];

  if (gesture.intent === "pendingAxis") {
    return reducePendingAxisMove(draggingState, event, gesture, effects);
  }

  if (gesture.intent === "scroll") {
    return reduceScrollMove(draggingState, event, gesture, effects);
  }

  effects.push({ type: "notifyDragStart" });
  return reduceSheetMove(draggingState, event, gesture, effects);
}

function reducePointerMove(
  state: SheetMachineState,
  event: SheetMachinePointerMove,
): SheetMachineResult {
  const gesture = state.gesture;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return { state, effects: [] };
  }

  if (state.phase === "idle" && gesture.surface === "body") {
    return reduceArmedBodyMove(state, event, gesture);
  }

  const effects: SheetMachineEffect[] = [];

  if (gesture.intent === "pendingAxis") {
    return reducePendingAxisMove(state, event, gesture, effects);
  }

  if (gesture.intent === "scroll") {
    return reduceScrollMove(state, event, gesture, effects);
  }

  return reduceSheetMove(state, event, gesture, effects);
}

function reducePendingAxisMove(
  state: SheetMachineState,
  event: SheetMachinePointerMove,
  gesture: SheetGesture,
  effects: SheetMachineEffect[],
): SheetMachineResult {
  const totalDeltaY = event.clientY - gesture.startClientY;
  if (Math.abs(totalDeltaY) < SHEET_AXIS_THRESHOLD_PX) {
    return { state, effects: [] };
  }

  if (totalDeltaY < 0) {
    const excessUp = -totalDeltaY - SHEET_AXIS_THRESHOLD_PX;
    return {
      state: {
        ...state,
        visibleHeightPx: state.fullHeightPx,
        gesture: beginScrollGesture(gesture, event.clientY),
      },
      effects,
      bodyScrollDeltaPx: excessUp > 0 ? excessUp : undefined,
    };
  }

  const excessDown = totalDeltaY - SHEET_AXIS_THRESHOLD_PX;
  const nextHeight = clampHeight(state, state.fullHeightPx - excessDown);
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

function reduceScrollMove(
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
    effects,
    bodyScrollDeltaPx: -deltaY,
  };
}

function reduceSheetMove(
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
        effects,
        bodyScrollDeltaPx: scrollExcessPx,
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

function reducePointerUp(
  state: SheetMachineState,
  event: SheetMachinePointerUp,
): SheetMachineResult {
  const gesture = state.gesture;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return { state, effects: [] };
  }

  if (state.phase === "idle") {
    return {
      state: { ...state, gesture: null },
      effects: [],
    };
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
