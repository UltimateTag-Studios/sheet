import { describe, expect, it } from "vitest";

import {
  createInitialSheetMachineState,
  reduceSheetMachine,
  type SheetMachineState,
  type SheetPointerSurface,
} from "./index";

const baseHeights = {
  collapsedHeightPx: 150,
  halfHeightPx: 350,
  fullHeightPx: 700,
};

const TIME_MS = 100;

function armPointer(
  state: SheetMachineState,
  args: {
    clientY: number;
    scrollTopPx?: number;
    surface: SheetPointerSurface;
    route?: "watch" | "sheet";
  },
) {
  return reduceSheetMachine(state, {
    type: "pointerArm",
    pointerId: 1,
    clientY: args.clientY,
    scrollTopPx: args.scrollTopPx ?? 0,
    surface: args.surface,
    route: args.route ?? "sheet",
  });
}

function commitPointer(
  state: SheetMachineState,
  clientY: number,
  scrollTopPx = 0,
) {
  return reduceSheetMachine(state, {
    type: "pointerCommit",
    pointerId: 1,
    clientY,
    scrollTopPx,
    timeMs: TIME_MS,
  });
}

function movePointer(
  state: SheetMachineState,
  clientY: number,
  scrollTopPx = 0,
) {
  return reduceSheetMachine(state, {
    type: "pointerMove",
    pointerId: 1,
    clientY,
    scrollTopPx,
    timeMs: TIME_MS,
  });
}

describe("reduceSheetMachine", () => {
  it("starts at half height when resting snap is half", () => {
    const state = createInitialSheetMachineState({
      restingSnap: "half",
      ...baseHeights,
    });
    expect(state.visibleHeightPx).toBe(350);
    expect(state.phase).toBe("idle");
  });

  it("arms sheet intent below full height without dragging until move slop", () => {
    const initial = createInitialSheetMachineState({
      restingSnap: "half",
      ...baseHeights,
    });

    const result = armPointer(initial, {
      clientY: 400,
      surface: "body",
    });

    expect(result.state.phase).toBe("idle");
    expect(result.state.gesture?.intent).toBe("sheet");
    expect(result.effects).toEqual([{ type: "cancelScrollMomentum" }]);
  });

  it("clears armed body gesture on tap release without move", () => {
    const initial = createInitialSheetMachineState({
      restingSnap: "half",
      ...baseHeights,
    });

    const armed = armPointer(initial, {
      clientY: 400,
      surface: "body",
    }).state;

    const result = reduceSheetMachine(armed, {
      type: "pointerUp",
      pointerId: 1,
    });

    expect(result.state.phase).toBe("idle");
    expect(result.state.gesture).toBeNull();
    expect(result.effects).toEqual([]);
  });

  it("enters scroll intent when body is scrolled at full height", () => {
    const initial = createInitialSheetMachineState({
      restingSnap: "full",
      ...baseHeights,
    });

    const result = armPointer(initial, {
      clientY: 400,
      scrollTopPx: 48,
      surface: "body",
    });

    expect(result.state.phase).toBe("idle");
    expect(result.state.gesture?.intent).toBe("scroll");
    expect(result.effects).toEqual([{ type: "cancelScrollMomentum" }]);
  });

  it("arms chrome sheet intent without dragging until move slop", () => {
    const initial = createInitialSheetMachineState({
      restingSnap: "full",
      ...baseHeights,
    });

    const result = armPointer(initial, {
      clientY: 400,
      scrollTopPx: 48,
      surface: "chrome",
    });

    expect(result.state.phase).toBe("idle");
    expect(result.state.gesture?.intent).toBe("sheet");
    expect(result.state.gesture?.surface).toBe("chrome");
    expect(result.effects).toEqual([{ type: "cancelScrollMomentum" }]);
  });

  it("clears armed chrome gesture on tap release without move", () => {
    const initial = createInitialSheetMachineState({
      restingSnap: "half",
      ...baseHeights,
    });

    const armed = armPointer(initial, {
      clientY: 400,
      surface: "chrome",
    }).state;

    const result = reduceSheetMachine(armed, {
      type: "pointerUp",
      pointerId: 1,
    });

    expect(result.state.phase).toBe("idle");
    expect(result.state.gesture).toBeNull();
    expect(result.effects).toEqual([]);
  });

  it("keeps chrome drag when body remains scrolled during move", () => {
    let state = createInitialSheetMachineState({
      restingSnap: "full",
      ...baseHeights,
    });

    state = armPointer(state, {
      clientY: 400,
      scrollTopPx: 48,
      surface: "chrome",
    }).state;

    const slopCross = commitPointer(state, 409, 48);

    expect(slopCross.state.phase).toBe("dragging");
    expect(slopCross.effects).toContainEqual({ type: "notifyDragStart" });

    const result = movePointer(slopCross.state, 460, 48);

    expect(result.state.phase).toBe("dragging");
    expect(result.state.gesture?.intent).toBe("sheet");
    expect(result.state.visibleHeightPx).toBeLessThan(700);
  });

  it("interrupts settling when a new pointer arms", () => {
    const initial = createInitialSheetMachineState({
      restingSnap: "half",
      ...baseHeights,
    });
    const settling = {
      ...initial,
      phase: "settling" as const,
      visibleHeightPx: 500,
      settleEpoch: 1,
    };

    const result = armPointer(settling, {
      clientY: 400,
      surface: "body",
      route: "watch",
    });

    expect(result.state.phase).toBe("idle");
    expect(result.state.pointerArm?.pointerId).toBe(1);
    expect(result.effects).toEqual(
      expect.arrayContaining([
        { type: "syncIdleFrame", suppressTransition: true },
        { type: "notifySnapSettled", snap: "half", settleEpoch: 1 },
        { type: "notifyLayoutFrame" },
        { type: "cancelScrollMomentum" },
      ]),
    );
  });

  it("enters pendingAxis at full height with scroll top", () => {
    const initial = createInitialSheetMachineState({
      restingSnap: "full",
      ...baseHeights,
    });

    const result = armPointer(initial, {
      clientY: 400,
      surface: "body",
    });

    expect(result.state.phase).toBe("idle");
    expect(result.state.gesture?.intent).toBe("pendingAxis");
    expect(result.effects).toEqual([{ type: "cancelScrollMomentum" }]);
  });

  it("transitions upward pendingAxis moves to scroll at full height", () => {
    let state = createInitialSheetMachineState({
      restingSnap: "full",
      ...baseHeights,
    });

    state = armPointer(state, {
      clientY: 400,
      surface: "body",
    }).state;

    const result = commitPointer(state, 380);

    expect(result.state.gesture?.intent).toBe("scroll");
    expect(result.effects).toContainEqual({ type: "scrollBody", deltaPx: 12 });
  });

  it("reanchors sheet on downward move from pendingAxis", () => {
    let state = createInitialSheetMachineState({
      restingSnap: "full",
      ...baseHeights,
    });

    state = armPointer(state, {
      clientY: 400,
      surface: "body",
    }).state;

    const result = commitPointer(state, 420);

    expect(result.state.gesture?.intent).toBe("sheet");
    expect(result.state.gesture?.startClientY).toBe(420);
    expect(result.state.gesture?.startHeightPx).toBe(688);
    expect(result.state.visibleHeightPx).toBe(688);
    expect(result.effects).toContainEqual({ type: "notifyDragStart" });
  });

  it("transitions scroll to sheet when reaching scroll top while dragging down", () => {
    let state = createInitialSheetMachineState({
      restingSnap: "full",
      ...baseHeights,
    });

    state = armPointer(state, {
      clientY: 400,
      scrollTopPx: 48,
      surface: "body",
    }).state;

    state = commitPointer(state, 430, 18).state;

    const result = movePointer(state, 440, 0);

    expect(result.state.gesture?.intent).toBe("sheet");
    expect(result.state.visibleHeightPx).toBeLessThan(700);
    expect(result.effects).toContainEqual({ type: "notifyDragStart" });
  });

  it("transitions sheet to scroll when expanding past full height", () => {
    let state = createInitialSheetMachineState({
      restingSnap: "half",
      ...baseHeights,
    });

    state = armPointer(state, {
      clientY: 400,
      surface: "body",
    }).state;

    state = commitPointer(state, 50).state;

    expect(state.visibleHeightPx).toBe(700);

    const result = movePointer(state, 40);

    expect(result.state.visibleHeightPx).toBe(700);
    expect(result.state.gesture?.intent).toBe("scroll");
    expect(result.effects).toContainEqual({ type: "scrollBody", deltaPx: 10 });
  });

  it("settles to full on release after sheet drag transitions to scroll", () => {
    let state = createInitialSheetMachineState({
      restingSnap: "half",
      ...baseHeights,
    });

    state = armPointer(state, {
      clientY: 400,
      surface: "body",
    }).state;

    state = commitPointer(state, 50).state;
    state = movePointer(state, 40).state;

    expect(state.gesture?.intent).toBe("scroll");
    expect(state.visibleHeightPx).toBe(700);

    const result = reduceSheetMachine(state, {
      type: "pointerUp",
      pointerId: 1,
    });

    expect(result.state.phase).toBe("idle");
    expect(result.state.restingSnap).toBe("full");
    expect(result.effects).toContainEqual({
      type: "notifySnapSettled",
      snap: "full",
      settleEpoch: 1,
    });
  });

  it("does not drag below collapsed height when reserve is in the floor", () => {
    const reserveHeights = {
      collapsedHeightPx: 210,
      halfHeightPx: 350,
      fullHeightPx: 700,
    };

    let state = createInitialSheetMachineState({
      restingSnap: "half",
      ...reserveHeights,
    });

    state = armPointer(state, {
      clientY: 400,
      surface: "body",
    }).state;

    state = commitPointer(state, 600).state;

    expect(state.visibleHeightPx).toBe(210);
  });

  it("updates height while dragging at half snap", () => {
    let state = createInitialSheetMachineState({
      restingSnap: "half",
      ...baseHeights,
    });

    state = armPointer(state, {
      clientY: 400,
      surface: "body",
    }).state;

    const result = commitPointer(state, 360);

    expect(result.state.visibleHeightPx).toBeGreaterThan(350);
  });

  it("settles to nearest snap on release", () => {
    let state = createInitialSheetMachineState({
      restingSnap: "half",
      ...baseHeights,
    });

    state = armPointer(state, {
      clientY: 300,
      surface: "body",
    }).state;

    state = commitPointer(state, 100).state;

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
    expect(result.effects).toContainEqual({
      type: "activatePostDragClickRepair",
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
    expect(result.effects).toContainEqual({
      type: "syncSettleFrame",
      heightPx: 700,
      settleEpoch: 1,
    });
  });

  it("settleComplete emits notifySnapSettled with settleEpoch", () => {
    const settling = {
      ...createInitialSheetMachineState({
        restingSnap: "full",
        ...baseHeights,
      }),
      phase: "settling" as const,
      visibleHeightPx: 700,
      settleEpoch: 2,
    };

    const result = reduceSheetMachine(settling, { type: "settleComplete" });

    expect(result.state.phase).toBe("idle");
    expect(result.effects).toEqual([
      { type: "syncIdleFrame", suppressTransition: true },
      { type: "notifySnapSettled", snap: "full", settleEpoch: 2 },
      { type: "notifyLayoutFrame" },
      { type: "syncBodyScrollEnabled", enabled: true },
    ]);
  });

  it("preserves visible height on measure while settling", () => {
    const initial = createInitialSheetMachineState({
      restingSnap: "collapsed",
      collapsedHeightPx: 150,
      halfHeightPx: 350,
      fullHeightPx: 700,
    });
    const settling = {
      ...initial,
      phase: "settling" as const,
      visibleHeightPx: 150,
    };

    const measured = reduceSheetMachine(settling, {
      type: "measure",
      collapsedHeightPx: 210,
      halfHeightPx: 350,
      fullHeightPx: 700,
    });

    expect(measured.state.visibleHeightPx).toBe(150);
    expect(measured.state.collapsedHeightPx).toBe(210);

    const remeasured = reduceSheetMachine(measured.state, {
      type: "measure",
      collapsedHeightPx: 210,
      halfHeightPx: 350,
      fullHeightPx: 700,
    });

    expect(remeasured.state).toBe(measured.state);
    expect(remeasured.effects).toEqual([]);
  });

  it("measure does not override visible height while dragging", () => {
    const initial = createInitialSheetMachineState({
      restingSnap: "half",
      ...baseHeights,
    });
    const dragging = {
      ...initial,
      phase: "dragging" as const,
      visibleHeightPx: 280,
    };

    const result = reduceSheetMachine(dragging, {
      type: "measure",
      collapsedHeightPx: 180,
      halfHeightPx: 350,
      fullHeightPx: 700,
    });

    expect(result.state.visibleHeightPx).toBe(280);
    expect(result.state.collapsedHeightPx).toBe(180);
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
    expect(result.effects).toContainEqual({
      type: "notifySnapHeightsChange",
      collapsedHeightPx: 180,
      halfHeightPx: 360,
      fullHeightPx: 720,
    });
  });

  it("enterSettle to non-full emits resetBodyScroll", () => {
    const initial = createInitialSheetMachineState({
      restingSnap: "full",
      ...baseHeights,
    });

    const result = reduceSheetMachine(initial, {
      type: "setSnap",
      snap: "half",
      source: "controlled",
    });

    expect(result.effects).toContainEqual({ type: "resetBodyScroll" });
  });

  it("enterSettle to full does not emit resetBodyScroll", () => {
    const initial = createInitialSheetMachineState({
      restingSnap: "half",
      ...baseHeights,
    });

    const result = reduceSheetMachine(initial, {
      type: "setSnap",
      snap: "full",
      source: "controlled",
    });

    expect(result.effects).not.toContainEqual({ type: "resetBodyScroll" });
  });
});
