import type { RefObject, TransitionEvent } from "react";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

import { sheetFrameStyle } from "../layout/sheet-transform";
import { applySheetSlideFrame } from "../layout/sync-sheet-dom-frame";
import type { SheetPhase } from "../machine";

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
  const settlingStyleRef = useRef<{
    height: string;
    transition: string;
  } | null>(null);

  const frameStyle = useMemo(() => {
    if (!enabled) {
      return {
        height: "auto",
        transition: "none",
        visibility: "hidden" as const,
      };
    }

    if (phase === "settling" && settlingStyleRef.current) {
      return {
        ...settlingStyleRef.current,
        visibility: "visible" as const,
      };
    }

    const nextStyle = sheetFrameStyle(
      visibleHeightPx,
      phase,
      suppressInitialLayoutTransitionRef.current,
    );

    if (phase === "settling") {
      settlingStyleRef.current = nextStyle;
    } else {
      settlingStyleRef.current = null;
    }

    return {
      ...nextStyle,
      visibility: "visible" as const,
    };
  }, [enabled, phase, visibleHeightPx]);

  useLayoutEffect(() => {
    if (!enabled || phase === "dragging" || phase === "settling") {
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
        settlingStyleRef.current = null;
        onSettleComplete();
      }
    },
    [enabled, onSettleComplete, phase],
  );

  return { frameStyle, onTransitionEnd };
}
