import { describe, expect, it } from "vitest";

import {
  computeScrollReleaseVelocityPxPerMs,
  nextScrollMomentumVelocityPxPerMs,
  shouldStartScrollMomentum,
  shouldStopScrollMomentum,
} from "./sheet-body-scroll-momentum";

describe("computeScrollReleaseVelocityPxPerMs", () => {
  it("returns negative velocity when the finger moves down", () => {
    expect(
      computeScrollReleaseVelocityPxPerMs([
        { timeMs: 0, clientY: 100 },
        { timeMs: 50, clientY: 150 },
      ]),
    ).toBe(-1);
  });

  it("returns positive velocity when the finger moves up", () => {
    expect(
      computeScrollReleaseVelocityPxPerMs([
        { timeMs: 0, clientY: 200 },
        { timeMs: 40, clientY: 120 },
      ]),
    ).toBe(2);
  });

  it("uses only samples inside the release window", () => {
    expect(
      computeScrollReleaseVelocityPxPerMs([
        { timeMs: 0, clientY: 0 },
        { timeMs: 200, clientY: 0 },
        { timeMs: 280, clientY: 40 },
        { timeMs: 320, clientY: 80 },
      ]),
    ).toBe(-1);
  });
});

describe("scroll momentum thresholds", () => {
  it("starts only above the minimum fling speed", () => {
    expect(shouldStartScrollMomentum(0.079)).toBe(false);
    expect(shouldStartScrollMomentum(0.08)).toBe(true);
  });

  it("stops when velocity decays below the floor", () => {
    expect(shouldStopScrollMomentum(0.014)).toBe(true);
    expect(shouldStopScrollMomentum(0.02)).toBe(false);
  });

  it("applies frame-rate-normalized friction", () => {
    expect(nextScrollMomentumVelocityPxPerMs(1, 16.67)).toBeCloseTo(0.92, 2);
  });
});
