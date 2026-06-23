import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";

import type {
  SheetMachineEvent,
  SheetMachineResult,
  SheetPhase,
  SheetPointerSurface,
} from "../machine/sheet-machine";
import { SHEET_AXIS_THRESHOLD_PX } from "../machine/sheet-machine";
import { activatePointerDownTarget } from "./activate-pointer-down-target";
import { visibleHeightMovedFromRestingSnap } from "./visible-height-moved-from-resting-snap";

export type SheetPointerHandlers = {
  onChromePointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onBodyPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
};

type PendingPointer = {
  pointerId: number;
  startClientY: number;
  scrollTopPx: number;
  surface: SheetPointerSurface;
};

type PointerTracking = {
  move: (event: PointerEvent) => void;
  up: (event: PointerEvent) => void;
};

const POINTER_UP_LISTENER_OPTS: AddEventListenerOptions = { capture: true };

/**
 * Tap vs drag on chrome and body:
 * 1. pointerdown (capture) — record press target, document listeners for move/up
 * 2. move past slop — commit sheet drag
 * 3. release without drag effect — preventDefault + click() the press target
 * 4. release after real drag — machine pointerUp; preventDefault when sheet/scroll moved
 */
export function useSheetPointerHandlers(
  dispatch: (event: SheetMachineEvent) => SheetMachineResult,
  readScrollTop: () => number,
  readMachinePhase: () => SheetPhase | null,
  applyBodyScrollDelta: (deltaPx: number) => void,
  scrollMomentum: {
    recordScrollPointerSample: (clientY: number) => void;
    releaseScrollMomentum: () => void;
    cancelScrollMomentum: () => void;
    clearScrollPointerTracking: () => void;
  },
): SheetPointerHandlers {
  const pendingRef = useRef<PendingPointer | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const tapTargetRef = useRef<EventTarget | null>(null);
  const committedRef = useRef(false);
  const gestureHadEffectRef = useRef(false);
  const trackingRef = useRef<PointerTracking | null>(null);
  const dispatchRef = useRef(dispatch);
  const readScrollTopRef = useRef(readScrollTop);
  const readMachinePhaseRef = useRef(readMachinePhase);
  const applyBodyScrollDeltaRef = useRef(applyBodyScrollDelta);
  const scrollMomentumRef = useRef(scrollMomentum);

  dispatchRef.current = dispatch;
  readScrollTopRef.current = readScrollTop;
  readMachinePhaseRef.current = readMachinePhase;
  applyBodyScrollDeltaRef.current = applyBodyScrollDelta;
  scrollMomentumRef.current = scrollMomentum;

  const removePointerTracking = useCallback(() => {
    const tracking = trackingRef.current;
    if (!tracking) {
      return;
    }

    document.removeEventListener("pointermove", tracking.move);
    document.removeEventListener(
      "pointerup",
      tracking.up,
      POINTER_UP_LISTENER_OPTS,
    );
    document.removeEventListener(
      "pointercancel",
      tracking.up,
      POINTER_UP_LISTENER_OPTS,
    );
    trackingRef.current = null;
  }, []);

  const resetPointerSession = useCallback(() => {
    removePointerTracking();
    pendingRef.current = null;
    tapTargetRef.current = null;
    activePointerIdRef.current = null;
    committedRef.current = false;
    gestureHadEffectRef.current = false;
  }, [removePointerTracking]);

  const applyMoveResult = useCallback(
    (event: PointerEvent, result: SheetMachineResult) => {
      const intent = result.state.gesture?.intent;
      const scrollDeltaPx = result.bodyScrollDeltaPx ?? 0;

      if (scrollDeltaPx !== 0) {
        applyBodyScrollDeltaRef.current(scrollDeltaPx);
        gestureHadEffectRef.current = true;
      } else if (visibleHeightMovedFromRestingSnap(result.state)) {
        gestureHadEffectRef.current = true;
      }

      if (intent === "scroll") {
        scrollMomentumRef.current.recordScrollPointerSample(event.clientY);
      } else if (intent === "sheet") {
        scrollMomentumRef.current.clearScrollPointerTracking();
      }

      if (
        result.state.phase === "dragging" &&
        (intent === "sheet" || intent === "scroll") &&
        gestureHadEffectRef.current
      ) {
        event.preventDefault();
      }
    },
    [],
  );

  const commitPendingGesture = useCallback(
    (event: PointerEvent): boolean => {
      const pending = pendingRef.current;
      if (!pending || pending.pointerId !== event.pointerId) {
        return false;
      }

      const downResult = dispatchRef.current({
        type: "pointerDown",
        pointerId: pending.pointerId,
        clientY: pending.startClientY,
        scrollTopPx: pending.scrollTopPx,
        surface: pending.surface,
      });

      if (downResult.state.gesture === null) {
        resetPointerSession();
        return false;
      }

      committedRef.current = true;
      pendingRef.current = null;

      const moveResult = dispatchRef.current({
        type: "pointerMove",
        pointerId: event.pointerId,
        clientY: event.clientY,
        scrollTopPx: readScrollTopRef.current(),
      });

      applyMoveResult(event, moveResult);
      return true;
    },
    [applyMoveResult, resetPointerSession],
  );

  const finishCommittedPointer = useCallback(
    (event: PointerEvent) => {
      if (!committedRef.current) {
        return;
      }

      const hadEffect = gestureHadEffectRef.current;
      const tapTarget = tapTargetRef.current;

      event.preventDefault();

      dispatchRef.current({
        type: "pointerUp",
        pointerId: event.pointerId,
      });
      scrollMomentumRef.current.releaseScrollMomentum();
      resetPointerSession();

      if (!hadEffect) {
        activatePointerDownTarget(tapTarget);
      }
    },
    [resetPointerSession],
  );

  const cancelPendingPointer = useCallback(
    (event: PointerEvent) => {
      if (committedRef.current) {
        return;
      }

      const tapTarget = tapTargetRef.current;
      event.preventDefault();
      resetPointerSession();
      activatePointerDownTarget(tapTarget);
    },
    [resetPointerSession],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      if (!committedRef.current) {
        const pending = pendingRef.current;
        if (!pending) {
          return;
        }

        const deltaY = Math.abs(event.clientY - pending.startClientY);
        if (deltaY < SHEET_AXIS_THRESHOLD_PX) {
          return;
        }

        commitPendingGesture(event);
        return;
      }

      const result = dispatchRef.current({
        type: "pointerMove",
        pointerId: event.pointerId,
        clientY: event.clientY,
        scrollTopPx: readScrollTopRef.current(),
      });

      applyMoveResult(event, result);
    },
    [applyMoveResult, commitPendingGesture],
  );

  const onPointerDown = useCallback(
    (surface: SheetPointerSurface) =>
      (event: ReactPointerEvent<HTMLElement>) => {
        if (event.button !== 0) {
          return;
        }

        const phase = readMachinePhaseRef.current();
        if (phase === "dragging") {
          return;
        }

        scrollMomentumRef.current.cancelScrollMomentum();
        scrollMomentumRef.current.clearScrollPointerTracking();

        pendingRef.current = {
          pointerId: event.pointerId,
          startClientY: event.clientY,
          scrollTopPx: readScrollTopRef.current(),
          surface,
        };
        tapTargetRef.current = event.target;
        activePointerIdRef.current = event.pointerId;
        committedRef.current = false;
        gestureHadEffectRef.current = false;

        removePointerTracking();

        const move = (pointerEvent: PointerEvent) => {
          onPointerMove(pointerEvent);
        };
        const up = (pointerEvent: PointerEvent) => {
          if (committedRef.current) {
            finishCommittedPointer(pointerEvent);
            return;
          }
          cancelPendingPointer(pointerEvent);
        };

        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", up, POINTER_UP_LISTENER_OPTS);
        document.addEventListener(
          "pointercancel",
          up,
          POINTER_UP_LISTENER_OPTS,
        );
        trackingRef.current = { move, up };
      },
    [
      cancelPendingPointer,
      finishCommittedPointer,
      onPointerMove,
      removePointerTracking,
    ],
  );

  useEffect(() => () => removePointerTracking(), [removePointerTracking]);

  return {
    onChromePointerDown: onPointerDown("chrome"),
    onBodyPointerDown: onPointerDown("body"),
  };
}
