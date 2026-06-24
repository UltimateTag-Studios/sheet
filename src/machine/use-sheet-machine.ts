import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { SheetSnap } from "../layout/snap-math";
import {
  reduceSheetMachine,
  type SheetMachineEffect,
  type SheetMachineEvent,
  type SheetMachineResult,
} from "./machine";
import {
  createInitialSheetMachineState,
  type SheetMachineState,
  type SheetPhase,
} from "./state";

export type SheetMachineDispatch = (
  event: SheetMachineEvent,
) => SheetMachineResult;

export type SheetEffectRunner = (effect: SheetMachineEffect) => void;

export type UseSheetMachineOptions = {
  restingSnap: SheetSnap;
  controlledSnap?: SheetSnap;
  runEffect: SheetEffectRunner;
};

function applyEffects(
  effects: SheetMachineEffect[],
  runEffect: SheetEffectRunner,
) {
  for (const effect of effects) {
    runEffect(effect);
  }
}

function bootstrapFromMeasure(
  restingSnap: SheetSnap,
  event: Extract<SheetMachineEvent, { type: "measure" }>,
): SheetMachineState {
  return createInitialSheetMachineState({
    restingSnap,
    collapsedHeightPx: event.collapsedHeightPx,
    halfHeightPx: event.halfHeightPx,
    fullHeightPx: event.fullHeightPx,
  });
}

function ignoredGestureResult(restingSnap: SheetSnap): SheetMachineResult {
  return {
    state: {
      phase: "idle",
      visibleHeightPx: 0,
      restingSnap,
      gesture: null,
      pointerArm: null,
      scrollPointerSamples: [],
      collapsedHeightPx: 0,
      halfHeightPx: 0,
      fullHeightPx: 0,
    },
    effects: [],
  };
}

/**
 * Skip React re-renders on continuous drag moves — `stateRef` stays authoritative;
 * consumers that need live geometry use machine effects (`syncDragFrame`) instead.
 */
function shouldSyncReactState(
  event: SheetMachineEvent,
  previous: SheetMachineState,
  next: SheetMachineState,
): boolean {
  return !(
    event.type === "pointerMove" &&
    previous.phase === "dragging" &&
    next.phase === "dragging"
  );
}

export function useSheetMachine({
  restingSnap,
  controlledSnap,
  runEffect,
}: UseSheetMachineOptions): {
  state: SheetMachineState | null;
  stateRef: RefObject<SheetMachineState | null>;
  isReady: boolean;
  dispatch: SheetMachineDispatch;
  readPhase: () => SheetPhase | null;
} {
  const runEffectRef = useRef(runEffect);
  runEffectRef.current = runEffect;

  const restingSnapRef = useRef(restingSnap);
  restingSnapRef.current = restingSnap;

  const [state, setState] = useState<SheetMachineState | null>(null);
  const stateRef = useRef<SheetMachineState | null>(null);

  const dispatch = useCallback(
    (event: SheetMachineEvent): SheetMachineResult => {
      if (stateRef.current === null) {
        if (event.type !== "measure") {
          return ignoredGestureResult(restingSnapRef.current);
        }

        const initial = bootstrapFromMeasure(restingSnapRef.current, event);
        stateRef.current = initial;
        setState(initial);
        return { state: initial, effects: [] };
      }

      const previous = stateRef.current;
      const result = reduceSheetMachine(previous, event);
      stateRef.current = result.state;
      applyEffects(result.effects, (effect) => runEffectRef.current(effect));
      if (shouldSyncReactState(event, previous, result.state)) {
        setState(result.state);
      }

      return result;
    },
    [],
  );

  useEffect(() => {
    if (controlledSnap === undefined || stateRef.current === null) {
      return;
    }
    if (
      stateRef.current.phase === "dragging" ||
      stateRef.current.phase === "settling"
    ) {
      return;
    }
    if (stateRef.current.restingSnap === controlledSnap) {
      return;
    }
    dispatch({ type: "setSnap", snap: controlledSnap });
  }, [controlledSnap, dispatch]);

  return {
    state,
    stateRef: stateRef as RefObject<SheetMachineState | null>,
    isReady: state !== null,
    dispatch,
    readPhase: () => stateRef.current?.phase ?? null,
  };
}
