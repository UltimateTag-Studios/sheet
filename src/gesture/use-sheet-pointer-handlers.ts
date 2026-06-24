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
  type SheetPointerSurface,
} from "../machine";
import {
  acquireSheetPointerCapture,
  attachPointerTracking,
  commitWatchRoute,
  type DomPointerLatch,
  detachPointerTracking,
  resolvePointerRoute,
  shouldCapturePointerOnDown,
} from "./pointer-latch";
import { resolvePressElement } from "./resolve-press-element";
import { scheduleTapClickIfMissing } from "./schedule-tap-click-if-missing";

export type SheetPointerHandlers = {
  onChromePointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onBodyPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
};

/**
 * Pointer routing on the sheet panel only — no document listeners.
 * Commit and hadEffect come from machine `pointerArm` via `readPointerArm`.
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

      const {
        pressTarget,
        sheetBoundary,
        startClientY,
        lastClientY,
        pointerId,
      } = latch;

      const arm = readPointerArmRef.current();
      const wasCommitted = arm?.committed ?? false;
      const hadEffect = arm?.hadEffect ?? false;

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

      if (!hadEffect) {
        const tapTarget = resolvePressElement(pressTarget);
        if (tapTarget && sheetBoundary.contains(tapTarget)) {
          scheduleTapClickIfMissing(tapTarget, event.clientX, event.clientY);
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

    if (!readPointerArmRef.current()?.committed) {
      const deltaY = Math.abs(event.clientY - latch.startClientY);
      if (deltaY < SHEET_AXIS_THRESHOLD_PX) {
        return;
      }

      if (latch.route === "watch") {
        commitWatchRoute(latch);
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

        const route = resolvePointerRoute(event.target, sheetBoundary, surface);
        const pointerCaptured =
          route === "sheet" && shouldCapturePointerOnDown(event.target, route)
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
