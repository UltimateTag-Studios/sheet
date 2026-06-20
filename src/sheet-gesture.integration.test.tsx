/** @vitest-environment jsdom */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

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
});
