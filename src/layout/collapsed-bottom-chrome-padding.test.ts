import { describe, expect, it } from "vitest";

import {
  isSheetCollapsedPeek,
  showCollapsedBottomChromePadding,
} from "./collapsed-bottom-chrome-padding";

describe("isSheetCollapsedPeek", () => {
  it("is true at collapsed snap when idle", () => {
    expect(
      isSheetCollapsedPeek({
        sheetSnap: "collapsed",
        isDragging: false,
        visibleHeightPx: 150,
        collapsedHeightPx: 150,
      }),
    ).toBe(true);
  });

  it("is false at half snap when idle", () => {
    expect(
      isSheetCollapsedPeek({
        sheetSnap: "half",
        isDragging: false,
        visibleHeightPx: 360,
        collapsedHeightPx: 150,
      }),
    ).toBe(false);
  });

  it("tracks live collapsed height while dragging", () => {
    expect(
      isSheetCollapsedPeek({
        sheetSnap: "half",
        isDragging: true,
        visibleHeightPx: 151,
        collapsedHeightPx: 150,
      }),
    ).toBe(true);
  });
});

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
