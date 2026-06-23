import { describe, expect, it } from "vitest";

import { createInitialSheetMachineState } from "../machine/sheet-machine";
import { visibleHeightMovedFromRestingSnap } from "./visible-height-moved-from-resting-snap";

describe("visibleHeightMovedFromRestingSnap", () => {
  it("is false when visible height matches the resting snap", () => {
    const state = createInitialSheetMachineState({
      restingSnap: "half",
      collapsedHeightPx: 80,
      halfHeightPx: 400,
      fullHeightPx: 800,
    });

    expect(visibleHeightMovedFromRestingSnap(state)).toBe(false);
  });

  it("is true when visible height differs from the resting snap", () => {
    const state = {
      ...createInitialSheetMachineState({
        restingSnap: "full",
        collapsedHeightPx: 80,
        halfHeightPx: 400,
        fullHeightPx: 800,
      }),
      visibleHeightPx: 500,
    };

    expect(visibleHeightMovedFromRestingSnap(state)).toBe(true);
  });
});
