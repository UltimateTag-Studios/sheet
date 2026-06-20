import { describe, expect, it } from "vitest";

import {
  canBodyScroll,
  SHEET_BODY_DRAG_CLASS,
  SHEET_BODY_ROOT_BASE_CLASS,
  SHEET_BODY_SCROLLABLE_CLASS,
  sheetBodyRootClass,
} from "./scroll-mode";

describe("canBodyScroll", () => {
  it("is false for collapsed and half when idle", () => {
    expect(
      canBodyScroll({
        sheetSnap: "collapsed",
        visibleHeightPx: 150,
        fullHeightPx: 700,
        isDragging: false,
      }),
    ).toBe(false);
    expect(
      canBodyScroll({
        sheetSnap: "half",
        visibleHeightPx: 350,
        fullHeightPx: 700,
        isDragging: false,
      }),
    ).toBe(false);
  });

  it("is true at full snap when idle", () => {
    expect(
      canBodyScroll({
        sheetSnap: "full",
        visibleHeightPx: 700,
        fullHeightPx: 700,
        isDragging: false,
      }),
    ).toBe(true);
  });

  it("uses live height while dragging", () => {
    expect(
      canBodyScroll({
        sheetSnap: "half",
        visibleHeightPx: 360,
        fullHeightPx: 700,
        isDragging: true,
      }),
    ).toBe(false);
    expect(
      canBodyScroll({
        sheetSnap: "half",
        visibleHeightPx: 698,
        fullHeightPx: 700,
        isDragging: true,
      }),
    ).toBe(true);
  });
});

describe("sheetBodyRootClass", () => {
  it("uses scroll modifier only when body scroll is enabled", () => {
    expect(sheetBodyRootClass(true)).toContain(SHEET_BODY_SCROLLABLE_CLASS);
    expect(sheetBodyRootClass(false)).toContain(SHEET_BODY_DRAG_CLASS);
    expect(sheetBodyRootClass(false)).not.toContain(
      SHEET_BODY_SCROLLABLE_CLASS,
    );
  });

  it("exports shared base classes", () => {
    expect(SHEET_BODY_ROOT_BASE_CLASS).toBe("sheet-body-root");
    expect(SHEET_BODY_SCROLLABLE_CLASS).toBe("sheet-body-root--scroll");
    expect(SHEET_BODY_DRAG_CLASS).toBe("sheet-body-root--drag");
  });
});
