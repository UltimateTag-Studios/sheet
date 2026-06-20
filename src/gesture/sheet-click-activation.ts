export function activateSheetClickTarget(target: EventTarget | null): void {
  if (!(target instanceof HTMLElement)) {
    return;
  }

  requestAnimationFrame(() => {
    target.click();
  });
}
