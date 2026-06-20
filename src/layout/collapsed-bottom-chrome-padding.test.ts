import { describe, expect, it } from "vitest";

import { showCollapsedBottomChromePadding } from "./collapsed-bottom-chrome-padding";

describe("showCollapsedBottomChromePadding", () => {
  it("is false when bottom chrome reserve is disabled", () => {
    expect(
      showCollapsedBottomChromePadding({
        reserveBottomChrome: false,
        sheetSnap: "collapsed",
        isDragging: false,
        visibleHeightPx: 150,
        collapsedHeightPx: 150,
      }),
    ).toBe(false);
  });

  it("is true at collapsed snap when idle", () => {
    expect(
      showCollapsedBottomChromePadding({
        reserveBottomChrome: true,
        sheetSnap: "collapsed",
        isDragging: false,
        visibleHeightPx: 150,
        collapsedHeightPx: 150,
      }),
    ).toBe(true);
  });

  it("tracks live collapsed height while dragging", () => {
    expect(
      showCollapsedBottomChromePadding({
        reserveBottomChrome: true,
        sheetSnap: "half",
        isDragging: true,
        visibleHeightPx: 151,
        collapsedHeightPx: 150,
      }),
    ).toBe(true);
    expect(
      showCollapsedBottomChromePadding({
        reserveBottomChrome: true,
        sheetSnap: "half",
        isDragging: true,
        visibleHeightPx: 360,
        collapsedHeightPx: 150,
      }),
    ).toBe(false);
  });
});
