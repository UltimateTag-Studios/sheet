import { DEFAULT_HALF_SNAP_FRACTION } from "./normalize-half-snap-fraction";

export const FALLBACK_COLLAPSED_HEIGHT_PX = 150;
export const FALLBACK_FULL_HEIGHT_PX = 700;

/** Visible sheet height from layout (slide height when bottom-anchored in host). */
export function readVisibleSheetHeightPx(el: HTMLElement): number {
  const height = el.offsetHeight;
  return height > 0 ? height : 0;
}

export function sheetSnapPointPx(heightPx: number): string {
  return `${Math.round(heightPx)}px`;
}

/** Sheet host height used for snap points and full snap. */
export function readHostHeightPx(hostEl: HTMLElement | null): number {
  if (!hostEl) {
    return FALLBACK_FULL_HEIGHT_PX;
  }

  const height = hostEl.clientHeight;
  return height > 0 ? height : FALLBACK_FULL_HEIGHT_PX;
}

/** Height of the handle block (bar + top and bottom margin) in CSS pixels. */
export function measureHandleBlockHeightPx(
  handleEl: HTMLElement | null,
): number {
  if (!handleEl) {
    return 0;
  }

  const style = getComputedStyle(handleEl);
  const marginTop = Number.parseFloat(style.marginTop) || 0;
  const marginBottom = Number.parseFloat(style.marginBottom) || 0;
  return handleEl.offsetHeight + marginTop + marginBottom;
}

/** Measured chrome block height (handle + optional header + divider). */
export function measureChromeHeightPx(chromeEl: HTMLElement | null): number {
  return chromeEl?.offsetHeight ?? 0;
}

/** Chrome DOM height plus bottom reserve spacer height. */
export function measureCollapsedHeightPx(
  chromeEl: HTMLElement | null,
  fullHeightPx: number,
  halfSnapFraction: number = DEFAULT_HALF_SNAP_FRACTION,
  reserveHeightPx = 0,
): number {
  const total = measureChromeHeightPx(chromeEl) + reserveHeightPx;

  if (total <= 0) {
    return FALLBACK_COLLAPSED_HEIGHT_PX;
  }

  const maxCollapsedPx = Math.floor(fullHeightPx * halfSnapFraction) - 1;
  return Math.min(
    total,
    Math.max(FALLBACK_COLLAPSED_HEIGHT_PX, maxCollapsedPx),
  );
}
