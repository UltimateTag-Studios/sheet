import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";

import { isVisibleHeightAtRestingSnap } from "../layout/snap-math";
import {
  SHEET_AXIS_THRESHOLD_PX,
  type SheetMachineEvent,
  type SheetMachineResult,
  type SheetPhase,
  type SheetPointerSurface,
} from "../machine/sheet-machine";
import { activatePostDragClickRepair } from "./activate-post-drag-click-repair";

export type SheetPointerHandlers = {
  onChromePointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onBodyPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
};

type PointerTracking = {
  move: (event: PointerEvent) => void;
  up: (event: PointerEvent) => void;
};

type SessionPhase = "watch" | "sheet";

type PointerSession = {
  pointerId: number;
  pressTarget: EventTarget;
  sheetBoundary: HTMLElement;
  routeElement: HTMLElement;
  phase: SessionPhase;
  startClientY: number;
  lastClientY: number;
  scrollTopPx: number;
  surface: SheetPointerSurface;
  committed: boolean;
  hadEffect: boolean;
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

function detachPointerTracking(session: PointerSession): void {
  const { tracking, routeElement, pointerId, pointerCaptured, sheetBoundary } =
    session;
  routeElement.removeEventListener("pointermove", tracking.move, MOVE_LISTENER);
  routeElement.removeEventListener("pointerup", tracking.up);
  routeElement.removeEventListener("pointercancel", tracking.up);
  if (pointerCaptured) {
    releaseSheetPointerCapture(sheetBoundary, pointerId);
  }
}

function attachPointerTracking(session: PointerSession): void {
  const { tracking, routeElement } = session;
  routeElement.addEventListener("pointermove", tracking.move, MOVE_LISTENER);
  routeElement.addEventListener("pointerup", tracking.up);
  routeElement.addEventListener("pointercancel", tracking.up);
}

function promoteWatchToSheet(session: PointerSession): void {
  detachPointerTracking(session);
  session.routeElement = session.sheetBoundary;
  session.phase = "sheet";
  attachPointerTracking(session);
  if (!session.pointerCaptured) {
    session.pointerCaptured = acquireSheetPointerCapture(
      session.sheetBoundary,
      session.pointerId,
    );
  }
}

/**
 * Pointer routing on the sheet panel only — no document listeners.
 * Interactive controls are watched on the press target until move slop.
 * Move never calls preventDefault (Android poisons the next gesture's click).
 * Pure in-sheet taps: preventDefault on release + activate the press target.
 * After a real drag, {@link activatePostDragClickRepair} heals the next outside
 * DOM tap (sibling controls in the host — not Mapbox canvas).
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
      detachPointerTracking(session);
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
      session.lastClientY = event.clientY;

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
        committed: wasCommitted,
        hadEffect,
        lastClientY,
        pointerId,
        pressTarget,
        sheetBoundary,
        startClientY,
      } = session;

      if (wasCommitted) {
        dispatchRef.current({
          type: "pointerUp",
          pointerId: event.pointerId,
        });
        scrollMomentumRef.current.releaseScrollMomentum();
      }

      endPointerSession();

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
        return;
      }

      if (wasCommitted) {
        activatePostDragClickRepair(sheetBoundary);
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

        if (session.phase === "watch") {
          promoteWatchToSheet(session);
        } else if (!session.pointerCaptured) {
          session.pointerCaptured = acquireSheetPointerCapture(
            session.sheetBoundary,
            session.pointerId,
          );
        }

        commitPendingGesture(event);
        return;
      }

      session.lastClientY = event.clientY;

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

        if (readMachinePhaseRef.current() === "dragging") {
          return;
        }

        const sheetBoundary = event.currentTarget.closest(".sheet");
        if (!(sheetBoundary instanceof HTMLElement)) {
          return;
        }

        scrollMomentumRef.current.cancelScrollMomentum();
        scrollMomentumRef.current.clearScrollPointerTracking();
        endPointerSession();

        const tracking = {
          move: (pointerEvent: PointerEvent) => {
            onPointerMove(pointerEvent);
          },
          up: (pointerEvent: PointerEvent) => {
            finishPointer(pointerEvent);
          },
        };

        const interactivePressElement = getInteractivePressElement(
          event.target,
        );
        const phase: SessionPhase = interactivePressElement ? "watch" : "sheet";
        const routeElement = interactivePressElement ?? sheetBoundary;
        const pointerCaptured =
          phase === "sheet" && shouldCapturePointerOnDown(event.target)
            ? acquireSheetPointerCapture(sheetBoundary, event.pointerId)
            : false;

        sessionRef.current = {
          pointerId: event.pointerId,
          pressTarget: event.target,
          sheetBoundary,
          routeElement,
          phase,
          startClientY: event.clientY,
          lastClientY: event.clientY,
          scrollTopPx: readScrollTopRef.current(),
          surface,
          committed: false,
          hadEffect: false,
          pointerCaptured,
          tracking,
        };

        attachPointerTracking(sessionRef.current);
      },
    [endPointerSession, finishPointer, onPointerMove],
  );

  useEffect(() => () => endPointerSession(), [endPointerSession]);

  return {
    onChromePointerDown: onPointerDown("chrome"),
    onBodyPointerDown: onPointerDown("body"),
  };
}
