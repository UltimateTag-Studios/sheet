import { describe, expect, it } from "vitest";

import { createInitialSheetMachineState } from "../machine/sheet-machine";
import { toSheetLayoutFrameChange } from "./sheet-layout-frame-change";

describe("toSheetLayoutFrameChange", () => {
  it("maps machine state to a layout frame payload", () => {
    const state = createInitialSheetMachineState({
      restingSnap: "half",
      collapsedHeightPx: 120,
      halfHeightPx: 400,
      fullHeightPx: 800,
    });

    expect(toSheetLayoutFrameChange(state)).toEqual({
      visibleHeightPx: state.visibleHeightPx,
      phase: "idle",
      restingSnap: "half",
    });
  });
});
