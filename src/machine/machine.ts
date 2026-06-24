import {
  computeScrollReleaseVelocityPxPerMs,
  shouldStartScrollMomentum,
} from "../hooks/sheet-body-scroll-momentum";
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
  type ScrollPointerSample,
  SHEET_AXIS_THRESHOLD_PX,
  type SheetGesture,
  type SheetGestureIntent,
  type SheetMachineState,
  type SheetPointerArm,
  type SheetPointerRoute,
  type SheetPointerSurface,
} from "./state";

export type SheetMachinePointerArm = {
  type: "pointerArm";
  pointerId: number;
  clientY: number;
  scrollTopPx: number;
  surface: SheetPointerSurface;
  route: SheetPointerRoute;
};

export type SheetMachinePointerCommit = {
  type: "pointerCommit";
  pointerId: number;
  clientY: number;
  scrollTopPx: number;
  timeMs: number;
};

export type SheetMachinePointerMove = {
  type: "pointerMove";
  pointerId: number;
  clientY: number;
  scrollTopPx: number;
  timeMs: number;
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
  | SheetMachinePointerArm
  | SheetMachinePointerCommit
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
  | { type: "syncSettleFrame"; heightPx: number }
  | { type: "completeSettleImmediate" }
  | { type: "cancelScrollMomentum" }
  | { type: "startScrollMomentum"; velocityPxPerMs: number }
  | { type: "activatePostDragClickRepair" };

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
  return [...effects, { type: "syncSettleFrame", heightPx }];
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
    case "pointerArm":
      return reducePointerArm(state, event);
    case "pointerCommit":
      return reducePointerCommit(state, event);
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
    const nextVisibleHeightPx = state.visibleHeightPx;
    const heightsChanged =
      state.collapsedHeightPx !== event.collapsedHeightPx ||
      state.halfHeightPx !== event.halfHeightPx ||
      state.fullHeightPx !== event.fullHeightPx;
    if (!heightsChanged) {
      return { state, effects: [] };
    }
    return {
      state: {
        ...nextState,
        visibleHeightPx: nextVisibleHeightPx,
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
      pointerArm: null,
      scrollPointerSamples: [],
    },
    effects: settlingEffects(state, heightPx, effects),
  };
}

function createPointerArm(args: {
  pointerId: number;
  clientY: number;
  scrollTopPx: number;
  surface: SheetPointerSurface;
  route: SheetPointerRoute;
}): SheetPointerArm {
  return {
    pointerId: args.pointerId,
    startClientY: args.clientY,
    scrollTopPx: args.scrollTopPx,
    surface: args.surface,
    route: args.route,
    committed: false,
    hadEffect: false,
  };
}

function markPointerHadEffect(state: SheetMachineState): SheetMachineState {
  if (!state.pointerArm || state.pointerArm.hadEffect) {
    return state;
  }
  return {
    ...state,
    pointerArm: { ...state.pointerArm, hadEffect: true },
  };
}

function appendScrollSample(
  state: SheetMachineState,
  sample: ScrollPointerSample,
): SheetMachineState {
  const cutoffMs = sample.timeMs - 120;
  const scrollPointerSamples = [...state.scrollPointerSamples, sample].filter(
    (item) => item.timeMs >= cutoffMs,
  );
  return { ...state, scrollPointerSamples };
}

function clearScrollSamples(state: SheetMachineState): SheetMachineState {
  if (state.scrollPointerSamples.length === 0) {
    return state;
  }
  return { ...state, scrollPointerSamples: [] };
}

function createGestureForArm(
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

function scrollMomentumEffects(state: SheetMachineState): SheetMachineEffect[] {
  const velocityPxPerMs = computeScrollReleaseVelocityPxPerMs(
    state.scrollPointerSamples,
  );
  if (!shouldStartScrollMomentum(velocityPxPerMs)) {
    return [];
  }
  return [{ type: "startScrollMomentum", velocityPxPerMs }];
}

function reducePointerArm(
  state: SheetMachineState,
  event: SheetMachinePointerArm,
): SheetMachineResult {
  if (state.phase === "dragging") {
    return { state, effects: [] };
  }

  const effects: SheetMachineEffect[] = [{ type: "cancelScrollMomentum" }];
  let baseState = state;

  if (state.phase === "settling") {
    const heightPx = clampHeight(
      state,
      heightForSnap(
        state.restingSnap,
        state.collapsedHeightPx,
        state.halfHeightPx,
        state.fullHeightPx,
      ),
    );
    baseState = {
      ...clearScrollSamples(state),
      phase: "idle",
      visibleHeightPx: heightPx,
      gesture: null,
      pointerArm: null,
    };
    effects.unshift({ type: "completeSettleImmediate" });
  }

  const arm = createPointerArm({
    pointerId: event.pointerId,
    clientY: event.clientY,
    scrollTopPx: event.scrollTopPx,
    surface: event.surface,
    route: event.route,
  });

  const gesture =
    event.route === "sheet" ? createGestureForArm(baseState, arm) : null;

  return {
    state: {
      ...clearScrollSamples(baseState),
      phase: "idle",
      gesture,
      pointerArm: arm,
    },
    effects,
  };
}

function reducePointerCommit(
  state: SheetMachineState,
  event: SheetMachinePointerCommit,
): SheetMachineResult {
  const arm = state.pointerArm;
  if (!arm || arm.pointerId !== event.pointerId || arm.committed) {
    return { state, effects: [] };
  }

  const totalDeltaY = Math.abs(event.clientY - arm.startClientY);
  if (totalDeltaY < SHEET_AXIS_THRESHOLD_PX) {
    return { state, effects: [] };
  }

  let nextState: SheetMachineState = {
    ...state,
    pointerArm: { ...arm, committed: true },
  };

  if (arm.route === "watch") {
    const gesture = createGestureForArm(nextState, arm);
    nextState = { ...nextState, gesture };
  }

  if (nextState.gesture === null) {
    return { state, effects: [] };
  }

  return reducePointerMove(nextState, {
    type: "pointerMove",
    pointerId: event.pointerId,
    clientY: event.clientY,
    scrollTopPx: event.scrollTopPx,
    timeMs: event.timeMs,
  });
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

function finalizePointerMoveResult(
  _previous: SheetMachineState,
  event: SheetMachinePointerMove,
  result: SheetMachineResult,
): SheetMachineResult {
  let nextState = result.state;
  const intent = nextState.gesture?.intent;

  if (intent === "scroll") {
    nextState = appendScrollSample(nextState, {
      timeMs: event.timeMs,
      clientY: event.clientY,
    });
  } else if (intent === "sheet") {
    nextState = clearScrollSamples(nextState);
  }

  const scrolled = result.effects.some(
    (effect) => effect.type === "scrollBody" && effect.deltaPx !== 0,
  );
  if (scrolled || !isVisibleHeightAtRestingSnap(nextState)) {
    nextState = markPointerHadEffect(nextState);
  }

  return { state: nextState, effects: result.effects };
}

function reducePointerMove(
  state: SheetMachineState,
  event: SheetMachinePointerMove,
): SheetMachineResult {
  const gesture = state.gesture;
  if (!gesture || gesture.pointerId !== event.pointerId) {
    return { state, effects: [] };
  }

  let result: SheetMachineResult;
  if (state.phase === "idle") {
    result = reduceArmedMove(state, event, gesture);
  } else if (gesture.intent === "pendingAxis") {
    result = withDragFrameEffects(
      reducePendingAxisMove(state, event, gesture, []),
    );
  } else if (gesture.intent === "scroll") {
    result = withDragFrameEffects(reduceScrollMove(state, event, gesture, []));
  } else {
    result = withDragFrameEffects(reduceSheetMove(state, event, gesture, []));
  }

  return finalizePointerMoveResult(state, event, result);
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

  const hadEffect = state.pointerArm?.hadEffect ?? false;
  const clearArmState = (next: SheetMachineState): SheetMachineState => ({
    ...next,
    gesture: null,
    pointerArm: null,
    scrollPointerSamples: [],
  });

  if (state.phase === "idle") {
    return {
      state: clearArmState(state),
      effects: [],
    };
  }

  if (gesture.intent !== "sheet") {
    const effects: SheetMachineEffect[] = [
      { type: "notifyDragEnd" },
      ...scrollMomentumEffects(state),
    ];
    return {
      state: clearArmState({ ...state, phase: "idle" }),
      effects,
    };
  }

  if (isVisibleHeightAtRestingSnap(state)) {
    const effects: SheetMachineEffect[] = [{ type: "notifyDragEnd" }];
    if (hadEffect) {
      effects.push({ type: "activatePostDragClickRepair" });
    }
    return {
      state: clearArmState({ ...state, phase: "idle" }),
      effects,
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
  if (hadEffect) {
    effects.push({ type: "activatePostDragClickRepair" });
  }

  return {
    state: clearArmState({
      ...state,
      phase: "settling",
      restingSnap: snap,
      visibleHeightPx: heightPx,
    }),
    effects,
  };
}
