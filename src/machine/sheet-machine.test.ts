import { describe, expect, it } from "vitest";

import {
  createInitialSheetMachineState,
  reduceSheetMachine,
} from "./sheet-machine";

const baseHeights = {
  collapsedHeightPx: 150,
  halfHeightPx: 350,
  fullHeightPx: 700,
};

describe("reduceSheetMachine", () => {
  it("starts at half height when resting snap is half", () => {
    const state = createInitialSheetMachineState({
      restingSnap: "half",
      ...baseHeights,
    });
    expect(state.visibleHeightPx).toBe(350);
    expect(state.phase).toBe("idle");
  });

  it("enters dragging with sheet intent below full height", () => {
    const initial = createInitialSheetMachineState({
      restingSnap: "half",
      ...baseHeights,
    });

    const result = reduceSheetMachine(initial, {
      type: "pointerDown",
      pointerId: 1,
      clientY: 400,
      scrollTopPx: 0,
      surface: "body",
    });

    expect(result.state.phase).toBe("dragging");
    expect(result.state.gesture?.intent).toBe("sheet");
    expect(result.effects).toContainEqual({ type: "notifyDragStart" });
  });

  it("does not capture when body is scrolled at full height", () => {
    const initial = createInitialSheetMachineState({
      restingSnap: "full",
      ...baseHeights,
    });

    const result = reduceSheetMachine(initial, {
      type: "pointerDown",
      pointerId: 1,
      clientY: 400,
      scrollTopPx: 48,
      surface: "body",
    });

    expect(result.releaseToScroll).toBe(true);
    expect(result.state.phase).toBe("idle");
  });

  it("captures chrome drag when body is scrolled at full height", () => {
    const initial = createInitialSheetMachineState({
      restingSnap: "full",
      ...baseHeights,
    });

    const result = reduceSheetMachine(initial, {
      type: "pointerDown",
      pointerId: 1,
      clientY: 400,
      scrollTopPx: 48,
      surface: "chrome",
    });

    expect(result.releaseToScroll).toBeUndefined();
    expect(result.state.phase).toBe("dragging");
    expect(result.state.gesture?.intent).toBe("sheet");
    expect(result.state.gesture?.surface).toBe("chrome");
    expect(result.effects).toContainEqual({ type: "notifyDragStart" });
  });

  it("keeps chrome drag when body remains scrolled during move", () => {
    let state = createInitialSheetMachineState({
      restingSnap: "full",
      ...baseHeights,
    });

    state = reduceSheetMachine(state, {
      type: "pointerDown",
      pointerId: 1,
      clientY: 400,
      scrollTopPx: 48,
      surface: "chrome",
    }).state;

    const result = reduceSheetMachine(state, {
      type: "pointerMove",
      pointerId: 1,
      clientY: 460,
      scrollTopPx: 48,
    });

    expect(result.releaseToScroll).toBeUndefined();
    expect(result.state.gesture?.intent).toBe("sheet");
    expect(result.state.visibleHeightPx).toBeLessThan(700);
  });

  it("enters pendingAxis at full height with scroll top", () => {
    const initial = createInitialSheetMachineState({
      restingSnap: "full",
      ...baseHeights,
    });

    const result = reduceSheetMachine(initial, {
      type: "pointerDown",
      pointerId: 1,
      clientY: 400,
      scrollTopPx: 0,
      surface: "body",
    });

    expect(result.state.gesture?.intent).toBe("pendingAxis");
    expect(result.effects).toEqual([]);
  });

  it("hands upward moves to scroll at full height", () => {
    let state = createInitialSheetMachineState({
      restingSnap: "full",
      ...baseHeights,
    });

    state = reduceSheetMachine(state, {
      type: "pointerDown",
      pointerId: 1,
      clientY: 400,
      scrollTopPx: 0,
      surface: "body",
    }).state;

    const result = reduceSheetMachine(state, {
      type: "pointerMove",
      pointerId: 1,
      clientY: 380,
      scrollTopPx: 0,
    });

    expect(result.releaseToScroll).toBe(true);
    expect(result.state.phase).toBe("idle");
  });

  it("pans sheet on downward move from pendingAxis", () => {
    let state = createInitialSheetMachineState({
      restingSnap: "full",
      ...baseHeights,
    });

    state = reduceSheetMachine(state, {
      type: "pointerDown",
      pointerId: 1,
      clientY: 400,
      scrollTopPx: 0,
      surface: "body",
    }).state;

    const result = reduceSheetMachine(state, {
      type: "pointerMove",
      pointerId: 1,
      clientY: 420,
      scrollTopPx: 0,
    });

    expect(result.state.gesture?.intent).toBe("sheet");
    expect(result.state.visibleHeightPx).toBeLessThan(700);
    expect(result.effects).toContainEqual({ type: "notifyDragStart" });
  });

  it("updates height while dragging at half snap", () => {
    let state = createInitialSheetMachineState({
      restingSnap: "half",
      ...baseHeights,
    });

    state = reduceSheetMachine(state, {
      type: "pointerDown",
      pointerId: 1,
      clientY: 400,
      scrollTopPx: 0,
      surface: "body",
    }).state;

    const result = reduceSheetMachine(state, {
      type: "pointerMove",
      pointerId: 1,
      clientY: 360,
      scrollTopPx: 0,
    });

    expect(result.state.visibleHeightPx).toBeGreaterThan(350);
  });

  it("settles to nearest snap on release", () => {
    let state = createInitialSheetMachineState({
      restingSnap: "half",
      ...baseHeights,
    });

    state = reduceSheetMachine(state, {
      type: "pointerDown",
      pointerId: 1,
      clientY: 300,
      scrollTopPx: 0,
      surface: "body",
    }).state;

    state = reduceSheetMachine(state, {
      type: "pointerMove",
      pointerId: 1,
      clientY: 100,
      scrollTopPx: 0,
    }).state;

    const result = reduceSheetMachine(state, {
      type: "pointerUp",
      pointerId: 1,
    });

    expect(result.state.phase).toBe("settling");
    expect(result.state.restingSnap).toBe("full");
    expect(result.effects).toContainEqual({ type: "notifyDragEnd" });
    expect(result.effects).toContainEqual({
      type: "notifySnapChange",
      snap: "full",
    });
  });

  it("programmatic setSnap enters settling", () => {
    const initial = createInitialSheetMachineState({
      restingSnap: "collapsed",
      ...baseHeights,
    });

    const result = reduceSheetMachine(initial, {
      type: "setSnap",
      snap: "full",
    });

    expect(result.state.phase).toBe("settling");
    expect(result.state.visibleHeightPx).toBe(700);
    expect(result.effects).toContainEqual({
      type: "notifySnapChange",
      snap: "full",
    });
  });

  it("measure updates idle height for resting snap", () => {
    const initial = createInitialSheetMachineState({
      restingSnap: "half",
      collapsedHeightPx: 150,
      halfHeightPx: 350,
      fullHeightPx: 700,
    });

    const result = reduceSheetMachine(initial, {
      type: "measure",
      collapsedHeightPx: 180,
      halfHeightPx: 360,
      fullHeightPx: 720,
    });

    expect(result.state.visibleHeightPx).toBe(360);
    expect(result.state.collapsedHeightPx).toBe(180);
  });
});
