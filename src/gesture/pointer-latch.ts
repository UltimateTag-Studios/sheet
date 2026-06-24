import type { SheetPointerRoute, SheetPointerSurface } from "../machine";
import { resolvePressElement } from "./resolve-press-element";

export type PointerTracking = {
  move: (event: PointerEvent) => void;
  up: (event: PointerEvent) => void;
};

/** DOM-only latch — capture, route, and tap synthesis targets. */
export type DomPointerLatch = {
  pointerId: number;
  pressTarget: EventTarget;
  sheetBoundary: HTMLElement;
  route: SheetPointerRoute;
  startClientY: number;
  lastClientY: number;
  pointerCaptured: boolean;
  tracking: PointerTracking;
};

const MOVE_LISTENER: AddEventListenerOptions = { passive: true };

export function isHandlePressTarget(target: EventTarget): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("[data-sheet-handle],.sheet-handle"))
  );
}

export function resolvePointerRoute(
  pressTarget: EventTarget,
  sheetBoundary: HTMLElement,
  surface: SheetPointerSurface,
): SheetPointerRoute {
  if (surface === "chrome" || isHandlePressTarget(pressTarget)) {
    return "sheet";
  }

  const pressElement = resolvePressElement(pressTarget);
  if (
    pressElement &&
    pressElement !== sheetBoundary &&
    sheetBoundary.contains(pressElement)
  ) {
    return "watch";
  }

  return "sheet";
}

export function shouldCapturePointerOnDown(
  target: EventTarget,
  route: SheetPointerRoute,
): boolean {
  if (route === "watch") {
    return false;
  }
  return isHandlePressTarget(target);
}

export function acquireSheetPointerCapture(
  sheetBoundary: HTMLElement,
  pointerId: number,
): boolean {
  if (typeof sheetBoundary.setPointerCapture !== "function") {
    return false;
  }
  sheetBoundary.setPointerCapture(pointerId);
  return true;
}

export function releaseSheetPointerCapture(
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

export function detachPointerTracking(latch: DomPointerLatch): void {
  const { tracking, sheetBoundary, pointerId, pointerCaptured } = latch;
  sheetBoundary.removeEventListener(
    "pointermove",
    tracking.move,
    MOVE_LISTENER,
  );
  sheetBoundary.removeEventListener("pointerup", tracking.up);
  sheetBoundary.removeEventListener("pointercancel", tracking.up);
  if (pointerCaptured) {
    releaseSheetPointerCapture(sheetBoundary, pointerId);
  }
}

export function attachPointerTracking(latch: DomPointerLatch): void {
  const { tracking, sheetBoundary } = latch;
  sheetBoundary.addEventListener("pointermove", tracking.move, MOVE_LISTENER);
  sheetBoundary.addEventListener("pointerup", tracking.up);
  sheetBoundary.addEventListener("pointercancel", tracking.up);
}

export function commitWatchRoute(latch: DomPointerLatch): void {
  latch.route = "sheet";
  if (!latch.pointerCaptured) {
    latch.pointerCaptured = acquireSheetPointerCapture(
      latch.sheetBoundary,
      latch.pointerId,
    );
  }
}
