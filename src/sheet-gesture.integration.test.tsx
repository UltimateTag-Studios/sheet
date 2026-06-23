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
const BUTTON_LIST_ROW_COUNT = 24;

function stubScrollRoot(scrollRoot: HTMLDivElement) {
  stubScrollRootDimensions(scrollRoot, 400, 2400);
}

function getScrollRoot(): HTMLDivElement {
  const body = document.querySelector("[data-sheet-scroll-root]");
  if (!(body instanceof HTMLDivElement)) {
    throw new Error("Expected sheet scroll root");
  }
  return body;
}

function sheetPhase(): string | null {
  return (
    document.querySelector(".sheet")?.getAttribute("data-sheet-phase") ?? null
  );
}

function completeSheetSettling() {
  const slide = document.querySelector<HTMLElement>(".sheet-slide");
  if (!slide) {
    throw new Error("Expected sheet slide");
  }

  act(() => {
    slide.dispatchEvent(
      new TransitionEvent("transitionend", {
        bubbles: true,
        propertyName: "height",
      }),
    );
  });
}

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

function TestFullSheetWithButtonList() {
  const [snap, setSnap] = useState<SheetSnap>("full");
  const [lastTappedRow, setLastTappedRow] = useState<number | null>(null);
  const [headerAction, setHeaderAction] = useState<string | null>(null);

  return (
    <>
      <div data-testid="snap">{snap}</div>
      <div data-testid="last-tapped-row">
        {lastTappedRow === null ? "none" : String(lastTappedRow)}
      </div>
      <div data-testid="header-action">{headerAction ?? "none"}</div>
      <Sheet snap={snap} onSnapChange={setSnap}>
        <SheetLayout
          header={
            <div className="sheet-header-actions">
              <button
                type="button"
                data-testid="header-dismiss"
                onClick={() => setHeaderAction("dismiss")}
              >
                Dismiss
              </button>
              <button
                type="button"
                data-testid="header-secondary"
                onClick={() => setHeaderAction("secondary")}
              >
                Secondary
              </button>
            </div>
          }
          body={
            <div data-testid="button-list">
              {Array.from({ length: BUTTON_LIST_ROW_COUNT }, (_, index) => {
                const row = index + 1;
                return (
                  <button
                    key={`row-${row}`}
                    type="button"
                    data-testid={`row-${row}`}
                    onClick={() => setLastTappedRow(row)}
                  >
                    Row {row}
                  </button>
                );
              })}
            </div>
          }
        />
      </Sheet>
    </>
  );
}

function TestHalfSheetWithHeaderAndBodyButtons() {
  const [snap, setSnap] = useState<SheetSnap>("collapsed");
  const [headerAction, setHeaderAction] = useState(false);
  const [bodyAction, setBodyAction] = useState(false);

  return (
    <>
      <div data-testid="snap">{snap}</div>
      <div data-testid="header-selected">{headerAction ? "yes" : "no"}</div>
      <div data-testid="body-selected">{bodyAction ? "yes" : "no"}</div>
      <Sheet snap={snap} onSnapChange={setSnap}>
        <SheetLayout
          header={
            <button
              type="button"
              data-testid="header-action-button"
              onClick={() => setHeaderAction(true)}
            >
              Header action
            </button>
          }
          body={
            <button
              type="button"
              data-testid="body-action-button"
              onClick={() => setBodyAction(true)}
            >
              Body action
            </button>
          }
        />
      </Sheet>
    </>
  );
}

function TestHalfSheetWithHeaderButtons() {
  const [snap, setSnap] = useState<SheetSnap>("half");
  const [headerAction, setHeaderAction] = useState<string | null>(null);

  return (
    <>
      <div data-testid="snap">{snap}</div>
      <div data-testid="header-action">{headerAction ?? "none"}</div>
      <Sheet snap={snap} onSnapChange={setSnap}>
        <SheetLayout
          header={
            <button
              type="button"
              data-testid="header-action-button"
              onClick={() => setHeaderAction("fired")}
            >
              Header action
            </button>
          }
          body={<div>Body</div>}
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
    <Sheet
      snap={snap}
      onSnapChange={setSnap}
      layout={{
        bottomChromeReserve: { reserve: "80px", gap: "16px" },
      }}
    >
      <SheetLayout
        header={<div data-testid="sheet-header">Header title</div>}
        body={
          <div data-testid="tall-body" style={{ height: "2000px" }}>
            Body
          </div>
        }
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
    completeSheetSettling();

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

    expect(screen.getByTestId("selected").textContent).toBe("yes");
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

  it("snaps chrome back to collapsed after a small handle drag", () => {
    renderWithHost(
      <Sheet
        snap="collapsed"
        layout={{ bottomChromeReserve: { reserve: "80px", gap: "0" } }}
      >
        <SheetLayout
          header={<div data-testid="sheet-header">Header title</div>}
          body={<div>Body</div>}
        />
      </Sheet>,
    );

    const initialHeight = slideHeightPx();
    const chrome = document.querySelector("[data-sheet-chrome]");
    if (!chrome) {
      throw new Error("Expected sheet chrome");
    }

    pointerDown(chrome, 13, 400);
    pointerMove(13, 380);
    expect(slideHeightPx()).toBeGreaterThan(initialHeight);

    pointerUp(13, 380);

    expect(slideHeightPx()).toBe(initialHeight);
    expect(
      document.querySelector(".sheet")?.getAttribute("data-sheet-phase"),
    ).toBe("settling");
  });

  it("emits onLayoutFrameChange during chrome drag with live visibleHeightPx", () => {
    const onLayoutFrameChange = vi.fn();

    renderWithHost(
      <Sheet snap="half" onLayoutFrameChange={onLayoutFrameChange}>
        <SheetLayout
          header={<div data-testid="sheet-header">Header title</div>}
          body={<div>Body</div>}
        />
      </Sheet>,
    );

    onLayoutFrameChange.mockClear();

    const chrome = document.querySelector("[data-sheet-chrome]");
    if (!chrome) {
      throw new Error("Expected sheet chrome");
    }

    pointerDown(chrome, 12, 500);
    pointerMove(12, 460);
    pointerMove(12, 420);

    expect(onLayoutFrameChange).toHaveBeenCalled();
    const dragFrames = onLayoutFrameChange.mock.calls
      .map(([frame]) => frame)
      .filter((frame) => frame.phase === "dragging");
    expect(dragFrames.length).toBeGreaterThan(0);
    const latestDragFrame = dragFrames.at(-1);
    expect(latestDragFrame?.visibleHeightPx).toBe(slideHeightPx());
    expect(latestDragFrame?.visibleHeightPx).toBeGreaterThan(400);

    pointerUp(12, 420);
  });

  describe("scrollable button list", () => {
    it("taps a row at scroll top without changing scroll or phase", () => {
      renderWithHost(<TestFullSheetWithButtonList />);

      const body = getScrollRoot();
      stubScrollRoot(body);

      const row = screen.getByTestId("row-1");
      pointerDown(row, 20, 500);
      pointerUp(20, 500);

      expect(screen.getByTestId("last-tapped-row").textContent).toBe("1");
      expect(body.scrollTop).toBe(0);
      expect(sheetPhase()).toBe("idle");
    });

    it("taps a row after scrolling mid-list", () => {
      renderWithHost(<TestFullSheetWithButtonList />);

      const body = getScrollRoot();
      stubScrollRoot(body);

      act(() => {
        body.scrollTop = 400;
      });

      const row = screen.getByTestId("row-15");
      pointerDown(row, 21, 500);
      pointerUp(21, 500);

      expect(screen.getByTestId("last-tapped-row").textContent).toBe("15");
      expect(screen.getByTestId("snap").textContent).toBe("full");
    });

    it("scrolls via drag on a row without activating it", () => {
      renderWithHost(<TestFullSheetWithButtonList />);

      const body = getScrollRoot();
      stubScrollRoot(body);

      const row = screen.getByTestId("row-3");
      pointerDown(row, 22, 500);
      pointerMove(22, 460);
      pointerMove(22, 440);
      pointerUp(22, 440);

      expect(body.scrollTop).toBeGreaterThan(0);
      expect(screen.getByTestId("last-tapped-row").textContent).toBe("none");
    });

    it("collapses from scroll top when dragging down on a row", () => {
      renderWithHost(<TestFullSheetWithButtonList />);

      const body = getScrollRoot();
      stubScrollRoot(body);

      const row = screen.getByTestId("row-2");
      pointerDown(row, 23, 400);
      pointerMove(23, 440);
      pointerMove(23, 480);

      expect(body.scrollTop).toBe(0);
      expect(sheetPhase()).toBe("dragging");
      expect(slideHeightPx()).toBeLessThan(DEFAULT_HOST_HEIGHT);
      expect(screen.getByTestId("last-tapped-row").textContent).toBe("none");
    });

    it("collapses from scrolled position when dragging down on a row", () => {
      renderWithHost(<TestFullSheetWithButtonList />);

      const body = getScrollRoot();
      stubScrollRoot(body);

      act(() => {
        body.scrollTop = 120;
      });

      const row = screen.getByTestId("row-8");
      pointerDown(row, 24, 300);
      pointerMove(24, 360);
      pointerMove(24, 420);
      pointerMove(24, 480);

      expect(body.scrollTop).toBe(0);
      expect(sheetPhase()).toBe("dragging");
      expect(slideHeightPx()).toBeLessThan(DEFAULT_HOST_HEIGHT);
      expect(screen.getByTestId("last-tapped-row").textContent).toBe("none");
    });
  });

  describe("header tap vs drag", () => {
    it("fires header action on tap at half snap without dragging", () => {
      renderWithHost(<TestHalfSheetWithHeaderButtons />);

      const button = screen.getByTestId("header-action-button");
      pointerDown(button, 30, 400);
      pointerUp(30, 400);

      expect(screen.getByTestId("header-action").textContent).toBe("fired");
      expect(sheetPhase()).toBe("idle");
    });

    it("activates a row when jitter crosses slop without sheet effect", () => {
      renderWithHost(<TestFullSheetWithButtonList />);

      const row = screen.getByTestId("row-1");
      pointerDown(row, 35, 500);
      pointerMove(35, 508);
      pointerUp(35, 508);

      expect(screen.getByTestId("last-tapped-row").textContent).toBe("1");
      expect(sheetPhase()).toBe("idle");
    });

    it("drags sheet from header button after move slop without firing action", () => {
      renderWithHost(<TestHalfSheetWithHeaderButtons />);

      const button = screen.getByTestId("header-action-button");
      const slide = document.querySelector<HTMLElement>(".sheet-slide");
      if (!slide) {
        throw new Error("Expected sheet slide");
      }
      const initialHeight = slideHeightPx();

      dragSurface(button, 31, 400, 550);

      expect(screen.getByTestId("header-action").textContent).toBe("none");
      expect(slideHeightPx()).not.toBe(initialHeight);
    });

    it("fires header dismiss on tap at full snap", () => {
      renderWithHost(<TestFullSheetWithButtonList />);

      const button = screen.getByTestId("header-dismiss");
      pointerDown(button, 32, 200);
      pointerUp(32, 200);

      expect(screen.getByTestId("header-action").textContent).toBe("dismiss");
      expect(sheetPhase()).toBe("idle");
    });

    it("drags sheet from handle after move slop", () => {
      renderWithHost(<TestSheet />);

      const handle = document.querySelector(".sheet-handle");
      if (!handle) {
        throw new Error("Expected sheet handle");
      }

      dragSurface(handle, 33, 400, 100);

      expect(screen.getByTestId("snap").textContent).toBe("full");
    });

    it("activates header and body buttons on first tap after chrome drag from collapsed", () => {
      renderWithHost(<TestHalfSheetWithHeaderAndBodyButtons />);

      const chrome = document.querySelector("[data-sheet-chrome]");
      if (!chrome) {
        throw new Error("Expected sheet chrome");
      }

      dragSurface(chrome, 40, 700, 400);

      const headerButton = screen.getByTestId("header-action-button");
      pointerDown(headerButton, 41, 420);
      pointerUp(41, 420);
      expect(screen.getByTestId("header-selected").textContent).toBe("yes");

      const bodyButton = screen.getByTestId("body-action-button");
      pointerDown(bodyButton, 42, 500);
      pointerUp(42, 500);
      expect(screen.getByTestId("body-selected").textContent).toBe("yes");
    });

    it("does not preventDefault on pointerup over an outside button after a drag", () => {
      renderWithHost(<TestHalfSheetWithHeaderAndBodyButtons />);

      const outside = document.createElement("button");
      outside.type = "button";
      outside.textContent = "Outside";
      let defaultPreventedBySheetRouter = false;
      outside.addEventListener(
        "pointerup",
        (event) => {
          defaultPreventedBySheetRouter = event.defaultPrevented;
        },
        { capture: true },
      );
      document.body.appendChild(outside);

      const chrome = document.querySelector("[data-sheet-chrome]");
      if (!chrome) {
        throw new Error("Expected sheet chrome");
      }

      pointerDown(chrome, 50, 700);
      pointerMove(50, 500);
      act(() => {
        outside.dispatchEvent(
          new PointerEvent("pointerup", {
            pointerId: 50,
            clientY: 10,
            bubbles: true,
            button: 0,
            cancelable: true,
          }),
        );
      });

      expect(defaultPreventedBySheetRouter).toBe(false);

      outside.remove();
    });
  });
});
