import { afterEach, describe, expect, it, vi } from "vitest";

import {
  measureChromeHeightPx,
  measureCollapsedHeightPx,
  measureHandleBlockHeightPx,
  readHostHeightPx,
  sheetSnapPointPx,
} from "./snap-heights";

function stubOffsetHeight(element: HTMLElement, height: number) {
  Object.defineProperty(element, "offsetHeight", {
    configurable: true,
    value: height,
  });
}

describe("snap-heights", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("formats pixel snap points", () => {
    expect(sheetSnapPointPx(152.4)).toBe("152px");
  });

  it("includes handle top and bottom margins in handle block height", () => {
    const handle = document.createElement("div");
    stubOffsetHeight(handle, 4);
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      marginTop: "12px",
      marginBottom: "8px",
    } as CSSStyleDeclaration);

    expect(measureHandleBlockHeightPx(handle)).toBe(24);
  });

  it("uses chrome height plus bottom reserve for collapsed snap", () => {
    const chrome = document.createElement("div");
    stubOffsetHeight(chrome, 136);

    expect(measureCollapsedHeightPx(chrome, 800, 0.5, 8)).toBe(144);
  });

  it("falls back when nothing is measured", () => {
    expect(measureCollapsedHeightPx(null, 800)).toBe(150);
  });

  it("never returns a collapsed height at or above half the viewport", () => {
    const chrome = document.createElement("div");
    stubOffsetHeight(chrome, 616);

    expect(measureCollapsedHeightPx(chrome, 800)).toBe(399);
  });

  it("measures chrome block height", () => {
    const chrome = document.createElement("div");
    stubOffsetHeight(chrome, 120);

    expect(measureChromeHeightPx(chrome)).toBe(120);
  });

  it("reads host height from a laid-out element", () => {
    const host = document.createElement("div");
    Object.defineProperty(host, "clientHeight", {
      configurable: true,
      value: 640,
    });

    expect(readHostHeightPx(host)).toBe(640);
  });
});
