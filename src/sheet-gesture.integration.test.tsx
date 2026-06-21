/** @vitest-environment jsdom */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { type ReactElement, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SheetHost } from "./context/sheet-host-context";
import { Sheet, type SheetSnap } from "./sheet";
import { SheetLayout } from "./sheet-layout";

const DEFAULT_HOST_HEIGHT = 800;

function stubHostHeight(host: Element, heightPx: number) {
  Object.defineProperty(host, "clientHeight", {
    configurable: true,
    value: heightPx,
  });
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

function renderWithHost(ui: ReactElement, hostHeight = DEFAULT_HOST_HEIGHT) {
  render(
    <SheetHost
      className="sheet-host"
      style={{ height: `${hostHeight}px`, width: "100%" }}
    >
      {ui}
    </SheetHost>,
  );
  const host = document.querySelector(".sheet-host");
  if (host) {
    stubHostHeight(host, hostHeight);
  }
}

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

function TestCollapsedSheet() {
  const [snap, setSnap] = useState<SheetSnap>("collapsed");

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

function TestFullSheetWithBottomReserve() {
  const [snap, setSnap] = useState<SheetSnap>("full");

  return (
    <Sheet snap={snap} onSnapChange={setSnap}>
      <SheetLayout
        header={<div data-testid="sheet-header">Header title</div>}
        body={
          <div data-testid="tall-body" style={{ height: "2000px" }}>
            Body
          </div>
        }
        bottomReserve="80px"
        bodyInnerStyle={{ paddingBottom: "16px" }}
      />
    </Sheet>
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

function slideHeightPx(): number {
  const slide = document.querySelector<HTMLElement>(".sheet-slide");
  return Number.parseInt(slide?.style.height ?? "0", 10);
}

describe("Sheet gesture integration", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders nothing without SheetHost", () => {
    render(<TestSheet />);
    expect(document.querySelector(".sheet")).toBeNull();
  });

  it("shows header chrome at collapsed snap with bottom-anchored height", () => {
    renderWithHost(<TestCollapsedSheet />);

    const slide = document.querySelector<HTMLElement>(".sheet-slide");
    const header = screen.getByTestId("sheet-header");
    expect(slide?.style.height).not.toBe("");
    expect(slideHeightPx()).toBeGreaterThan(80);
    expect(header).toBeTruthy();
  });

  it("drags the chrome unit (handle, header, divider) toward full", () => {
    renderWithHost(<TestSheet />);

    const chrome = document.querySelector("[data-sheet-chrome]");
    if (!chrome) {
      throw new Error("Expected sheet chrome");
    }

    dragSurface(chrome, 1, 400, 100);

    expect(screen.getByTestId("snap").textContent).toBe("full");
    expect(
      document.querySelector<HTMLElement>(".sheet-slide")?.style.height,
    ).toBe(`${DEFAULT_HOST_HEIGHT}px`);
  });

  it("drags chrome from full when body is scrolled and resets scroll on snap change", () => {
    renderWithHost(<TestFullSheetWithScroll />);

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
    renderWithHost(<TestHalfSheetWithScroll />);

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
    renderWithHost(<TestFullSheetWithScroll />);

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
    expect(slideHeightPx()).toBeLessThan(DEFAULT_HOST_HEIGHT);
  });

  it("collapses from full at scroll top without snapping back on release", () => {
    renderWithHost(<TestFullSheetWithScroll />);

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

  it("continues body scroll momentum after a fast fling release", async () => {
    vi.useFakeTimers({ toFake: ["performance", "requestAnimationFrame"] });

    renderWithHost(<TestFullSheetWithScroll />);

    const body = document.querySelector("[data-sheet-scroll-root]");
    if (!(body instanceof HTMLDivElement)) {
      throw new Error("Expected sheet scroll root");
    }

    stubScrollRootDimensions(body, 400, 2000);

    pointerDown(body, 6, 500);
    vi.advanceTimersByTime(20);
    pointerMove(6, 460);
    vi.advanceTimersByTime(20);
    pointerMove(6, 420);
    vi.advanceTimersByTime(20);
    pointerMove(6, 380);
    vi.advanceTimersByTime(20);
    pointerMove(6, 340);

    const scrollAtRelease = body.scrollTop;
    expect(scrollAtRelease).toBeGreaterThan(0);

    pointerUp(6, 340);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(body.scrollTop).toBeGreaterThan(scrollAtRelease);

    vi.useRealTimers();
  });

  it("activates a body button on the first tap at half snap", () => {
    renderWithHost(<TestHalfSheetWithBodyButton />);

    const button = screen.getByTestId("body-action");
    pointerDown(button, 7, 400);
    pointerUp(7, 400);

    act(() => {
      fireEvent.click(button);
    });

    expect(screen.getByTestId("selected").textContent).toBe("yes");
    expect(
      document.querySelector(".sheet")?.getAttribute("data-sheet-phase"),
    ).toBe("idle");
  });

  it("drags the sheet from a body button after move slop without activating it", () => {
    renderWithHost(<TestHalfSheetWithBodyButton />);

    const button = screen.getByTestId("body-action");
    const body = document.querySelector("[data-sheet-scroll-root]");
    if (!(body instanceof HTMLDivElement)) {
      throw new Error("Expected sheet scroll root");
    }
    const slide = document.querySelector<HTMLElement>(".sheet-slide");
    if (!slide) {
      throw new Error("Expected sheet slide");
    }
    const initialHeight = slide.style.height;

    pointerDown(body, 8, 400);
    pointerMove(8, 600);

    expect(
      document.querySelector(".sheet")?.getAttribute("data-sheet-phase"),
    ).toBe("dragging");
    expect(slide.style.height).not.toBe(initialHeight);

    pointerUp(8, 600);

    expect(screen.getByTestId("selected").textContent).toBe("no");

    pointerDown(button, 9, 400);
    expect(
      document.querySelector(".sheet")?.getAttribute("data-sheet-phase"),
    ).toBe("idle");
    pointerMove(9, 600);
    expect(
      document.querySelector(".sheet")?.getAttribute("data-sheet-phase"),
    ).toBe("dragging");
  });

  it("does not steal first body tap at half snap before move slop", () => {
    renderWithHost(<TestHalfSheetWithBodyButton />);

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

  it("scrolls body through bottom reserve with combined scroll padding", () => {
    renderWithHost(<TestFullSheetWithBottomReserve />);

    const scrollRoot = document.querySelector("[data-sheet-scroll-root]");
    const inner = scrollRoot?.firstElementChild;
    const reserve = document.querySelector<HTMLElement>(
      ".sheet-bottom-reserve",
    );

    expect(scrollRoot).toBeTruthy();
    expect(inner).toBeTruthy();
    expect(reserve).toBeTruthy();

    if (!(inner instanceof HTMLDivElement) || !reserve) {
      throw new Error("Expected sheet layout nodes");
    }

    expect(reserve.style.height).toBe("80px");
    expect(inner.style.paddingBottom).toBe("calc(96px)");
  });

  it("expands sheet to full host height", () => {
    renderWithHost(<TestCollapsedSheet />);

    const chrome = document.querySelector("[data-sheet-chrome]");
    if (!chrome) {
      throw new Error("Expected sheet chrome");
    }

    dragSurface(chrome, 10, 750, 20);

    expect(screen.getByTestId("snap").textContent).toBe("full");
    expect(
      document.querySelector<HTMLElement>(".sheet-slide")?.style.height,
    ).toBe(`${DEFAULT_HOST_HEIGHT}px`);
  });

  it("drags chrome from full height inside a shorter host", () => {
    renderWithHost(<TestFullSheetWithScroll />, 640);

    const chrome = document.querySelector("[data-sheet-chrome]");
    if (!chrome) {
      throw new Error("Expected sheet chrome");
    }

    dragSurface(chrome, 11, 200, 500);

    expect(screen.getByTestId("snap").textContent).not.toBe("full");
  });
});
