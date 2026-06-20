/** @vitest-environment jsdom */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Sheet, type SheetSnap } from "./sheet";
import { SheetLayout } from "./sheet-layout";

function TestSheet() {
  const [snap, setSnap] = useState<SheetSnap>("half");

  return (
    <>
      <div data-testid="snap">{snap}</div>
      <Sheet snap={snap} onSnapChange={setSnap}>
        <SheetLayout
          header={<div data-testid="sheet-header">Header title</div>}
          body={<div>Body</div>}
        />
      </Sheet>
    </>
  );
}

function TestFullSheetWithScroll() {
  const [snap, setSnap] = useState<SheetSnap>("full");

  return (
    <>
      <div data-testid="snap">{snap}</div>
      <Sheet snap={snap} onSnapChange={setSnap}>
        <SheetLayout
          header={<div data-testid="sheet-header">Header title</div>}
          body={
            <div data-testid="tall-body" style={{ height: "2000px" }}>
              Body
            </div>
          }
        />
      </Sheet>
    </>
  );
}

function dragSurface(
  surface: Element,
  pointerId: number,
  startY: number,
  endY: number,
) {
  act(() => {
    fireEvent.pointerDown(surface, {
      pointerId,
      clientY: startY,
      button: 0,
    });
  });

  act(() => {
    document.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId,
        clientY: endY,
        bubbles: true,
      }),
    );
  });

  act(() => {
    document.dispatchEvent(
      new PointerEvent("pointerup", {
        pointerId,
        clientY: endY,
        bubbles: true,
      }),
    );
  });
}

describe("Sheet gesture integration", () => {
  afterEach(() => {
    cleanup();
  });

  it("drags the chrome unit (handle, header, divider) toward full", () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
      writable: true,
    });

    render(<TestSheet />);

    const chrome = document.querySelector("[data-sheet-chrome]");
    if (!chrome) {
      throw new Error("Expected sheet chrome");
    }

    dragSurface(chrome, 1, 400, 100);

    expect(screen.getByTestId("snap").textContent).toBe("full");
    expect(document.querySelector(".sheet-drawer")?.style.transform).toBe(
      "translate3d(0, 0px, 0)",
    );
  });

  it("drags chrome from full when body is scrolled and resets scroll on snap change", () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
      writable: true,
    });

    render(<TestFullSheetWithScroll />);

    const scrollRoot = document.querySelector("[data-sheet-scroll-root]");
    if (!(scrollRoot instanceof HTMLDivElement)) {
      throw new Error("Expected sheet scroll root");
    }

    act(() => {
      scrollRoot.scrollTop = 120;
    });
    expect(scrollRoot.scrollTop).toBe(120);

    const chrome = document.querySelector("[data-sheet-chrome]");
    if (!chrome) {
      throw new Error("Expected sheet chrome");
    }

    dragSurface(chrome, 2, 200, 500);

    expect(screen.getByTestId("snap").textContent).not.toBe("full");
    expect(scrollRoot.scrollTop).toBe(0);
  });
});
