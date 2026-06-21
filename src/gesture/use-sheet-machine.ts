import { useCallback, useEffect, useRef, useState } from "react";

import type { SheetSnap } from "../layout/snap-math";
import {
  createInitialSheetMachineState,
  reduceSheetMachine,
  type SheetMachineEvent,
  type SheetMachineResult,
  type SheetMachineState,
} from "../machine/sheet-machine";

export type UseSheetMachineOptions = {
  restingSnap: SheetSnap;
  controlledSnap?: SheetSnap;
  onSnapChange?: (snap: SheetSnap) => void;
  onDragInteractionChange?: (isDragging: boolean) => void;
  /** Called after every dispatch — used for direct DOM updates during drag. */
  onResult?: (event: SheetMachineEvent, result: SheetMachineResult) => void;
};

function applyEffects(
  effects: SheetMachineResult["effects"],
  callbacks: {
    onSnapChange?: (snap: SheetSnap) => void;
    onDragInteractionChange?: (isDragging: boolean) => void;
  },
) {
  for (const effect of effects) {
    if (effect.type === "notifySnapChange") {
      callbacks.onSnapChange?.(effect.snap);
    }
    if (effect.type === "notifyDragStart") {
      callbacks.onDragInteractionChange?.(true);
    }
    if (effect.type === "notifyDragEnd") {
      callbacks.onDragInteractionChange?.(false);
    }
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
      collapsedHeightPx: 0,
      halfHeightPx: 0,
      fullHeightPx: 0,
    },
    effects: [],
  };
}

export function useSheetMachine({
  restingSnap,
  controlledSnap,
  onSnapChange,
  onDragInteractionChange,
  onResult,
}: UseSheetMachineOptions): {
  state: SheetMachineState | null;
  isReady: boolean;
  dispatch: (event: SheetMachineEvent) => SheetMachineResult;
} {
  const callbacksRef = useRef({ onSnapChange, onDragInteractionChange });
  callbacksRef.current = { onSnapChange, onDragInteractionChange };

  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

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
        onResultRef.current?.(event, { state: initial, effects: [] });
        setState(initial);
        return { state: initial, effects: [] };
      }

      const result = reduceSheetMachine(stateRef.current, event);
      applyEffects(result.effects, callbacksRef.current);
      stateRef.current = result.state;
      onResultRef.current?.(event, result);
      setState(result.state);

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

  return { state, isReady: state !== null, dispatch };
}
