export const DEFAULT_HALF_SNAP_FRACTION = 0.5;

/** Clamp consumer half snap to a sane open range. */
export function normalizeHalfSnapFraction(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_HALF_SNAP_FRACTION;
  }

  return Math.min(0.9, Math.max(0.1, value));
}
