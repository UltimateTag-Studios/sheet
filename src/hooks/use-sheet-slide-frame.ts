import type { TransitionEvent } from "react";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

import { sheetFrameStyle } from "../layout/sheet-transform";
import type { SheetPhase } from "../machine";

export type UseSheetSlideFrameOptions = {
  visibleHeightPx: number;
  phase: SheetPhase;
  /** When false, chrome is laid out invisibly until the machine has measured heights. */
  enabled: boolean;
  onSettleComplete: () => void;
};

export function useSheetSlideFrame({
  visibleHeightPx,
  phase,
  enabled,
  onSettleComplete,
}: UseSheetSlideFrameOptions) {
  const suppressInitialLayoutTransitionRef = useRef(true);
  const settlingStyleRef = useRef<{
    height: string;
    transition: string;
  } | null>(null);
  const prevPhaseRef = useRef<SheetPhase>("idle");

  useLayoutEffect(() => {
    if (!enabled) {
      settlingStyleRef.current = null;
      prevPhaseRef.current = phase;
      return;
    }

    if (phase === "settling" && prevPhaseRef.current !== "settling") {
      settlingStyleRef.current = sheetFrameStyle(
        visibleHeightPx,
        "settling",
        suppressInitialLayoutTransitionRef.current,
      );
    }

    if (phase !== "settling") {
      settlingStyleRef.current = null;
    }

    if (phase === "idle" && suppressInitialLayoutTransitionRef.current) {
      suppressInitialLayoutTransitionRef.current = false;
    }

    prevPhaseRef.current = phase;
  }, [enabled, phase, visibleHeightPx]);

  const frameStyle = useMemo(() => {
    if (!enabled) {
      return {
        height: "auto",
        transition: "none",
        visibility: "hidden" as const,
      };
    }

    if (phase === "dragging") {
      return {
        height: `${Math.round(visibleHeightPx)}px`,
        transition: "none",
        visibility: "visible" as const,
      };
    }

    if (phase === "settling" && settlingStyleRef.current) {
      return {
        ...settlingStyleRef.current,
        visibility: "visible" as const,
      };
    }

    if (phase === "settling") {
      return {
        ...sheetFrameStyle(visibleHeightPx, phase, false),
        visibility: "visible" as const,
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
