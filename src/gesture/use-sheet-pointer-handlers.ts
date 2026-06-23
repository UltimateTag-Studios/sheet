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

type PointerTracking = {
  move: (event: PointerEvent) => void;
  up: (event: PointerEvent) => void;
};

type PointerSession = {
  pointerId: number;
  tapTarget: EventTarget;
  startClientY: number;
  scrollTopPx: number;
  surface: SheetPointerSurface;
  committed: boolean;
  hadEffect: boolean;
  tracking: PointerTracking;
};

const POINTER_UP_LISTENER_OPTS: AddEventListenerOptions = { capture: true };

function detachDocumentTracking(tracking: PointerTracking): void {
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
}

function attachDocumentTracking(tracking: PointerTracking): void {
  document.addEventListener("pointermove", tracking.move);
  document.addEventListener("pointerup", tracking.up, POINTER_UP_LISTENER_OPTS);
  document.addEventListener(
    "pointercancel",
    tracking.up,
    POINTER_UP_LISTENER_OPTS,
  );
}

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
  const sessionRef = useRef<PointerSession | null>(null);
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

  const endPointerSession = useCallback(() => {
    const session = sessionRef.current;
    if (session) {
      detachDocumentTracking(session.tracking);
    }
    sessionRef.current = null;
  }, []);

  const applyMoveResult = useCallback(
    (event: PointerEvent, result: SheetMachineResult) => {
      const session = sessionRef.current;
      if (!session) {
        return;
      }

      const intent = result.state.gesture?.intent;
      const scrollDeltaPx = result.bodyScrollDeltaPx ?? 0;

      if (scrollDeltaPx !== 0) {
        applyBodyScrollDeltaRef.current(scrollDeltaPx);
        session.hadEffect = true;
      } else if (visibleHeightMovedFromRestingSnap(result.state)) {
        session.hadEffect = true;
      }

      if (intent === "scroll") {
        scrollMomentumRef.current.recordScrollPointerSample(event.clientY);
      } else if (intent === "sheet") {
        scrollMomentumRef.current.clearScrollPointerTracking();
      }

      if (
        result.state.phase === "dragging" &&
        (intent === "sheet" || intent === "scroll") &&
        session.hadEffect
      ) {
        event.preventDefault();
      }
    },
    [],
  );

  const commitPendingGesture = useCallback(
    (event: PointerEvent): boolean => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== event.pointerId) {
        return false;
      }

      const downResult = dispatchRef.current({
        type: "pointerDown",
        pointerId: session.pointerId,
        clientY: session.startClientY,
        scrollTopPx: session.scrollTopPx,
        surface: session.surface,
      });

      if (downResult.state.gesture === null) {
        endPointerSession();
        return false;
      }

      session.committed = true;

      const moveResult = dispatchRef.current({
        type: "pointerMove",
        pointerId: event.pointerId,
        clientY: event.clientY,
        scrollTopPx: readScrollTopRef.current(),
      });

      applyMoveResult(event, moveResult);
      return true;
    },
    [applyMoveResult, endPointerSession],
  );

  const finishPointer = useCallback(
    (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session) {
        return;
      }

      const { hadEffect, tapTarget, committed: wasCommitted } = session;

      event.preventDefault();

      if (wasCommitted) {
        dispatchRef.current({
          type: "pointerUp",
          pointerId: event.pointerId,
        });
        scrollMomentumRef.current.releaseScrollMomentum();
      }

      endPointerSession();

      if (!hadEffect) {
        activatePointerDownTarget(tapTarget);
      }
    },
    [endPointerSession],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || session.pointerId !== event.pointerId) {
        return;
      }

      if (!session.committed) {
        const deltaY = Math.abs(event.clientY - session.startClientY);
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
        endPointerSession();

        const move = (pointerEvent: PointerEvent) => {
          onPointerMove(pointerEvent);
        };
        const up = (pointerEvent: PointerEvent) => {
          finishPointer(pointerEvent);
        };
        const tracking = { move, up };

        attachDocumentTracking(tracking);
        sessionRef.current = {
          pointerId: event.pointerId,
          tapTarget: event.target,
          startClientY: event.clientY,
          scrollTopPx: readScrollTopRef.current(),
          surface,
          committed: false,
          hadEffect: false,
          tracking,
        };
      },
    [endPointerSession, finishPointer, onPointerMove],
  );

  useEffect(() => () => endPointerSession(), [endPointerSession]);

  return {
    onChromePointerDown: onPointerDown("chrome"),
    onBodyPointerDown: onPointerDown("body"),
  };
}
