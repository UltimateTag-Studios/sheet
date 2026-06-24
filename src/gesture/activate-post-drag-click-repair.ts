import { SHEET_AXIS_THRESHOLD_PX } from "../machine";

type OutsideTap = {
  pointerId: number;
  clientX: number;
  clientY: number;
  downTarget: Element;
};

type RepairSession = {
  outsideTap: OutsideTap | null;
  deactivate: () => void;
};

let activeRepair: RepairSession | null = null;

function pointerTargetOutsideSheet(
  target: EventTarget | null,
  sheetBoundary: HTMLElement,
): boolean {
  return target instanceof Node && !sheetBoundary.contains(target);
}

function resolvePointerTarget(
  target: EventTarget | null,
  clientX: number,
  clientY: number,
): Element | null {
  if (target instanceof Element) {
    return target;
  }

  if (target instanceof Text && target.parentElement) {
    return target.parentElement;
  }

  const hit = document.elementFromPoint(clientX, clientY);
  return hit instanceof Element ? hit : null;
}

function isSameTapTarget(downTarget: Element, upTarget: Element): boolean {
  return (
    downTarget === upTarget ||
    downTarget.contains(upTarget) ||
    upTarget.contains(downTarget)
  );
}

function pointerMovedBeyondTap(
  startX: number,
  startY: number,
  event: PointerEvent,
): boolean {
  return (
    Math.hypot(event.clientX - startX, event.clientY - startY) >
    SHEET_AXIS_THRESHOLD_PX
  );
}

function isMapboxCanvasTarget(target: Element): boolean {
  return target.matches(".mapboxgl-canvas");
}

function dispatchSyntheticClick(
  target: Element,
  clientX: number,
  clientY: number,
): void {
  target.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
    }),
  );
}

function scheduleClickIfMissing(
  target: Element,
  clientX: number,
  clientY: number,
): void {
  let clickObserved = false;

  const onClick = () => {
    clickObserved = true;
  };

  target.addEventListener("click", onClick, { capture: true, once: true });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      target.removeEventListener("click", onClick, { capture: true });
      if (!clickObserved) {
        dispatchSyntheticClick(target, clientX, clientY);
      }
    });
  });
}

/**
 * Android WebView often skips `click` on the first tap after a sheet drag, even
 * when `pointerdown`/`pointerup` reach the target. After a real drag, watch for
 * the next outside-sheet tap and dispatch `click` on the tapped element when the
 * browser does not. Mapbox canvas taps are handled by `@siegetag/sheet-map`
 * pointer picking — not DOM click repair.
 */
export function activatePostDragClickRepair(sheetBoundary: HTMLElement): void {
  activeRepair?.deactivate();

  const session: RepairSession = {
    outsideTap: null,
    deactivate: () => {},
  };

  const deactivate = () => {
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("pointermove", onPointerMove, true);
    document.removeEventListener("pointerup", onPointerUp, true);
    document.removeEventListener("pointercancel", onPointerUp, true);
    if (activeRepair === session) {
      activeRepair = null;
    }
  };

  session.deactivate = deactivate;

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }

    if (!pointerTargetOutsideSheet(event.target, sheetBoundary)) {
      return;
    }

    const downTarget = resolvePointerTarget(
      event.target,
      event.clientX,
      event.clientY,
    );
    if (!downTarget || sheetBoundary.contains(downTarget)) {
      return;
    }

    if (isMapboxCanvasTarget(downTarget)) {
      return;
    }

    session.outsideTap = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      downTarget,
    };
  };

  const onPointerMove = (event: PointerEvent) => {
    const tap = session.outsideTap;
    if (!tap || tap.pointerId !== event.pointerId) {
      return;
    }

    if (pointerMovedBeyondTap(tap.clientX, tap.clientY, event)) {
      deactivate();
    }
  };

  const onPointerUp = (event: PointerEvent) => {
    const tap = session.outsideTap;
    if (!tap || tap.pointerId !== event.pointerId) {
      return;
    }

    const upTarget = resolvePointerTarget(
      event.target,
      event.clientX,
      event.clientY,
    );

    const shouldRepair =
      upTarget !== null &&
      pointerTargetOutsideSheet(upTarget, sheetBoundary) &&
      !pointerMovedBeyondTap(tap.clientX, tap.clientY, event) &&
      isSameTapTarget(tap.downTarget, upTarget);

    deactivate();

    if (shouldRepair) {
      scheduleClickIfMissing(upTarget, event.clientX, event.clientY);
    }
  };

  document.addEventListener("pointerdown", onPointerDown, { capture: true });
  document.addEventListener("pointermove", onPointerMove, { capture: true });
  document.addEventListener("pointerup", onPointerUp, { capture: true });
  document.addEventListener("pointercancel", onPointerUp, { capture: true });

  activeRepair = session;
}

/** Test-only reset. */
export function deactivatePostDragClickRepairForTests(): void {
  activeRepair?.deactivate();
}
