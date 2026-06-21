import type { RefObject, TransitionEvent } from "react";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

import { sheetFrameStyle } from "../layout/sheet-transform";
import { applySheetSlideFrame } from "../layout/sync-sheet-dom-frame";
import type { SheetPhase } from "../machine/sheet-machine";

export type UseSheetSlideFrameOptions = {
  visibleHeightPx: number;
  phase: SheetPhase;
  sheetSlideRef: RefObject<HTMLDivElement | null>;
  /** When false, chrome is laid out invisibly until the machine has measured heights. */
  enabled: boolean;
  onSettleComplete: () => void;
  /** Fires after the slide frame is applied at rest (idle / settling). */
  onLayoutFrameApplied?: () => void;
};

export function useSheetSlideFrame({
  visibleHeightPx,
  phase,
  sheetSlideRef,
  enabled,
  onSettleComplete,
  onLayoutFrameApplied,
}: UseSheetSlideFrameOptions) {
  const suppressInitialLayoutTransitionRef = useRef(true);

  const frameStyle = useMemo(() => {
    if (!enabled) {
      return {
        height: "auto",
        transition: "none",
        visibility: "hidden" as const,
      };
    }
    return {
      ...sheetFrameStyle(
        visibleHeightPx,
        phase,
        suppressInitialLayoutTransitionRef.current,
      ),
      visibility: "visible" as const,
    };
  }, [enabled, phase, visibleHeightPx]);

  useLayoutEffect(() => {
    if (!enabled || phase === "dragging") {
      return;
    }
    const slide = sheetSlideRef.current;
    if (!slide) {
      return;
    }
    const suppress = suppressInitialLayoutTransitionRef.current;
    applySheetSlideFrame(slide, visibleHeightPx, phase, suppress);
    if (suppress) {
      suppressInitialLayoutTransitionRef.current = false;
    }
    onLayoutFrameApplied?.();
  }, [enabled, onLayoutFrameApplied, phase, sheetSlideRef, visibleHeightPx]);

  const onTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (!enabled) {
        return;
      }
      if (event.target !== event.currentTarget) {
        return;
      }
      if (event.propertyName !== "height") {
        return;
      }
      if (phase === "settling") {
        onSettleComplete();
      }
    },
    [enabled, onSettleComplete, phase],
  );

  return { frameStyle, onTransitionEnd };
}
