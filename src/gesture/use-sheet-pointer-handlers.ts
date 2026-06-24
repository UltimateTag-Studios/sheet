import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";

import {
  SHEET_AXIS_THRESHOLD_PX,
  type SheetMachineEvent,
  type SheetMachineResult,
  type SheetPhase,
  type SheetPointerArm,
  type SheetPointerRoute,
  type SheetPointerSurface,
} from "../machine";

export type SheetPointerHandlers = {
  onChromePointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onBodyPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
};

type PointerTracking = {
  move: (event: PointerEvent) => void;
  up: (event: PointerEvent) => void;
};

/** DOM-only latch — capture, routing element, and tap synthesis targets. */
type DomPointerLatch = {
  pointerId: number;
  pressTarget: EventTarget;
  sheetBoundary: HTMLElement;
  routeElement: HTMLElement;
  route: SheetPointerRoute;
  startClientY: number;
  lastClientY: number;
  pointerCaptured: boolean;
  tracking: PointerTracking;
};

function pointerReleaseOnSheet(
  target: EventTarget | null,
  sheetBoundary: HTMLElement,
): boolean {
  return target instanceof Node && sheetBoundary.contains(target);
}

function resolveTapClickTarget(pressTarget: EventTarget): HTMLElement | null {
  if (!(pressTarget instanceof HTMLElement)) {
    return null;
  }
  return getInteractivePressElement(pressTarget) ?? pressTarget;
}

const MOVE_LISTENER: AddEventListenerOptions = { passive: true };

const INTERACTIVE_PRESS_SELECTOR =
  "button,a,[role='button'],input,select,textarea,[contenteditable]";

function getInteractivePressElement(target: EventTarget): HTMLElement | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  const pressElement = target.closest(INTERACTIVE_PRESS_SELECTOR);
  return pressElement instanceof HTMLElement ? pressElement : null;
}

function isHandlePressTarget(target: EventTarget): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("[data-sheet-handle],.sheet-handle"))
  );
}

function shouldCapturePointerOnDown(target: EventTarget): boolean {
  if (getInteractivePressElement(target)) {
    return false;
  }
  return isHandlePressTarget(target);
}

function acquireSheetPointerCapture(
  sheetBoundary: HTMLElement,
  pointerId: number,
): boolean {
  if (typeof sheetBoundary.setPointerCapture !== "function") {
    return false;
  }
  sheetBoundary.setPointerCapture(pointerId);
  return true;
}

function releaseSheetPointerCapture(
  sheetBoundary: HTMLElement,
  pointerId: number,
): void {
  if (
    typeof sheetBoundary.releasePointerCapture === "function" &&
    typeof sheetBoundary.hasPointerCapture === "function" &&
    sheetBoundary.hasPointerCapture(pointerId)
  ) {
    sheetBoundary.releasePointerCapture(pointerId);
  }
}

function detachPointerTracking(latch: DomPointerLatch): void {
  const { tracking, routeElement, pointerId, pointerCaptured, sheetBoundary } =
    latch;
  routeElement.removeEventListener("pointermove", tracking.move, MOVE_LISTENER);
  routeElement.removeEventListener("pointerup", tracking.up);
  routeElement.removeEventListener("pointercancel", tracking.up);
  if (pointerCaptured) {
    releaseSheetPointerCapture(sheetBoundary, pointerId);
  }
}

function attachPointerTracking(latch: DomPointerLatch): void {
  const { tracking, routeElement } = latch;
  routeElement.addEventListener("pointermove", tracking.move, MOVE_LISTENER);
  routeElement.addEventListener("pointerup", tracking.up);
  routeElement.addEventListener("pointercancel", tracking.up);
}

function promoteWatchToSheet(latch: DomPointerLatch): void {
  detachPointerTracking(latch);
  latch.routeElement = latch.sheetBoundary;
  latch.route = "sheet";
  attachPointerTracking(latch);
  if (!latch.pointerCaptured) {
    latch.pointerCaptured = acquireSheetPointerCapture(
      latch.sheetBoundary,
      latch.pointerId,
    );
  }
}

/**
 * Pointer routing on the sheet panel only — no document listeners.
 * Gesture intent lives in the sheet machine (`pointerArm` / `pointerCommit`).
 */
export function useSheetPointerHandlers(
  dispatch: (event: SheetMachineEvent) => SheetMachineResult,
  readScrollTop: () => number,
  readMachinePhase: () => SheetPhase | null,
  readPointerArm: () => SheetPointerArm | null,
): SheetPointerHandlers {
  const latchRef = useRef<DomPointerLatch | null>(null);
  const dispatchRef = useRef(dispatch);
  const readScrollTopRef = useRef(readScrollTop);
  const readMachinePhaseRef = useRef(readMachinePhase);
  const readPointerArmRef = useRef(readPointerArm);

  dispatchRef.current = dispatch;
  readScrollTopRef.current = readScrollTop;
  readMachinePhaseRef.current = readMachinePhase;
  readPointerArmRef.current = readPointerArm;

  const endPointerLatch = useCallback(() => {
    const latch = latchRef.current;
    if (latch) {
      detachPointerTracking(latch);
    }
    latchRef.current = null;
  }, []);

  const finishPointer = useCallback(
    (event: PointerEvent) => {
      const latch = latchRef.current;
      if (!latch || latch.pointerId !== event.pointerId) {
        return;
      }

      const arm = readPointerArmRef.current();
      const wasCommitted = arm?.committed ?? false;
      const hadEffect = arm?.hadEffect ?? false;
      const {
        pressTarget,
        sheetBoundary,
        startClientY,
        lastClientY,
        pointerId,
      } = latch;

      if (wasCommitted) {
        dispatchRef.current({
          type: "pointerUp",
          pointerId: event.pointerId,
        });
      }

      endPointerLatch();

      if (
        wasCommitted &&
        event.type === "pointercancel" &&
        event.clientY === 0 &&
        lastClientY !== startClientY
      ) {
        dispatchRef.current({
          type: "pointerMove",
          pointerId,
          clientY: lastClientY,
          scrollTopPx: readScrollTopRef.current(),
          timeMs: performance.now(),
        });
      }

      const releaseOnSheet = pointerReleaseOnSheet(event.target, sheetBoundary);

      if (!releaseOnSheet) {
        if (!hadEffect) {
          const tapTarget = resolveTapClickTarget(pressTarget);
          if (tapTarget && sheetBoundary.contains(tapTarget)) {
            event.preventDefault();
            tapTarget.click();
          }
        }
        return;
      }

      if (!hadEffect) {
        event.preventDefault();
        const tapTarget = resolveTapClickTarget(pressTarget);
        if (tapTarget) {
          tapTarget.click();
        }
      }
    },
    [endPointerLatch],
  );

  const onPointerMove = useCallback((event: PointerEvent) => {
    const latch = latchRef.current;
    if (!latch || latch.pointerId !== event.pointerId) {
      return;
    }

    const arm = readPointerArmRef.current();
    if (!arm?.committed) {
      const deltaY = Math.abs(event.clientY - latch.startClientY);
      if (deltaY < SHEET_AXIS_THRESHOLD_PX) {
        return;
      }

      if (latch.route === "watch") {
        promoteWatchToSheet(latch);
      } else if (!latch.pointerCaptured) {
        latch.pointerCaptured = acquireSheetPointerCapture(
          latch.sheetBoundary,
          latch.pointerId,
        );
      }

      dispatchRef.current({
        type: "pointerCommit",
        pointerId: event.pointerId,
        clientY: event.clientY,
        scrollTopPx: readScrollTopRef.current(),
        timeMs: performance.now(),
      });
      latch.lastClientY = event.clientY;
      return;
    }

    latch.lastClientY = event.clientY;

    dispatchRef.current({
      type: "pointerMove",
      pointerId: event.pointerId,
      clientY: event.clientY,
      scrollTopPx: readScrollTopRef.current(),
      timeMs: performance.now(),
    });
  }, []);

  const onPointerDown = useCallback(
    (surface: SheetPointerSurface) =>
      (event: ReactPointerEvent<HTMLElement>) => {
        if (event.button !== 0) {
          return;
        }

        if (readMachinePhaseRef.current() === "dragging") {
          return;
        }

        const sheetBoundary = event.currentTarget.closest(".sheet");
        if (!(sheetBoundary instanceof HTMLElement)) {
          return;
        }

        endPointerLatch();

        const interactivePressElement = getInteractivePressElement(
          event.target,
        );
        const route: SheetPointerRoute = interactivePressElement
          ? "watch"
          : "sheet";
        const routeElement = interactivePressElement ?? sheetBoundary;
        const pointerCaptured =
          route === "sheet" && shouldCapturePointerOnDown(event.target)
            ? acquireSheetPointerCapture(sheetBoundary, event.pointerId)
            : false;

        const tracking = {
          move: (pointerEvent: PointerEvent) => {
            onPointerMove(pointerEvent);
          },
          up: (pointerEvent: PointerEvent) => {
            finishPointer(pointerEvent);
          },
        };

        latchRef.current = {
          pointerId: event.pointerId,
          pressTarget: event.target,
          sheetBoundary,
          routeElement,
          route,
          startClientY: event.clientY,
          lastClientY: event.clientY,
          pointerCaptured,
          tracking,
        };

        attachPointerTracking(latchRef.current);

        dispatchRef.current({
          type: "pointerArm",
          pointerId: event.pointerId,
          clientY: event.clientY,
          scrollTopPx: readScrollTopRef.current(),
          surface,
          route,
        });
      },
    [endPointerLatch, finishPointer, onPointerMove],
  );

  useEffect(() => () => endPointerLatch(), [endPointerLatch]);

  return {
    onChromePointerDown: onPointerDown("chrome"),
    onBodyPointerDown: onPointerDown("body"),
  };
}
