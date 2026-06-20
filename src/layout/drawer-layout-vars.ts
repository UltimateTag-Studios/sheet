import type { CSSProperties } from "react";

export const DEFAULT_SHEET_HANDLE_MARGIN_TOP = "0.75rem";
export const DEFAULT_SHEET_HANDLE_BAR_HEIGHT = "0.25rem";
export const DEFAULT_SHEET_HANDLE_MARGIN_BOTTOM = "0.75rem";

export type SheetGeometry = {
  drawerHandleMarginTop?: number | string;
  drawerHandleBarHeight?: number | string;
  drawerHandleMarginBottom?: number | string;
};

export type SheetVisualStyles = {
  drawer?: CSSProperties;
  drawerHandle?: CSSProperties;
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

/** Layout tokens as CSS custom properties on `.sheet-drawer`. */
export function buildSheetLayoutVars(
  layout: SheetGeometry = {},
): CSSProperties {
  return {
    "--sheet-handle-margin-top": toCssLength(
      layout.drawerHandleMarginTop,
      DEFAULT_SHEET_HANDLE_MARGIN_TOP,
    ),
    "--sheet-handle-bar-height": toCssLength(
      layout.drawerHandleBarHeight,
      DEFAULT_SHEET_HANDLE_BAR_HEIGHT,
    ),
    "--sheet-handle-margin-bottom": toCssLength(
      layout.drawerHandleMarginBottom,
      DEFAULT_SHEET_HANDLE_MARGIN_BOTTOM,
    ),
  } as CSSProperties;
}

export type SheetDrawerStyle = {
  drawer: CSSProperties;
  drawerHandle: CSSProperties;
};

/** Merge layout tokens with optional visual style overrides. */
export function buildSheetStyle(
  layout: SheetGeometry = {},
  styles: SheetVisualStyles = {},
): SheetDrawerStyle {
  return {
    drawer: {
      ...buildSheetLayoutVars(layout),
      ...styles.drawer,
    },
    drawerHandle: styles.drawerHandle ?? {},
  };
}
