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
  SheetPointerSurface,
} from "../machine/sheet-machine";

export type SheetPointerHandlers = {
  onChromePointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onBodyPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
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
  applyBodyScrollDelta: (deltaPx: number) => void,
): SheetPointerHandlers {
  const capturedPointerIdRef = useRef<number | null>(null);
  const captureTargetRef = useRef<HTMLElement | null>(null);
  const draggingRef = useRef(false);
  const documentListenersRef = useRef<{
    move: (event: PointerEvent) => void;
    up: (event: PointerEvent) => void;
  } | null>(null);
  const dispatchRef = useRef(dispatch);
  const readScrollTopRef = useRef(readScrollTop);
  const applyBodyScrollDeltaRef = useRef(applyBodyScrollDelta);

  dispatchRef.current = dispatch;
  readScrollTopRef.current = readScrollTop;
  applyBodyScrollDeltaRef.current = applyBodyScrollDelta;

  const removeDocumentListeners = useCallback(() => {
    const listeners = documentListenersRef.current;
    if (!listeners) {
      return;
    }

    document.removeEventListener("pointermove", listeners.move);
    document.removeEventListener("pointerup", listeners.up);
    document.removeEventListener("pointercancel", listeners.up);
    documentListenersRef.current = null;
  }, []);

  const endCapture = useCallback(
    (pointerId: number) => {
      const captureTarget = captureTargetRef.current;
      if (captureTarget) {
        tryReleasePointerCapture(captureTarget, pointerId);
      }
      captureTargetRef.current = null;
      capturedPointerIdRef.current = null;
      draggingRef.current = false;
      removeDocumentListeners();
    },
    [removeDocumentListeners],
  );

  const applyMoveResult = useCallback(
    (event: PointerEvent, result: SheetMachineResult) => {
      if (
        result.bodyScrollDeltaPx !== undefined &&
        result.bodyScrollDeltaPx !== 0
      ) {
        applyBodyScrollDeltaRef.current(result.bodyScrollDeltaPx);
      }

      const intent = result.state.gesture?.intent;
      if (
        result.state.phase === "dragging" &&
        (intent === "sheet" || intent === "scroll")
      ) {
        event.preventDefault();
      }
    },
    [],
  );

  const ensureDraggingCapture = useCallback(
    (event: PointerEvent, state: SheetMachineState) => {
      if (state.phase !== "dragging" || draggingRef.current) {
        return;
      }

      draggingRef.current = true;
      const captureTarget = captureTargetRef.current;
      if (captureTarget) {
        trySetPointerCapture(captureTarget, event.pointerId);
      }
    },
    [],
  );

  const onDocumentPointerMove = useCallback(
    (event: PointerEvent) => {
      if (capturedPointerIdRef.current !== event.pointerId) {
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
    [applyMoveResult, ensureDraggingCapture],
  );

  const onDocumentPointerEnd = useCallback(
    (event: PointerEvent) => {
      if (capturedPointerIdRef.current !== event.pointerId) {
        return;
      }

      if (draggingRef.current) {
        event.preventDefault();
      }

      dispatchRef.current({
        type: "pointerUp",
        pointerId: event.pointerId,
      });
      endCapture(event.pointerId);
    },
    [endCapture],
  );

  const onPointerDown = useCallback(
    (surface: SheetPointerSurface) =>
      (event: ReactPointerEvent<HTMLElement>) => {
        if (event.button !== 0) {
          return;
        }

        const result = dispatchRef.current({
          type: "pointerDown",
          pointerId: event.pointerId,
          clientY: event.clientY,
          scrollTopPx: readScrollTopRef.current(),
          surface,
        });

        capturedPointerIdRef.current = event.pointerId;
        captureTargetRef.current = event.currentTarget;
        draggingRef.current = result.state.phase === "dragging";

        if (draggingRef.current) {
          event.preventDefault();
          event.stopPropagation();
          trySetPointerCapture(event.currentTarget, event.pointerId);
        }

        removeDocumentListeners();
        const move = (pointerEvent: PointerEvent) => {
          onDocumentPointerMove(pointerEvent);
        };
        const up = (pointerEvent: PointerEvent) => {
          onDocumentPointerEnd(pointerEvent);
        };
        documentListenersRef.current = { move, up };
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", up);
        document.addEventListener("pointercancel", up);
      },
    [onDocumentPointerEnd, onDocumentPointerMove, removeDocumentListeners],
  );

  useEffect(() => () => removeDocumentListeners(), [removeDocumentListeners]);

  return {
    onChromePointerDown: onPointerDown("chrome"),
    onBodyPointerDown: onPointerDown("body"),
  };
}
