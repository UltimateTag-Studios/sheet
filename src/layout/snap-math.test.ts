import { describe, expect, it } from "vitest";

import { createInitialSheetMachineState } from "../machine";
import {
  heightsMatchForSettle,
  isVisibleHeightAtRestingSnap,
} from "./snap-math";

describe("heightsMatchForSettle", () => {
  it("matches within 1px rounded tolerance", () => {
    expect(heightsMatchForSettle(399.4, 399.6)).toBe(true);
    expect(heightsMatchForSettle(399, 401)).toBe(false);
  });
});

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
