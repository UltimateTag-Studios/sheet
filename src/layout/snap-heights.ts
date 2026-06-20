import { DEFAULT_HALF_SNAP_FRACTION } from "./normalize-half-snap-fraction";

export const FALLBACK_COLLAPSED_HEIGHT_PX = 150;
export const FALLBACK_FULL_HEIGHT_PX = 700;

/** Visible sheet height from viewport intersection (handles translate). */
export function readVisibleSheetHeightPx(el: HTMLElement): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const rect = el.getBoundingClientRect();
  const viewport = window.visualViewport;
  const viewportHeight =
    viewport && viewport.height > 0 ? viewport.height : window.innerHeight;
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportBottom = viewportTop + viewportHeight;

  const visibleTop = Math.max(rect.top, viewportTop);
  const visibleBottom = Math.min(rect.bottom, viewportBottom);
  return Math.max(0, visibleBottom - visibleTop);
}

export function sheetSnapPointPx(heightPx: number): string {
  return `${Math.round(heightPx)}px`;
}

/** Full sheet height: visual viewport minus top safe area / offset. */
export function readFullHeightPx(): number {
  if (typeof window === "undefined") {
    return FALLBACK_FULL_HEIGHT_PX;
  }

  const viewport = window.visualViewport;
  const viewportHeight =
    viewport && viewport.height > 0 ? viewport.height : window.innerHeight;
  const topInset = viewport?.offsetTop ?? 0;

  const height = Math.max(0, viewportHeight - topInset);
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

/** Chrome DOM height plus optional inset and bottom reserve height. */
export function measureCollapsedHeightPx(
  chromeEl: HTMLElement | null,
  collapsedBottomInsetPx: number,
  fullHeightPx: number = readFullHeightPx(),
  halfSnapFraction: number = DEFAULT_HALF_SNAP_FRACTION,
  reserveHeightPx = 0,
): number {
  const total =
    measureChromeHeightPx(chromeEl) + collapsedBottomInsetPx + reserveHeightPx;

  if (total <= 0) {
    return FALLBACK_COLLAPSED_HEIGHT_PX;
  }

  const maxCollapsedPx = Math.floor(fullHeightPx * halfSnapFraction) - 1;
  return Math.min(
    total,
    Math.max(FALLBACK_COLLAPSED_HEIGHT_PX, maxCollapsedPx),
  );
}

/** Viewport height used for bottom-sheet translate offsets. */
export function readContainerHeightPx(): number {
  if (typeof window === "undefined") {
    return FALLBACK_FULL_HEIGHT_PX;
  }

  const viewport = window.visualViewport;
  if (viewport && viewport.height > 0) {
    return viewport.height;
  }

  return window.innerHeight;
}

/** Bottom sheet: translateY offset for a target visible height. */
export function visibleHeightToTranslateOffsetPx(
  visibleHeightPx: number,
): number {
  return readContainerHeightPx() - visibleHeightPx;
}
