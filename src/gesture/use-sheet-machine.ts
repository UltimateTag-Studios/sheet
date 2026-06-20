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
  collapsedHeightPx: number;
  halfHeightPx: number;
  fullHeightPx: number;
  onSnapChange?: (snap: SheetSnap) => void;
  onDragInteractionChange?: (isDragging: boolean) => void;
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

export function useSheetMachine({
  restingSnap,
  controlledSnap,
  collapsedHeightPx,
  halfHeightPx,
  fullHeightPx,
  onSnapChange,
  onDragInteractionChange,
}: UseSheetMachineOptions): {
  state: SheetMachineState;
  dispatch: (event: SheetMachineEvent) => SheetMachineResult;
} {
  const callbacksRef = useRef({ onSnapChange, onDragInteractionChange });
  callbacksRef.current = { onSnapChange, onDragInteractionChange };

  const [state, setState] = useState<SheetMachineState>(() =>
    createInitialSheetMachineState({
      restingSnap,
      collapsedHeightPx,
      halfHeightPx,
      fullHeightPx,
    }),
  );

  const stateRef = useRef(state);
  stateRef.current = state;

  const dispatch = useCallback(
    (event: SheetMachineEvent): SheetMachineResult => {
      const result = reduceSheetMachine(stateRef.current, event);
      applyEffects(result.effects, callbacksRef.current);
      stateRef.current = result.state;
      setState(result.state);
      return result;
    },
    [],
  );

  useEffect(() => {
    dispatch({
      type: "measure",
      collapsedHeightPx,
      halfHeightPx,
      fullHeightPx,
    });
  }, [collapsedHeightPx, halfHeightPx, fullHeightPx, dispatch]);

  useEffect(() => {
    if (controlledSnap === undefined) {
      return;
    }
    if (stateRef.current.phase === "dragging") {
      return;
    }
    if (stateRef.current.restingSnap === controlledSnap) {
      return;
    }
    dispatch({ type: "setSnap", snap: controlledSnap });
  }, [controlledSnap, dispatch]);

  return { state, dispatch };
}
