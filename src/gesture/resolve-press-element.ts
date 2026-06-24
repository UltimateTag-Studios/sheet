export function resolvePressElement(
  target: EventTarget | null,
): HTMLElement | null {
  if (target instanceof HTMLElement) {
    return target;
  }
  if (target instanceof Text && target.parentElement) {
    return target.parentElement;
  }
  return null;
}

/** Press target for pointer events; falls back to `elementFromPoint` when needed. */
export function resolvePointerTarget(
  target: EventTarget | null,
  clientX: number,
  clientY: number,
): Element | null {
  const pressElement = resolvePressElement(target);
  if (pressElement) {
    return pressElement;
  }

  const hit = document.elementFromPoint(clientX, clientY);
  return hit instanceof Element ? hit : null;
}
