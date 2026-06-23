/** Fire a click for the element the user pressed (child of button → button). */
export function activatePointerDownTarget(target: EventTarget | null): void {
  if (!(target instanceof Element)) {
    return;
  }

  const activatable = target.closest(
    "button, a[href], input, textarea, select, label, [role='button']",
  );

  if (activatable instanceof HTMLElement) {
    activatable.click();
    return;
  }

  if (target instanceof HTMLElement) {
    target.click();
  }
}
