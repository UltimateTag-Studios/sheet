/** @vitest-environment jsdom */

import { act, fireEvent, render } from "@testing-library/react";
import type { ReactElement } from "react";

import { SheetHost } from "../../context/sheet-host-context";

export const DEFAULT_HOST_HEIGHT = 800;
export const BUTTON_LIST_ROW_COUNT = 24;

export const liveHeightReader: { current: (() => number) | null } = {
  current: null,
};

export function stubScrollRoot(scrollRoot: HTMLDivElement) {
  stubScrollRootDimensions(scrollRoot, 400, 2400);
}

export function getScrollRoot(): HTMLDivElement {
  const body = document.querySelector("[data-sheet-scroll-root]");
  if (!(body instanceof HTMLDivElement)) {
    throw new Error("Expected sheet scroll root");
  }
  return body;
}

export function sheetPhase(): string | null {
  return (
    document.querySelector(".sheet")?.getAttribute("data-sheet-phase") ?? null
  );
}

export function completeSheetSettling() {
  const slide = document.querySelector<HTMLElement>(".sheet");
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

export function stubHostHeight(host: Element, heightPx: number) {
  Object.defineProperty(host, "clientHeight", {
    configurable: true,
    value: heightPx,
  });
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

export function renderWithHost(
  ui: ReactElement,
  hostHeight = DEFAULT_HOST_HEIGHT,
) {
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

export function stubScrollRootDimensions(
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

export function sheetGestureTarget(): EventTarget {
  const sheet = document.querySelector(".sheet");
  if (sheet) {
    return sheet;
  }
  throw new Error("Expected sheet slide");
}

let lastPointerDownSurface: Element | null = null;

export function pointerDown(
  surface: Element,
  pointerId: number,
  clientY: number,
) {
  lastPointerDownSurface = surface;
  act(() => {
    fireEvent.pointerDown(surface, {
      pointerId,
      clientY,
      button: 0,
    });
  });
}

export function pointerMove(pointerId: number, clientY: number) {
  const target = lastPointerDownSurface ?? sheetGestureTarget();
  act(() => {
    target.dispatchEvent(
      new PointerEvent("pointermove", {
        pointerId,
        clientY,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}

export function pointerUp(
  pointerId: number,
  clientY: number,
  dispatchTarget: EventTarget = lastPointerDownSurface ?? sheetGestureTarget(),
) {
  act(() => {
    dispatchTarget.dispatchEvent(
      new PointerEvent("pointerup", {
        pointerId,
        clientY,
        bubbles: true,
        cancelable: true,
        button: 0,
      }),
    );
  });

  lastPointerDownSurface = null;
}

export async function flushTapClickSynthesis() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });
  });
}

export async function pointerTap(
  target: Element,
  pointerId: number,
  clientY: number,
) {
  pointerDown(target, pointerId, clientY);
  pointerUp(pointerId, clientY);
  await flushTapClickSynthesis();
}

export function dragSurface(
  surface: Element,
  pointerId: number,
  startY: number,
  endY: number,
) {
  pointerDown(surface, pointerId, startY);
  pointerMove(pointerId, endY);
  pointerUp(pointerId, endY);
}

export function slideHeightPx(): number {
  const slide = document.querySelector<HTMLElement>(".sheet");
  return Number.parseInt(slide?.style.height ?? "0", 10);
}
