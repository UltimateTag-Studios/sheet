import { describe, expect, it } from "vitest";

import { createInitialSheetMachineState } from "../machine/sheet-machine";
import { isVisibleHeightAtRestingSnap } from "./snap-math";

describe("isVisibleHeightAtRestingSnap", () => {
  it("is true when visible height matches the resting snap", () => {
    const state = createInitialSheetMachineState({
      restingSnap: "half",
      collapsedHeightPx: 80,
      halfHeightPx: 400,
      fullHeightPx: 800,
    });

    expect(isVisibleHeightAtRestingSnap(state)).toBe(true);
  });

  it("is false when visible height differs from the resting snap", () => {
    const state = {
      ...createInitialSheetMachineState({
        restingSnap: "full",
        collapsedHeightPx: 80,
        halfHeightPx: 400,
        fullHeightPx: 800,
      }),
      visibleHeightPx: 500,
    };

    expect(isVisibleHeightAtRestingSnap(state)).toBe(false);
  });
});
