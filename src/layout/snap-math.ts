/** Map vertical pan delta to a clamped sheet height in px. */
export function snapHeightFromPanDelta(args: {
  startHeightPx: number;
  startClientY: number;
  currentClientY: number;
  minHeightPx: number;
  maxHeightPx: number;
}): number {
  const deltaY = args.startClientY - args.currentClientY;
  return Math.min(
    args.maxHeightPx,
    Math.max(args.minHeightPx, args.startHeightPx + deltaY),
  );
}

export function heightForSnap(
  snap: SheetSnap,
  collapsedHeightPx: number,
  halfHeightPx: number,
  fullHeightPx: number,
): number {
  if (snap === "collapsed") {
    return collapsedHeightPx;
  }
  if (snap === "half") {
    return halfHeightPx;
  }
  return fullHeightPx;
}

export type VisibleHeightSnapHeights = {
  visibleHeightPx: number;
  restingSnap: SheetSnap;
  collapsedHeightPx: number;
  halfHeightPx: number;
  fullHeightPx: number;
};

export function isVisibleHeightAtRestingSnap(
  state: VisibleHeightSnapHeights,
): boolean {
  return (
    state.visibleHeightPx ===
    heightForSnap(
      state.restingSnap,
      state.collapsedHeightPx,
      state.halfHeightPx,
      state.fullHeightPx,
    )
  );
}

export type SheetSnap = "collapsed" | "half" | "full";

export function snapFromHeight(
  heightPx: number,
  collapsedHeightPx: number,
  halfHeightPx: number,
  fullHeightPx: number,
): SheetSnap {
  const candidates: Array<{ snap: SheetSnap; heightPx: number }> = [
    { snap: "collapsed", heightPx: collapsedHeightPx },
    { snap: "half", heightPx: halfHeightPx },
    { snap: "full", heightPx: fullHeightPx },
  ];

  let nearest = candidates[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const distance = Math.abs(heightPx - candidate.heightPx);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = candidate;
    }
  }

  return nearest?.snap ?? "half";
}

export function nearestSnapHeight(
  heightPx: number,
  collapsedHeightPx: number,
  halfHeightPx: number,
  fullHeightPx: number,
): { snap: SheetSnap; heightPx: number } {
  const snap = snapFromHeight(
    heightPx,
    collapsedHeightPx,
    halfHeightPx,
    fullHeightPx,
  );
  return {
    snap,
    heightPx: heightForSnap(
      snap,
      collapsedHeightPx,
      halfHeightPx,
      fullHeightPx,
    ),
  };
}
