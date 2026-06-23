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

export type SheetPointerHandlers = {
  onChromePointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onBodyPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
};

type PendingPointer = {
  pointerId: number;
  startClientY: number;
  scrollTopPx: number;
  surface: SheetPointerSurface;
  tapTarget: EventTarget;
};

type PointerTracking = {
  move: (event: PointerEvent) => void;
  up: (event: PointerEvent) => void;
  moveOnDocument: boolean;
  upOnDocument: boolean;
  surfaceTarget: HTMLElement | null;
};

const POINTER_UP_LISTENER_OPTS: AddEventListenerOptions = { capture: true };

/**
 * Tap vs drag on chrome and body:
 * 1. pointerdown (capture) — record target, listen for move/up
 * 2. move past slop — commit sheet drag
 * 3. release without slop — preventDefault + click() the press target
 * 4. release after drag — machine pointerUp; preventDefault only if sheet/scroll moved
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
  const surfaceTargetRef = useRef<HTMLElement | null>(null);
  const committedRef = useRef(false);
  const gestureHadEffectRef = useRef(false);
  const gestureStartVisibleHeightRef = useRef<number | null>(null);
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

    if (tracking.moveOnDocument) {
      document.removeEventListener("pointermove", tracking.move);
    } else if (tracking.surfaceTarget) {
      tracking.surfaceTarget.removeEventListener("pointermove", tracking.move);
    }

    if (tracking.upOnDocument) {
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
    } else if (tracking.surfaceTarget) {
      tracking.surfaceTarget.removeEventListener(
        "pointerup",
        tracking.up,
        POINTER_UP_LISTENER_OPTS,
      );
      tracking.surfaceTarget.removeEventListener(
        "pointercancel",
        tracking.up,
        POINTER_UP_LISTENER_OPTS,
      );
    }

    trackingRef.current = null;
  }, []);

  const resetPointerSession = useCallback(() => {
    pendingRef.current = null;
    surfaceTargetRef.current = null;
    activePointerIdRef.current = null;
    committedRef.current = false;
    gestureHadEffectRef.current = false;
    gestureStartVisibleHeightRef.current = null;
    removePointerTracking();
  }, [removePointerTracking]);

  const promoteToDocumentPointerTracking = useCallback(() => {
    const tracking = trackingRef.current;
    const surfaceTarget = surfaceTargetRef.current;
    if (!tracking || !surfaceTarget) {
      return;
    }

    if (!tracking.moveOnDocument) {
      surfaceTarget.removeEventListener("pointermove", tracking.move);
      document.addEventListener("pointermove", tracking.move);
      tracking.moveOnDocument = true;
    }

    if (!tracking.upOnDocument) {
      surfaceTarget.removeEventListener(
        "pointerup",
        tracking.up,
        POINTER_UP_LISTENER_OPTS,
      );
      surfaceTarget.removeEventListener(
        "pointercancel",
        tracking.up,
        POINTER_UP_LISTENER_OPTS,
      );
      document.addEventListener(
        "pointerup",
        tracking.up,
        POINTER_UP_LISTENER_OPTS,
      );
      document.addEventListener(
        "pointercancel",
        tracking.up,
        POINTER_UP_LISTENER_OPTS,
      );
      tracking.upOnDocument = true;
      tracking.surfaceTarget = null;
    }
  }, []);

  const applyMoveResult = useCallback(
    (event: PointerEvent, result: SheetMachineResult) => {
      const intent = result.state.gesture?.intent;
      const scrollDeltaPx = result.bodyScrollDeltaPx ?? 0;
      const heightChanged =
        gestureStartVisibleHeightRef.current !== null &&
        result.state.visibleHeightPx !== gestureStartVisibleHeightRef.current;

      if (scrollDeltaPx !== 0) {
        applyBodyScrollDeltaRef.current(scrollDeltaPx);
        gestureHadEffectRef.current = true;
      } else if (heightChanged) {
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

      promoteToDocumentPointerTracking();

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

      gestureStartVisibleHeightRef.current = downResult.state.visibleHeightPx;
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
    [applyMoveResult, promoteToDocumentPointerTracking, resetPointerSession],
  );

  const finishCommittedPointer = useCallback(
    (event: PointerEvent) => {
      if (!committedRef.current) {
        return;
      }

      if (gestureHadEffectRef.current) {
        event.preventDefault();
      }

      dispatchRef.current({
        type: "pointerUp",
        pointerId: event.pointerId,
      });
      scrollMomentumRef.current.releaseScrollMomentum();
      resetPointerSession();
    },
    [resetPointerSession],
  );

  const cancelPendingPointer = useCallback(
    (event: PointerEvent) => {
      if (committedRef.current) {
        return;
      }

      const tapTarget = pendingRef.current?.tapTarget ?? null;
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
          tapTarget: event.target,
        };
        activePointerIdRef.current = event.pointerId;
        surfaceTargetRef.current = event.currentTarget;
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

        const surfaceTarget = event.currentTarget;
        surfaceTarget.addEventListener("pointermove", move);
        surfaceTarget.addEventListener(
          "pointerup",
          up,
          POINTER_UP_LISTENER_OPTS,
        );
        surfaceTarget.addEventListener(
          "pointercancel",
          up,
          POINTER_UP_LISTENER_OPTS,
        );
        trackingRef.current = {
          move,
          up,
          moveOnDocument: false,
          upOnDocument: false,
          surfaceTarget,
        };
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
