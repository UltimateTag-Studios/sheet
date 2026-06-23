import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";

import type {
  SheetMachineEvent,
  SheetMachineResult,
  SheetMachineState,
  SheetPhase,
  SheetPointerSurface,
} from "../machine/sheet-machine";
import { SHEET_AXIS_THRESHOLD_PX } from "../machine/sheet-machine";

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
  moveOnDocument: boolean;
  upOnDocument: boolean;
  surfaceTarget: HTMLElement | null;
};

function trySetPointerCapture(target: HTMLElement, pointerId: number): void {
  if (typeof target.setPointerCapture !== "function") {
    return;
  }

  try {
    target.setPointerCapture(pointerId);
  } catch {
    // Some test environments stub elements without full pointer capture support.
  }
}

function tryReleasePointerCapture(
  target: HTMLElement,
  pointerId: number,
): void {
  if (
    typeof target.hasPointerCapture !== "function" ||
    typeof target.releasePointerCapture !== "function" ||
    !target.hasPointerCapture(pointerId)
  ) {
    return;
  }

  try {
    target.releasePointerCapture(pointerId);
  } catch {
    // Ignore release failures during teardown.
  }
}

/** Unified sheet pointer routing for handle chrome and body surfaces. */
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
  const capturedPointerIdRef = useRef<number | null>(null);
  const captureTargetRef = useRef<HTMLElement | null>(null);
  const committedRef = useRef(false);
  const gestureHadEffectRef = useRef(false);
  const gestureStartVisibleHeightRef = useRef<number | null>(null);
  const draggingCaptureRef = useRef(false);
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
      document.removeEventListener("pointerup", tracking.up);
      document.removeEventListener("pointercancel", tracking.up);
    } else if (tracking.surfaceTarget) {
      tracking.surfaceTarget.removeEventListener("pointerup", tracking.up);
      tracking.surfaceTarget.removeEventListener("pointercancel", tracking.up);
    }

    trackingRef.current = null;
  }, []);

  const resetPointerSession = useCallback(
    (pointerId: number) => {
      const captureTarget = captureTargetRef.current;
      if (captureTarget) {
        tryReleasePointerCapture(captureTarget, pointerId);
      }
      pendingRef.current = null;
      captureTargetRef.current = null;
      capturedPointerIdRef.current = null;
      committedRef.current = false;
      gestureHadEffectRef.current = false;
      gestureStartVisibleHeightRef.current = null;
      draggingCaptureRef.current = false;
      removePointerTracking();
    },
    [removePointerTracking],
  );

  const promoteToDocumentPointerTracking = useCallback(() => {
    const tracking = trackingRef.current;
    const captureTarget = captureTargetRef.current;
    if (!tracking || !captureTarget) {
      return;
    }

    if (!tracking.moveOnDocument) {
      captureTarget.removeEventListener("pointermove", tracking.move);
      document.addEventListener("pointermove", tracking.move);
      tracking.moveOnDocument = true;
    }

    if (!tracking.upOnDocument) {
      captureTarget.removeEventListener("pointerup", tracking.up);
      captureTarget.removeEventListener("pointercancel", tracking.up);
      document.addEventListener("pointerup", tracking.up);
      document.addEventListener("pointercancel", tracking.up);
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

  const ensureDraggingCapture = useCallback(
    (event: PointerEvent, state: SheetMachineState) => {
      if (state.phase !== "dragging" || draggingCaptureRef.current) {
        return;
      }

      draggingCaptureRef.current = true;
      promoteToDocumentPointerTracking();
      const captureTarget = captureTargetRef.current;
      if (captureTarget) {
        trySetPointerCapture(captureTarget, event.pointerId);
      }
    },
    [promoteToDocumentPointerTracking],
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
        resetPointerSession(event.pointerId);
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

      ensureDraggingCapture(event, moveResult.state);
      applyMoveResult(event, moveResult);
      return true;
    },
    [
      applyMoveResult,
      ensureDraggingCapture,
      promoteToDocumentPointerTracking,
      resetPointerSession,
    ],
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
      resetPointerSession(event.pointerId);
    },
    [resetPointerSession],
  );

  const cancelPendingPointer = useCallback(
    (event: PointerEvent) => {
      if (committedRef.current) {
        return;
      }

      resetPointerSession(event.pointerId);
    },
    [resetPointerSession],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (capturedPointerIdRef.current !== event.pointerId) {
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

      ensureDraggingCapture(event, result.state);
      applyMoveResult(event, result);
    },
    [applyMoveResult, commitPendingGesture, ensureDraggingCapture],
  );

  const onPointerDown = useCallback(
    (surface: SheetPointerSurface) =>
      (event: ReactPointerEvent<HTMLElement>) => {
        if (event.button !== 0) {
          return;
        }

        const phase = readMachinePhaseRef.current();
        if (phase === "dragging" || phase === "settling") {
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
        capturedPointerIdRef.current = event.pointerId;
        captureTargetRef.current = event.currentTarget;
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
        surfaceTarget.addEventListener("pointerup", up);
        surfaceTarget.addEventListener("pointercancel", up);
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
