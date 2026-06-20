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

function TestHalfSheetWithScroll() {
  const [snap, setSnap] = useState<SheetSnap>("half");

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

function TestHalfSheetWithBodyButton() {
  const [snap, setSnap] = useState<SheetSnap>("half");
  const [selected, setSelected] = useState(false);

  return (
    <>
      <div data-testid="selected">{selected ? "yes" : "no"}</div>
      <Sheet snap={snap} onSnapChange={setSnap}>
        <SheetLayout
          header={<div data-testid="sheet-header">Header title</div>}
          body={
            <button
              type="button"
              data-testid="body-action"
              onClick={() => setSelected(true)}
            >
              Select
            </button>
          }
        />
      </Sheet>
    </>
  );
}

function stubScrollRootDimensions(
  scrollRoot: HTMLDivElement,
  clientHeight: number,
  scrollHeight: number,
) {
  Object.defineProperty(scrollRoot, "clientHeight", {
    configurable: true,
    value: clientHeight,
  });
  Object.defineProperty(scrollRoot, "scrollHeight", {
    configurable: true,
    value: scrollHeight,
  });
}

function pointerDown(surface: Element, pointerId: number, clientY: number) {
  act(() => {
    fireEvent.pointerDown(surface, {
      pointerId,
      clientY,
      button: 0,
    });
  });
}

function pointerMove(pointerId: number, clientY: number) {
  act(() => {
    document.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId,
        clientY,
        bubbles: true,
      }),
    );
  });
}

function pointerUp(pointerId: number, clientY: number) {
  act(() => {
    document.dispatchEvent(
      new PointerEvent("pointerup", {
        pointerId,
        clientY,
        bubbles: true,
      }),
    );
  });
}

function dragSurface(
  surface: Element,
  pointerId: number,
  startY: number,
  endY: number,
) {
  pointerDown(surface, pointerId, startY);
  pointerMove(pointerId, endY);
  pointerUp(pointerId, endY);
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
    expect(document.querySelector<HTMLElement>(".sheet")?.style.transform).toBe(
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

  it("transitions from half sheet drag to body scroll at full height", () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
      writable: true,
    });

    render(<TestHalfSheetWithScroll />);

    const body = document.querySelector("[data-sheet-scroll-root]");
    if (!(body instanceof HTMLDivElement)) {
      throw new Error("Expected sheet scroll root");
    }

    stubScrollRootDimensions(body, 400, 2000);

    pointerDown(body, 3, 500);
    pointerMove(3, 100);
    pointerMove(3, 80);

    expect(body.scrollTop).toBeGreaterThan(0);
  });

  it("collapses from full when body scroll reaches top during one drag", () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
      writable: true,
    });

    render(<TestFullSheetWithScroll />);

    const body = document.querySelector("[data-sheet-scroll-root]");
    if (!(body instanceof HTMLDivElement)) {
      throw new Error("Expected sheet scroll root");
    }

    act(() => {
      body.scrollTop = 120;
    });

    stubScrollRootDimensions(body, 400, 2000);

    pointerDown(body, 4, 300);
    pointerMove(4, 360);
    pointerMove(4, 420);
    pointerMove(4, 480);

    expect(body.scrollTop).toBe(0);
    expect(
      document.querySelector(".sheet")?.getAttribute("data-sheet-phase"),
    ).toBe("dragging");
    const sheetEl = document.querySelector<HTMLElement>(".sheet");
    expect(
      Number.parseInt(
        sheetEl?.style.transform.match(/translate3d\(0, (\d+)px, 0\)/)?.[1] ??
          "0",
        10,
      ),
    ).toBeGreaterThan(0);
  });

  it("collapses from full at scroll top without snapping back on release", () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
      writable: true,
    });

    render(<TestFullSheetWithScroll />);

    const body = document.querySelector("[data-sheet-scroll-root]");
    if (!(body instanceof HTMLDivElement)) {
      throw new Error("Expected sheet scroll root");
    }

    stubScrollRootDimensions(body, 400, 2000);

    pointerDown(body, 5, 300);
    pointerMove(5, 520);
    pointerUp(5, 520);

    expect(screen.getByTestId("snap").textContent).not.toBe("full");
  });

  it("does not steal first body tap at half snap before move slop", () => {
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
      writable: true,
    });

    render(<TestHalfSheetWithBodyButton />);

    const button = screen.getByTestId("body-action");
    const body = document.querySelector("[data-sheet-scroll-root]");
    if (!(body instanceof HTMLDivElement)) {
      throw new Error("Expected sheet scroll root");
    }

    let defaultPreventedOnDown = false;
    const recordDefaultPrevented = (event: Event) => {
      defaultPreventedOnDown = event.defaultPrevented;
    };
    body.addEventListener("pointerdown", recordDefaultPrevented);

    pointerDown(button, 7, 400);

    expect(defaultPreventedOnDown).toBe(false);
    expect(
      document.querySelector(".sheet")?.getAttribute("data-sheet-phase"),
    ).toBe("idle");

    pointerUp(7, 400);

    expect(
      document.querySelector(".sheet")?.getAttribute("data-sheet-phase"),
    ).toBe("idle");

    body.removeEventListener("pointerdown", recordDefaultPrevented);
  });
});
