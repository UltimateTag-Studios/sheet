import type { CSSProperties } from "react";

export const DEFAULT_SHEET_HANDLE_MARGIN_TOP = "0.75rem";
export const DEFAULT_SHEET_HANDLE_MARGIN_BOTTOM = "0.75rem";
export const DEFAULT_SHEET_HANDLE_BAR_HEIGHT = "0.25rem";
export const DEFAULT_SHEET_HANDLE_WIDTH = "2.5rem";
export const DEFAULT_SHEET_BORDER_RADIUS = "0.75rem";
export const DEFAULT_SHEET_HEADER_PADDING_HORIZONTAL = "0";
export const DEFAULT_SHEET_HEADER_PADDING_VERTICAL = "0";
export const DEFAULT_SHEET_DIVIDER_HEIGHT = "1px";
export const DEFAULT_SHEET_DIVIDER_PADDING_HORIZONTAL = "0";
export const DEFAULT_SHEET_DIVIDER_PADDING_VERTICAL = "0";
export const DEFAULT_SHEET_BODY_PADDING_HORIZONTAL = "0";
export const DEFAULT_SHEET_BODY_PADDING_VERTICAL = "0";
export const DEFAULT_SHEET_BODY_GAP = "0";
export const DEFAULT_SHEET_LIST_ITEM_GAP = "0.5rem";

export type SheetHandleLayout = {
  marginTop?: number | string;
  marginBottom?: number | string;
  height?: number | string;
  width?: number | string;
};

/** Rounded top corners of the sheet panel (`.sheet-slide` in the DOM). */
export type SheetPanelLayout = {
  borderRadius?: number | string;
};

export type SheetSectionPaddingLayout = {
  paddingHorizontal?: number | string;
  paddingVertical?: number | string;
};

export type SheetDividerLayout = SheetSectionPaddingLayout & {
  height?: number | string;
};

export type SheetBodyLayout = SheetSectionPaddingLayout & {
  gap?: number | string;
};

export type SheetListItemLayout = {
  gap?: number | string;
};

export type SheetBottomChromeReserveLayout = {
  /** Always-on reserve spacer height (e.g. tab bar clearance). CSS length. */
  reserve: string;
  /** Scroll-end breathing room above the reserve. CSS length. */
  gap: string;
};

/** Geometry tokens for every sheet surface — colors come from `theme` + CSS classes. */
export type SheetLayout = {
  handle?: SheetHandleLayout;
  sheet?: SheetPanelLayout;
  header?: SheetSectionPaddingLayout;
  divider?: SheetDividerLayout;
  body?: SheetBodyLayout;
  listItem?: SheetListItemLayout;
  bottomChromeReserve?: SheetBottomChromeReserveLayout;
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

/** Layout tokens as CSS custom properties on `.sheet-slide`. */
export function buildSheetLayoutVars(layout: SheetLayout = {}): CSSProperties {
  const handle = layout.handle ?? {};
  const sheet = layout.sheet ?? {};
  const header = layout.header ?? {};
  const divider = layout.divider ?? {};
  const body = layout.body ?? {};
  const listItem = layout.listItem ?? {};

  return {
    "--sheet-handle-margin-top": toCssLength(
      handle.marginTop,
      DEFAULT_SHEET_HANDLE_MARGIN_TOP,
    ),
    "--sheet-handle-margin-bottom": toCssLength(
      handle.marginBottom,
      DEFAULT_SHEET_HANDLE_MARGIN_BOTTOM,
    ),
    "--sheet-handle-bar-height": toCssLength(
      handle.height,
      DEFAULT_SHEET_HANDLE_BAR_HEIGHT,
    ),
    "--sheet-handle-width": toCssLength(
      handle.width,
      DEFAULT_SHEET_HANDLE_WIDTH,
    ),
    "--sheet-border-radius": toCssLength(
      sheet.borderRadius,
      DEFAULT_SHEET_BORDER_RADIUS,
    ),
    "--sheet-header-padding-inline": toCssLength(
      header.paddingHorizontal,
      DEFAULT_SHEET_HEADER_PADDING_HORIZONTAL,
    ),
    "--sheet-header-padding-block": toCssLength(
      header.paddingVertical,
      DEFAULT_SHEET_HEADER_PADDING_VERTICAL,
    ),
    "--sheet-divider-height": toCssLength(
      divider.height,
      DEFAULT_SHEET_DIVIDER_HEIGHT,
    ),
    "--sheet-divider-padding-inline": toCssLength(
      divider.paddingHorizontal,
      DEFAULT_SHEET_DIVIDER_PADDING_HORIZONTAL,
    ),
    "--sheet-divider-padding-block": toCssLength(
      divider.paddingVertical,
      DEFAULT_SHEET_DIVIDER_PADDING_VERTICAL,
    ),
    "--sheet-body-padding-inline": toCssLength(
      body.paddingHorizontal,
      DEFAULT_SHEET_BODY_PADDING_HORIZONTAL,
    ),
    "--sheet-body-padding-block": toCssLength(
      body.paddingVertical,
      DEFAULT_SHEET_BODY_PADDING_VERTICAL,
    ),
    "--sheet-body-gap": toCssLength(body.gap, DEFAULT_SHEET_BODY_GAP),
    "--sheet-list-item-gap": toCssLength(
      listItem.gap,
      DEFAULT_SHEET_LIST_ITEM_GAP,
    ),
  } as CSSProperties;
}

export function mergeSheetLayout(
  base: SheetLayout,
  overrides: SheetLayout = {},
): SheetLayout {
  const merged: SheetLayout = {};

  if (base.handle || overrides.handle) {
    merged.handle = { ...base.handle, ...overrides.handle };
  }
  if (base.sheet || overrides.sheet) {
    merged.sheet = { ...base.sheet, ...overrides.sheet };
  }
  if (base.header || overrides.header) {
    merged.header = { ...base.header, ...overrides.header };
  }
  if (base.divider || overrides.divider) {
    merged.divider = { ...base.divider, ...overrides.divider };
  }
  if (base.body || overrides.body) {
    merged.body = { ...base.body, ...overrides.body };
  }
  if (base.listItem || overrides.listItem) {
    merged.listItem = { ...base.listItem, ...overrides.listItem };
  }
  if (base.bottomChromeReserve || overrides.bottomChromeReserve) {
    merged.bottomChromeReserve = {
      ...base.bottomChromeReserve,
      ...overrides.bottomChromeReserve,
    };
  }

  return merged;
}
