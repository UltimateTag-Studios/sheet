const SCROLL_VELOCITY_WINDOW_MS = 80;
const MIN_SCROLL_VELOCITY_PX_PER_MS = 0.08;
const SCROLL_MOMENTUM_FRICTION = 0.92;
const SCROLL_MOMENTUM_STOP_VELOCITY_PX_PER_MS = 0.015;
const MAX_SCROLL_MOMENTUM_FRAME_MS = 32;

export type ScrollPointerSample = {
  timeMs: number;
  clientY: number;
};

/** ScrollTop velocity (px/ms) from recent pointer samples — matches bodyScrollDelta sign. */
export function computeScrollReleaseVelocityPxPerMs(
  samples: readonly ScrollPointerSample[],
): number {
  if (samples.length < 2) {
    return 0;
  }

  const last = samples[samples.length - 1];
  if (!last) {
    return 0;
  }

  const cutoffMs = last.timeMs - SCROLL_VELOCITY_WINDOW_MS;
  let first = samples[0];
  if (!first) {
    return 0;
  }

  for (const sample of samples) {
    if (sample.timeMs >= cutoffMs) {
      first = sample;
      break;
    }
  }

  const elapsedMs = last.timeMs - first.timeMs;
  if (elapsedMs <= 0) {
    return 0;
  }

  const deltaY = last.clientY - first.clientY;
  return -deltaY / elapsedMs;
}

export function shouldStartScrollMomentum(velocityPxPerMs: number): boolean {
  return Math.abs(velocityPxPerMs) >= MIN_SCROLL_VELOCITY_PX_PER_MS;
}

export function nextScrollMomentumVelocityPxPerMs(
  velocityPxPerMs: number,
  elapsedMs: number,
): number {
  return velocityPxPerMs * SCROLL_MOMENTUM_FRICTION ** (elapsedMs / 16.67);
}

export function shouldStopScrollMomentum(velocityPxPerMs: number): boolean {
  return Math.abs(velocityPxPerMs) < SCROLL_MOMENTUM_STOP_VELOCITY_PX_PER_MS;
}

export function runScrollMomentum(args: {
  bodyEl: HTMLDivElement;
  initialVelocityPxPerMs: number;
  onScrollTopChange: () => void;
  onComplete: () => void;
}): () => void {
  let velocityPxPerMs = args.initialVelocityPxPerMs;
  let lastTimeMs = performance.now();
  let frameId = 0;

  const tick = (nowMs: number) => {
    const elapsedMs = Math.min(
      nowMs - lastTimeMs,
      MAX_SCROLL_MOMENTUM_FRAME_MS,
    );
    lastTimeMs = nowMs;

    const maxScrollTop = args.bodyEl.scrollHeight - args.bodyEl.clientHeight;
    if (maxScrollTop <= 0 || shouldStopScrollMomentum(velocityPxPerMs)) {
      args.onComplete();
      return;
    }

    const deltaPx = velocityPxPerMs * elapsedMs;
    const nextScrollTop = Math.min(
      maxScrollTop,
      Math.max(0, args.bodyEl.scrollTop + deltaPx),
    );

    if (nextScrollTop !== args.bodyEl.scrollTop) {
      args.bodyEl.scrollTop = nextScrollTop;
      args.onScrollTopChange();
    }

    if (nextScrollTop <= 0 || nextScrollTop >= maxScrollTop) {
      args.onComplete();
      return;
    }

    velocityPxPerMs = nextScrollMomentumVelocityPxPerMs(
      velocityPxPerMs,
      elapsedMs,
    );

    if (shouldStopScrollMomentum(velocityPxPerMs)) {
      args.onComplete();
      return;
    }

    frameId = requestAnimationFrame(tick);
  };

  frameId = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frameId);
  };
}
