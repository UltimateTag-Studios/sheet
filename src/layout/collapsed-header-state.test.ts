import { describe, expect, it } from "vitest";

import { isSheetAtCollapsedHeader } from "./collapsed-header-state";

describe("isSheetAtCollapsedHeader", () => {
  it("is true when resting at collapsed snap", () => {
    expect(
      isSheetAtCollapsedHeader({
        sheetSnap: "collapsed",
        isDragging: false,
        visibleHeightPx: 150,
        collapsedHeightPx: 150,
      }),
    ).toBe(true);
  });

  it("is true while dragging near collapsed height", () => {
    expect(
      isSheetAtCollapsedHeader({
        sheetSnap: "half",
        isDragging: true,
        visibleHeightPx: 151,
        collapsedHeightPx: 150,
      }),
    ).toBe(true);
  });

  it("is false while dragging above collapsed height", () => {
    expect(
      isSheetAtCollapsedHeader({
        sheetSnap: "half",
        isDragging: true,
        visibleHeightPx: 200,
        collapsedHeightPx: 150,
      }),
    ).toBe(false);
  });
});
