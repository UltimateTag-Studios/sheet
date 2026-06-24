import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";

import { isVisibleHeightAtRestingSnap } from "../layout/snap-math";
import type {
  SheetMachineEvent,
  SheetMachineResult,
  SheetPhase,
  SheetPointerSurface,
} from "../machine/sheet-machine";
import { SHEET_AXIS_THRESHOLD_PX } from "../machine/sheet-machine";
import { activatePostDragClickRepair } from "./activate-post-drag-click-repair";
import { describeProbeTarget, logSheetTouchProbe } from "./sheet-touch-probe";

export type SheetPointerHandlers = {
  onChromePointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onBodyPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
};

type PointerTracking = {
  move: (event: PointerEvent) => void;
  up: (event: PointerEvent) => void;
};

type PointerSession = {
  pointerId: number;
  tapTarget: EventTarget;
  sheetBoundary: HTMLElement;
  startClientY: number;
  scrollTopPx: number;
  surface: SheetPointerSurface;
  committed: boolean;
  hadEffect: boolean;
  tracking: PointerTracking;
};

const PASSIVE_LISTENER: AddEventListenerOptions = { passive: true };

function pointerReleaseOnSheet(
  target: EventTarget | null,
  sheetBoundary: HTMLElement,
): boolean {
  return target instanceof Node && sheetBoundary.contains(target);
}

function releaseSheetPointerCapture(
  sheetBoundary: HTMLElement,
  pointerId: number,
): void {
  if (sheetBoundary.hasPointerCapture?.(pointerId)) {
    sheetBoundary.releasePointerCapture(pointerId);
  }
}

function setSheetPointerCapture(
  sheetBoundary: HTMLElement,
  pointerId: number,
): void {
  sheetBoundary.setPointerCapture?.(pointerId);
}

function detachSheetPointerTracking(session: PointerSession): void {
  const { sheetBoundary, tracking, pointerId } = session;
  sheetBoundary.removeEventListener(
    "pointermove",
    tracking.move,
    PASSIVE_LISTENER,
  );
  sheetBoundary.removeEventListener("pointerup", tracking.up);
  sheetBoundary.removeEventListener("pointercancel", tracking.up);
  releaseSheetPointerCapture(sheetBoundary, pointerId);
}

function attachSheetPointerTracking(session: PointerSession): void {
  const { sheetBoundary, tracking, pointerId } = session;
  sheetBoundary.addEventListener(
    "pointermove",
    tracking.move,
    PASSIVE_LISTENER,
  );
  sheetBoundary.addEventListener("pointerup", tracking.up);
  sheetBoundary.addEventListener("pointercancel", tracking.up);
  setSheetPointerCapture(sheetBoundary, pointerId);
}

/**
 * Tap vs drag on chrome and body:
 * 1. pointerdown (capture) — setPointerCapture on `.sheet`, sheet-local move/up listeners
 * 2. move past slop — commit sheet drag
 * 3. release without drag effect on the sheet — preventDefault + click() the press target
 * 4. release after real drag on the sheet — machine pointerUp only; no preventDefault
 * 5. release outside the sheet panel — end the gesture; only steal default when release is on-sheet without drag effect
 *
 * Gesture tracking stays on the sheet node (not document capture). Move never calls preventDefault.
 * After a real drag, {@link activatePostDragClickRepair} ensures the next outside tap still
 * activates `click` targets on Android WebView.
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
  touchProbe = false,
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
      detachSheetPointerTracking(session);
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
      } else if (!isVisibleHeightAtRestingSnap(result.state)) {
        session.hadEffect = true;
      }

      if (intent === "scroll") {
        scrollMomentumRef.current.recordScrollPointerSample(event.clientY);
      } else if (intent === "sheet") {
        scrollMomentumRef.current.clearScrollPointerTracking();
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
      if (!session || session.pointerId !== event.pointerId) {
        return;
      }

      const {
        hadEffect,
        tapTarget,
        committed: wasCommitted,
        sheetBoundary,
      } = session;

      if (wasCommitted) {
        dispatchRef.current({
          type: "pointerUp",
          pointerId: event.pointerId,
        });
        scrollMomentumRef.current.releaseScrollMomentum();
      }

      endPointerSession();

      const releaseOnSheet = pointerReleaseOnSheet(event.target, sheetBoundary);

      logSheetTouchProbe(touchProbe, {
        action: "finishPointer",
        pointerId: event.pointerId,
        clientY: event.clientY,
        committed: wasCommitted,
        hadEffect,
        releaseOnSheet,
        defaultPrevented: event.defaultPrevented,
        tapTarget: describeProbeTarget(tapTarget),
        releaseTarget: describeProbeTarget(event.target),
      });

      if (!releaseOnSheet) {
        if (
          !hadEffect &&
          tapTarget instanceof HTMLElement &&
          sheetBoundary.contains(tapTarget)
        ) {
          event.preventDefault();
          tapTarget.click();
        }
        logSheetTouchProbe(touchProbe, {
          action: "sessionEnd",
          pointerId: event.pointerId,
          releaseOnSheet: false,
        });
        return;
      }

      if (!hadEffect) {
        event.preventDefault();

        if (tapTarget instanceof HTMLElement) {
          tapTarget.click();
        }
      }

      logSheetTouchProbe(touchProbe, {
        action: "sessionEnd",
        pointerId: event.pointerId,
        releaseOnSheet: true,
        hadEffect,
      });

      if (wasCommitted && hadEffect) {
        activatePostDragClickRepair(sheetBoundary);
      }
    },
    [endPointerSession, touchProbe],
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

        const sheetBoundary = event.currentTarget.closest(".sheet");
        if (!(sheetBoundary instanceof HTMLElement)) {
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

        const session: PointerSession = {
          pointerId: event.pointerId,
          tapTarget: event.target,
          sheetBoundary,
          startClientY: event.clientY,
          scrollTopPx: readScrollTopRef.current(),
          surface,
          committed: false,
          hadEffect: false,
          tracking,
        };

        sessionRef.current = session;
        attachSheetPointerTracking(session);

        logSheetTouchProbe(touchProbe, {
          action: "pointerDown",
          pointerId: event.pointerId,
          clientY: event.clientY,
          surface,
          tapTarget: describeProbeTarget(event.target),
        });
      },
    [endPointerSession, finishPointer, onPointerMove, touchProbe],
  );

  useEffect(() => () => endPointerSession(), [endPointerSession]);

  return {
    onChromePointerDown: onPointerDown("chrome"),
    onBodyPointerDown: onPointerDown("body"),
  };
}
