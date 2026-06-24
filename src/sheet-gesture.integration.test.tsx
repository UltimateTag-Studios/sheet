/** @vitest-environment jsdom */

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { deactivatePostDragClickRepairForTests } from "./gesture/activate-post-drag-click-repair";
import { Sheet } from "./sheet";
import {
  completeSheetSettling,
  DEFAULT_HOST_HEIGHT,
  dragSurface,
  flushTapClickSynthesis,
  getScrollRoot,
  LiveHeightProbe,
  liveHeightReader,
  pointerDown,
  pointerMove,
  pointerTap,
  pointerUp,
  renderWithHost,
  sheetPhase,
  slideHeightPx,
  stubScrollRoot,
  stubScrollRootDimensions,
  TestCollapsedSheet,
  TestCollapsedSheetWithSettleSync,
  TestContractListSelectPattern,
  TestFullSheetWithBottomReserve,
  TestFullSheetWithButtonList,
  TestFullSheetWithScroll,
  TestFullSheetWithSettleCallback,
  TestHalfSheetWithBodyButton,
  TestHalfSheetWithHeaderAndBodyButtons,
  TestHalfSheetWithHeaderButtons,
  TestHalfSheetWithScroll,
  TestHalfSheetWithSnapCommands,
  TestSheet,
} from "./sheet-gesture/fixtures";
import { SheetLayout } from "./sheet-layout";

describe("Sheet gesture integration", () => {
  afterEach(() => {
    deactivatePostDragClickRepairForTests();
    cleanup();
  });

  it("renders nothing without SheetHost", () => {
    render(<TestSheet />);
    expect(document.querySelector(".sheet")).toBeNull();
  });

  it("shows header chrome at collapsed snap with bottom-anchored height", () => {
    renderWithHost(<TestCollapsedSheet />);

    const slide = document.querySelector<HTMLElement>(".sheet");
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
    expect(document.querySelector<HTMLElement>(".sheet")?.style.height).toBe(
      `${DEFAULT_HOST_HEIGHT}px`,
    );
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

  it("activates a body button on the first tap at half snap", async () => {
    renderWithHost(<TestHalfSheetWithBodyButton />);

    const button = screen.getByTestId("body-action");
    await pointerTap(button, 7, 400);

    expect(screen.getByTestId("selected").textContent).toBe("yes");
    expect(
      document.querySelector(".sheet")?.getAttribute("data-sheet-phase"),
    ).toBe("idle");
  });

  it("drags the sheet from a body button on the first gesture after move slop", () => {
    renderWithHost(<TestHalfSheetWithBodyButton />);

    const button = screen.getByTestId("body-action");
    const slide = document.querySelector<HTMLElement>(".sheet");
    if (!slide) {
      throw new Error("Expected sheet slide");
    }
    const initialHeight = slide.style.height;

    pointerDown(button, 8, 400);
    pointerMove(8, 600);

    expect(
      document.querySelector(".sheet")?.getAttribute("data-sheet-phase"),
    ).toBe("dragging");
    expect(slide.style.height).not.toBe(initialHeight);

    pointerUp(8, 600);

    expect(screen.getByTestId("selected").textContent).toBe("no");
    completeSheetSettling();
  });

  it("drags from a body button while the sheet is still settling after a snap", () => {
    renderWithHost(<TestHalfSheetWithBodyButton />);

    const chrome = document.querySelector("[data-sheet-chrome]");
    if (!chrome) {
      throw new Error("Expected sheet chrome");
    }

    dragSurface(chrome, 60, 400, 600);

    expect(sheetPhase()).toBe("settling");

    const button = screen.getByTestId("body-action");
    pointerDown(button, 61, 400);
    pointerMove(61, 200);

    expect(sheetPhase()).toBe("dragging");

    pointerUp(61, 200);

    expect(screen.getByTestId("selected").textContent).toBe("no");
  });

  it("does not steal first body tap at half snap before move slop", async () => {
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
    await flushTapClickSynthesis();

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
    expect(document.querySelector<HTMLElement>(".sheet")?.style.height).toBe(
      `${DEFAULT_HOST_HEIGHT}px`,
    );
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

  it("readVisibleHeightPx matches live height during chrome drag", () => {
    renderWithHost(
      <Sheet snap="half">
        <LiveHeightProbe />
        <SheetLayout
          header={<div data-testid="sheet-header">Header title</div>}
          body={<div>Body</div>}
        />
      </Sheet>,
    );

    const chrome = document.querySelector("[data-sheet-chrome]");
    if (!chrome) {
      throw new Error("Expected sheet chrome");
    }

    pointerDown(chrome, 14, 500);
    pointerMove(14, 460);
    pointerMove(14, 420);

    const readHeight = liveHeightReader.current;
    if (!readHeight) {
      throw new Error("Expected live height reader");
    }
    expect(readHeight()).toBe(slideHeightPx());
    expect(readHeight()).toBeGreaterThan(400);

    pointerUp(14, 420);
  });

  describe("scrollable button list", () => {
    it("taps a row at scroll top without changing scroll or phase", async () => {
      renderWithHost(<TestFullSheetWithButtonList />);

      const body = getScrollRoot();
      stubScrollRoot(body);

      const row = screen.getByTestId("row-1");
      await pointerTap(row, 20, 500);

      expect(screen.getByTestId("last-tapped-row").textContent).toBe("1");
      expect(body.scrollTop).toBe(0);
      expect(sheetPhase()).toBe("idle");
    });

    it("taps a row after scrolling mid-list", async () => {
      renderWithHost(<TestFullSheetWithButtonList />);

      const body = getScrollRoot();
      stubScrollRoot(body);

      act(() => {
        body.scrollTop = 400;
      });

      const row = screen.getByTestId("row-15");
      await pointerTap(row, 21, 500);

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
    it("fires header action on tap at half snap without dragging", async () => {
      renderWithHost(<TestHalfSheetWithHeaderButtons />);

      const button = screen.getByTestId("header-action-button");
      await pointerTap(button, 30, 400);

      expect(screen.getByTestId("header-action").textContent).toBe("fired");
      expect(sheetPhase()).toBe("idle");
    });

    it("drags the sheet from a list row after move slop without firing the row action", () => {
      renderWithHost(<TestFullSheetWithButtonList />);

      const row = screen.getByTestId("row-1");

      dragSurface(row, 35, 650, 400);

      expect(screen.getByTestId("last-tapped-row").textContent).toBe("none");
    });

    it("drags sheet from header button after move slop without firing action", () => {
      renderWithHost(<TestHalfSheetWithHeaderButtons />);

      const button = screen.getByTestId("header-action-button");
      const slide = document.querySelector<HTMLElement>(".sheet");
      if (!slide) {
        throw new Error("Expected sheet slide");
      }
      const initialHeight = slideHeightPx();

      dragSurface(button, 31, 400, 550);

      expect(screen.getByTestId("header-action").textContent).toBe("none");
      expect(slideHeightPx()).not.toBe(initialHeight);
    });

    it("fires header dismiss on tap at full snap", async () => {
      renderWithHost(<TestFullSheetWithButtonList />);

      const button = screen.getByTestId("header-dismiss");
      await pointerTap(button, 32, 200);

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

    it("activates header and body buttons on first tap after chrome drag from collapsed", async () => {
      renderWithHost(<TestHalfSheetWithHeaderAndBodyButtons />);

      const chrome = document.querySelector("[data-sheet-chrome]");
      if (!chrome) {
        throw new Error("Expected sheet chrome");
      }

      dragSurface(chrome, 40, 700, 400);

      const headerButton = screen.getByTestId("header-action-button");
      await pointerTap(headerButton, 41, 420);
      expect(screen.getByTestId("header-selected").textContent).toBe("yes");

      const bodyButton = screen.getByTestId("body-action-button");
      await pointerTap(bodyButton, 42, 500);
      expect(screen.getByTestId("body-selected").textContent).toBe("yes");
    });

    it("activates an outside button on first tap after chrome drag", async () => {
      renderWithHost(<TestHalfSheetWithHeaderAndBodyButtons />);

      const outside = document.createElement("button");
      outside.type = "button";
      outside.dataset.testid = "outside-action";
      let activated = false;
      outside.addEventListener("click", () => {
        activated = true;
      });
      document.body.appendChild(outside);

      const chrome = document.querySelector("[data-sheet-chrome]");
      if (!chrome) {
        throw new Error("Expected sheet chrome");
      }

      dragSurface(chrome, 43, 700, 400);

      pointerDown(outside, 44, 60);
      pointerUp(44, 60, outside);

      expect(activated).toBe(false);

      await act(async () => {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });
      });

      expect(activated).toBe(true);

      outside.remove();
    });
  });

  describe("controlled snap contract", () => {
    it("user drag open from collapsed settles without snap-back", () => {
      renderWithHost(<TestCollapsedSheet />);

      const chrome = document.querySelector("[data-sheet-chrome]");
      if (!chrome) {
        throw new Error("Expected sheet chrome");
      }

      dragSurface(chrome, 50, 700, 400);
      completeSheetSettling();

      expect(screen.getByTestId("snap").textContent).toBe("half");
    });

    it("applies controlled snap change deferred until drag ends", () => {
      renderWithHost(<TestHalfSheetWithSnapCommands />);

      const chrome = document.querySelector("[data-sheet-chrome]");
      if (!chrome) {
        throw new Error("Expected sheet chrome");
      }

      pointerDown(chrome, 51, 500);
      pointerMove(51, 400);
      expect(sheetPhase()).toBe("dragging");

      act(() => {
        screen.getByTestId("cmd-full").click();
      });
      expect(screen.getByTestId("snap").textContent).toBe("full");
      expect(sheetPhase()).toBe("dragging");

      pointerUp(51, 400);
      completeSheetSettling();

      expect(screen.getByTestId("snap").textContent).toBe("full");
    });

    it("supersedes full to half mid-settle with one onSnapSettled", () => {
      const onSnapSettled = vi.fn();
      renderWithHost(
        <TestFullSheetWithSettleCallback onSnapSettled={onSnapSettled} />,
      );

      const chrome = document.querySelector("[data-sheet-chrome]");
      if (!chrome) {
        throw new Error("Expected sheet chrome");
      }

      dragSurface(chrome, 52, 200, 500);
      expect(sheetPhase()).toBe("settling");

      act(() => {
        screen.getByTestId("cmd-half").click();
      });

      completeSheetSettling();

      expect(screen.getByTestId("snap").textContent).toBe("half");
      expect(onSnapSettled).toHaveBeenCalledTimes(1);
      expect(onSnapSettled).toHaveBeenCalledWith("half");
    });

    it("syncing controlled snap on settle after user drag open to full", () => {
      renderWithHost(<TestCollapsedSheetWithSettleSync />);

      const chrome = document.querySelector("[data-sheet-chrome]");
      if (!chrome) {
        throw new Error("Expected sheet chrome");
      }

      dragSurface(chrome, 54, 700, 80);
      completeSheetSettling();

      expect(screen.getByTestId("snap").textContent).toBe("full");

      act(() => {
        screen.getByTestId("cmd-half").click();
      });
      completeSheetSettling();

      expect(screen.getByTestId("snap").textContent).toBe("half");
    });

    it("list row at full height does not command half after drag open", () => {
      renderWithHost(<TestContractListSelectPattern />);

      const chrome = document.querySelector("[data-sheet-chrome]");
      if (!chrome) {
        throw new Error("Expected sheet chrome");
      }

      dragSurface(chrome, 55, 700, 80);
      expect(screen.getByTestId("snap").textContent).toBe("full");

      act(() => {
        screen.getByTestId("list-row").click();
      });
      completeSheetSettling();

      expect(screen.getByTestId("snap").textContent).toBe("full");
      expect(slideHeightPx()).toBe(DEFAULT_HOST_HEIGHT);
    });

    it("preserves body scroll when settling to full after drag-to-scroll", () => {
      renderWithHost(<TestHalfSheetWithScroll />);

      const body = document.querySelector("[data-sheet-scroll-root]");
      if (!(body instanceof HTMLDivElement)) {
        throw new Error("Expected sheet scroll root");
      }

      stubScrollRootDimensions(body, 400, 2000);

      pointerDown(body, 53, 500);
      pointerMove(53, 100);
      pointerMove(53, 80);

      const scrollAtRelease = body.scrollTop;
      expect(scrollAtRelease).toBeGreaterThan(0);

      pointerUp(53, 80);
      completeSheetSettling();

      expect(screen.getByTestId("snap").textContent).toBe("full");
      expect(body.scrollTop).toBe(scrollAtRelease);
    });
  });
});
