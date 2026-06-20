const SHEET_INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "textarea",
  "select",
  "label",
  "summary",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='menuitem']",
  "[data-sheet-interactive]",
].join(", ");

/** True when the pointer target is a native or opt-in clickable control. */
export function isSheetInteractivePointerTarget(
  target: EventTarget | null,
): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return target.closest(SHEET_INTERACTIVE_SELECTOR) !== null;
}
