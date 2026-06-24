import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SheetMachineEffect } from "./machine";
import { useSheetMachine } from "./use-sheet-machine";

describe("useSheetMachine", () => {
  it("skips React sync on continuous drag pointerMove", () => {
    let renderCount = 0;
    const effects: SheetMachineEffect[] = [];

    const { result } = renderHook(() => {
      renderCount += 1;
      return useSheetMachine({
        restingSnap: "half",
        runEffect: (effect) => {
          effects.push(effect);
        },
      });
    });

    act(() => {
      result.current.dispatch({
        type: "measure",
        collapsedHeightPx: 80,
        halfHeightPx: 400,
        fullHeightPx: 800,
      });
    });

    act(() => {
      result.current.dispatch({
        type: "pointerArm",
        pointerId: 1,
        clientY: 500,
        scrollTopPx: 0,
        surface: "chrome",
        route: "sheet",
      });
      result.current.dispatch({
        type: "pointerCommit",
        pointerId: 1,
        clientY: 480,
        scrollTopPx: 0,
        timeMs: 100,
      });
    });

    const renderCountAfterDragStart = renderCount;

    act(() => {
      for (let clientY = 460; clientY >= 360; clientY -= 20) {
        result.current.dispatch({
          type: "pointerMove",
          pointerId: 1,
          clientY,
          scrollTopPx: 0,
          timeMs: 100,
        });
      }
    });

    expect(renderCount).toBe(renderCountAfterDragStart);
    expect(result.current.state?.phase).toBe("dragging");
    expect(effects.some((effect) => effect.type === "syncDragFrame")).toBe(
      true,
    );
  });
});
