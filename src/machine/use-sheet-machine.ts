import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { sheetDebugLog } from "../debug/sheet-debug";
import type { SheetSnap } from "../layout/snap-math";
import {
  measureBootstrapEffects,
  reduceSheetMachine,
  type SheetMachineEffect,
  type SheetMachineEvent,
  type SheetMachineResult,
} from "./reduce";
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
  debug?: boolean;
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
      settleEpoch: 0,
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
  if (event.type === "measure" && previous === next) {
    return false;
  }

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
  debug = false,
}: UseSheetMachineOptions): {
  state: SheetMachineState | null;
  stateRef: RefObject<SheetMachineState | null>;
  isReady: boolean;
  dispatch: SheetMachineDispatch;
  readPhase: () => SheetPhase | null;
} {
  const runEffectRef = useRef(runEffect);
  runEffectRef.current = runEffect;

  const debugRef = useRef(debug);
  debugRef.current = debug;

  const restingSnapRef = useRef(restingSnap);
  restingSnapRef.current = restingSnap;

  const previousControlledSnapRef = useRef<SheetSnap | undefined>(undefined);
  const deferredControlledSnapRef = useRef<SheetSnap | null>(null);

  const [state, setState] = useState<SheetMachineState | null>(null);
  const stateRef = useRef<SheetMachineState | null>(null);
  const dispatchRef = useRef<SheetMachineDispatch | null>(null);

  const dispatch = useCallback(
    (event: SheetMachineEvent): SheetMachineResult => {
      if (stateRef.current === null) {
        if (event.type !== "measure") {
          return ignoredGestureResult(restingSnapRef.current);
        }

        const initial = bootstrapFromMeasure(restingSnapRef.current, event);
        stateRef.current = initial;
        setState(initial);
        const bootstrapEffects = measureBootstrapEffects(initial, event);
        applyEffects(bootstrapEffects, (effect) =>
          runEffectRef.current(effect),
        );
        return { state: initial, effects: bootstrapEffects };
      }

      const previous = stateRef.current;
      const previousPhase = previous.phase;
      const result = reduceSheetMachine(previous, event);
      stateRef.current = result.state;
      applyEffects(result.effects, (effect) => runEffectRef.current(effect));
      if (shouldSyncReactState(event, previous, result.state)) {
        setState(result.state);
      }

      if (previousPhase === "dragging" && result.state.phase !== "dragging") {
        const deferred = deferredControlledSnapRef.current;
        if (deferred !== null) {
          deferredControlledSnapRef.current = null;
          const current = stateRef.current;
          if (
            current &&
            current.phase !== "dragging" &&
            current.restingSnap !== deferred
          ) {
            sheetDebugLog(debugRef.current, "controlled setSnap after drag", {
              snap: deferred,
            });
            dispatchRef.current?.({
              type: "setSnap",
              snap: deferred,
              source: "controlled",
            });
          }
        }
      }

      return result;
    },
    [],
  );

  dispatchRef.current = dispatch;

  useEffect(() => {
    if (controlledSnap === undefined || stateRef.current === null) {
      return;
    }
    const current = stateRef.current;

    const controlledSnapChanged =
      previousControlledSnapRef.current !== controlledSnap;
    previousControlledSnapRef.current = controlledSnap;

    if (current.phase === "dragging") {
      if (controlledSnapChanged && current.restingSnap !== controlledSnap) {
        deferredControlledSnapRef.current = controlledSnap;
        sheetDebugLog(
          debugRef.current,
          "controlled snap deferred during drag",
          {
            controlledSnap,
          },
        );
      }
      return;
    }

    if (!controlledSnapChanged) {
      return;
    }

    if (current.restingSnap === controlledSnap) {
      return;
    }

    sheetDebugLog(debugRef.current, "controlled setSnap", {
      snap: controlledSnap,
      phase: current.phase,
    });
    dispatch({ type: "setSnap", snap: controlledSnap, source: "controlled" });
  }, [controlledSnap, dispatch]);

  return {
    state,
    stateRef: stateRef as RefObject<SheetMachineState | null>,
    isReady: state !== null,
    dispatch,
    readPhase: () => stateRef.current?.phase ?? null,
  };
}
