import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";

import type {
  SheetMachineEvent,
  SheetMachineResult,
} from "../machine/sheet-machine";

export type SheetPointerHandlers = {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
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
): SheetPointerHandlers {
  const capturedPointerIdRef = useRef<number | null>(null);
  const captureTargetRef = useRef<HTMLElement | null>(null);
  const documentListenersRef = useRef<{
    move: (event: PointerEvent) => void;
    up: (event: PointerEvent) => void;
  } | null>(null);
  const dispatchRef = useRef(dispatch);
  const readScrollTopRef = useRef(readScrollTop);

  dispatchRef.current = dispatch;
  readScrollTopRef.current = readScrollTop;

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
      removeDocumentListeners();
    },
    [removeDocumentListeners],
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

      if (result.releaseToScroll) {
        endCapture(event.pointerId);
        return;
      }

      if (
        result.state.phase === "dragging" &&
        result.state.gesture?.intent === "sheet"
      ) {
        event.preventDefault();
      }
    },
    [endCapture],
  );

  const onDocumentPointerEnd = useCallback(
    (event: PointerEvent) => {
      if (capturedPointerIdRef.current !== event.pointerId) {
        return;
      }

      dispatchRef.current({
        type: "pointerUp",
        pointerId: event.pointerId,
      });
      endCapture(event.pointerId);
      event.preventDefault();
    },
    [endCapture],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }

      const result = dispatchRef.current({
        type: "pointerDown",
        pointerId: event.pointerId,
        clientY: event.clientY,
        scrollTopPx: readScrollTopRef.current(),
      });

      if (result.releaseToScroll) {
        return;
      }

      if (result.state.phase !== "dragging") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      capturedPointerIdRef.current = event.pointerId;
      captureTargetRef.current = event.currentTarget;
      trySetPointerCapture(event.currentTarget, event.pointerId);

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

  return { onPointerDown };
}
