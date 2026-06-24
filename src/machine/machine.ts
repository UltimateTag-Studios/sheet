import {
  canBodyScroll,
  FULL_HEIGHT_EPSILON_PX,
  SCROLL_TOP_EPSILON_PX,
} from "../layout/scroll-mode";
import {
  heightForSnap,
  isVisibleHeightAtRestingSnap,
  nearestSnapHeight,
  type SheetSnap,
  snapHeightFromPanDelta,
} from "../layout/snap-math";
import {
  SHEET_AXIS_THRESHOLD_PX,
  type SheetGesture,
  type SheetGestureIntent,
  type SheetMachineState,
  type SheetPointerSurface,
} from "./state";

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
  | { type: "notifyDragEnd" }
  /** Positive values scroll content down (increase scrollTop). */
  | { type: "scrollBody"; deltaPx: number }
  | {
      type: "syncDragFrame";
      heightPx: number;
      bodyScrollEnabled: boolean;
    }
  | { type: "completeSettleImmediate" };

export type SheetMachineResult = {
  state: SheetMachineState;
  effects: SheetMachineEffect[];
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

function bodyScrollEnabled(state: SheetMachineState): boolean {
  return canBodyScroll({
    sheetSnap: state.restingSnap,
    visibleHeightPx: state.visibleHeightPx,
    fullHeightPx: state.fullHeightPx,
    isDragging: true,
  });
}

function withDragFrameEffects(result: SheetMachineResult): SheetMachineResult {
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
        bodyScrollEnabled: bodyScrollEnabled(result.state),
      },
    ],
  };
}

function settlingEffects(
  state: SheetMachineState,
  heightPx: number,
  effects: SheetMachineEffect[],
): SheetMachineEffect[] {
  if (Math.round(heightPx) === Math.round(state.visibleHeightPx)) {
    return [...effects, { type: "completeSettleImmediate" }];
  }
  return effects;
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
      return {
        state: {
          ...state,
          phase: "idle",
          visibleHeightPx: clampHeight(
            state,
            heightForSnap(
              state.restingSnap,
              state.collapsedHeightPx,
              state.halfHeightPx,
              state.fullHeightPx,
            ),
          ),
        },
        effects: [],
      };
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

  if (state.phase === "settling") {
    return {
      state: {
        ...nextState,
        visibleHeightPx: clampHeight(
          nextState,
          heightForSnap(
            state.restingSnap,
            event.collapsedHeightPx,
            event.halfHeightPx,
            event.fullHeightPx,
          ),
        ),
      },
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
    effects: settlingEffects(state, heightPx, effects),
  };
}

function reducePointerDown(
  state: SheetMachineState,
  event: SheetMachinePointerDown,
): SheetMachineResult {
  if (state.phase === "dragging" || state.phase === "settling") {
    return { state, effects: [] };
  }

  if (event.surface === "chrome") {
    const gesture = createGesture({
      pointerId: event.pointerId,
      clientY: event.clientY,
      startHeightPx: state.visibleHeightPx,
      intent: "sheet",
      surface: "chrome",
    });

    return {
      state: { ...state, phase: "idle", gesture },
      effects: [],
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
  });

  return {
    state: { ...state, phase: "idle", gesture },
    effects: [],
  };
}

function reduceArmedMove(
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
    return withDragFrameEffects(
      reducePendingAxisMove(draggingState, event, gesture, effects),
    );
  }

  if (gesture.intent === "scroll") {
    return withDragFrameEffects(
      reduceScrollMove(draggingState, event, gesture, effects),
    );
  }

  effects.push({ type: "notifyDragStart" });
  return withDragFrameEffects(
    reduceSheetMove(draggingState, event, gesture, effects),
  );
}

function reducePointerMove(
  state: SheetMachineState,
  event: SheetMachinePointerMove,
): SheetMachineResult {
  const gesture = state.gesture;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return { state, effects: [] };
  }

  if (state.phase === "idle") {
    return reduceArmedMove(state, event, gesture);
  }

  const effects: SheetMachineEffect[] = [];

  if (gesture.intent === "pendingAxis") {
    return withDragFrameEffects(
      reducePendingAxisMove(state, event, gesture, effects),
    );
  }

  if (gesture.intent === "scroll") {
    return withDragFrameEffects(
      reduceScrollMove(state, event, gesture, effects),
    );
  }

  return withDragFrameEffects(reduceSheetMove(state, event, gesture, effects));
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
    const scrollEffects =
      excessUp > 0
        ? [...effects, { type: "scrollBody" as const, deltaPx: excessUp }]
        : effects;

    return {
      state: {
        ...state,
        visibleHeightPx: state.fullHeightPx,
        gesture: beginScrollGesture(gesture, event.clientY),
      },
      effects: scrollEffects,
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
    effects: [...effects, { type: "scrollBody", deltaPx: -deltaY }],
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

  if (isVisibleHeightAtRestingSnap(state)) {
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

  const effects: SheetMachineEffect[] = settlingEffects(state, heightPx, [
    { type: "notifyDragEnd" },
  ]);
  if (snap !== state.restingSnap) {
    effects.unshift({ type: "notifySnapChange", snap });
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
