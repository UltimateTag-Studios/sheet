import type { CSSProperties } from "react";

export const DEFAULT_SHEET_HANDLE_MARGIN_TOP = "0.75rem";
export const DEFAULT_SHEET_HANDLE_BAR_HEIGHT = "0.25rem";
export const DEFAULT_SHEET_HANDLE_MARGIN_BOTTOM = "0.75rem";

export type SheetGeometry = {
  sheetHandleMarginTop?: number | string;
  sheetHandleBarHeight?: number | string;
  sheetHandleMarginBottom?: number | string;
};

export type SheetVisualStyles = {
  sheet?: CSSProperties;
  sheetHandle?: CSSProperties;
};

function toCssLength(
  value: number | string | undefined,
  fallback: string,
): string {
  if (value === undefined) {
    return fallback;
  }

  return typeof value === "number" ? `${value}px` : value;
}

/** Layout tokens as CSS custom properties on `.sheet`. */
export function buildSheetLayoutVars(
  layout: SheetGeometry = {},
): CSSProperties {
  return {
    "--sheet-handle-margin-top": toCssLength(
      layout.sheetHandleMarginTop,
      DEFAULT_SHEET_HANDLE_MARGIN_TOP,
    ),
    "--sheet-handle-bar-height": toCssLength(
      layout.sheetHandleBarHeight,
      DEFAULT_SHEET_HANDLE_BAR_HEIGHT,
    ),
    "--sheet-handle-margin-bottom": toCssLength(
      layout.sheetHandleMarginBottom,
      DEFAULT_SHEET_HANDLE_MARGIN_BOTTOM,
    ),
  } as CSSProperties;
}

export type SheetStyles = {
  sheet: CSSProperties;
  sheetHandle: CSSProperties;
};

/** Merge layout tokens with optional visual style overrides. */
export function buildSheetStyle(
  layout: SheetGeometry = {},
  styles: SheetVisualStyles = {},
): SheetStyles {
  return {
    sheet: {
      ...buildSheetLayoutVars(layout),
      ...styles.sheet,
    },
    sheetHandle: styles.sheetHandle ?? {},
  };
}
