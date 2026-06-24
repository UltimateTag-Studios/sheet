export type SheetTouchProbeAction =
  | "pointerDown"
  | "pointerMovePreventDefault"
  | "finishPointer"
  | "sessionEnd";

export type SheetTouchProbePayload = {
  action: SheetTouchProbeAction;
  pointerId: number;
  clientY?: number;
  committed?: boolean;
  hadEffect?: boolean;
  releaseOnSheet?: boolean;
  defaultPrevented?: boolean;
  tapTarget?: string | null;
  releaseTarget?: string | null;
  surface?: string;
};

function describeProbeTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const parts = [target.tagName.toLowerCase()];
  const classes = Array.from(target.classList).slice(0, 5);
  if (classes.length > 0) {
    parts.push(`.${classes.join(".")}`);
  }
  return parts.join("");
}

export function logSheetTouchProbe(
  enabled: boolean,
  payload: SheetTouchProbePayload,
): void {
  if (!enabled) {
    return;
  }

  console.info("[sheet-touch-probe]", payload);
}

export { describeProbeTarget };
