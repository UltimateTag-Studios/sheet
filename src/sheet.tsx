import type { CSSProperties, ReactNode, TransitionEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SheetContextProvider } from "./context/sheet-context";
import { useSheetMachine } from "./gesture/use-sheet-machine";
import { useSheetPointerHandlers } from "./gesture/use-sheet-pointer-handlers";
import { useSheetBodyScroll } from "./hooks/use-sheet-body-scroll";
import {
  DEFAULT_HALF_SNAP_FRACTION,
  normalizeHalfSnapFraction,
} from "./layout/normalize-half-snap-fraction";
import { sheetTransformStyle } from "./layout/sheet-transform";
import { readVisibleSheetHeightPx } from "./layout/snap-heights";
import type { SheetSnap } from "./layout/snap-math";
import { useSheetSnapHeights } from "./layout/use-snap-heights";

export type { SheetSnap };
export { DEFAULT_HALF_SNAP_FRACTION };

export type SheetProps = {
  children: ReactNode;
  snap?: SheetSnap;
  defaultSnap?: SheetSnap;
  onSnapChange?: (snap: SheetSnap) => void;
  /** Fires when the user starts or stops dragging (e.g. defer map camera updates). */
  onDragInteractionChange?: (isDragging: boolean) => void;
  /** Extra pixels below measured header chrome for collapsed snap (e.g. floating tab bar). */
  collapsedBottomInsetPx?: number;
  /** Fraction snap between collapsed and full (default 0.5). */
  halfSnapFraction?: number;
  /** Merged layout vars + optional sheet surface visual overrides. */
  sheetStyle?: CSSProperties;
  /** Optional handle visual overrides. */
  sheetHandleStyle?: CSSProperties;
  /** Called when measured collapsed/full snap heights change. */
  onSnapHeightsChange?: (heights: {
    collapsedHeightPx: number;
    fullHeightPx: number;
  }) => void;
};

export function Sheet({
  children,
  snap,
  defaultSnap = "half",
  onSnapChange,
  onDragInteractionChange,
  collapsedBottomInsetPx = 0,
  halfSnapFraction,
  sheetStyle,
  sheetHandleStyle,
  onSnapHeightsChange,
}: SheetProps) {
  const resolvedHalfSnap = normalizeHalfSnapFraction(halfSnapFraction);
  const [chromeEl, setChromeEl] = useState<HTMLElement | null>(null);

  const { collapsedHeightPx, halfHeightPx, fullHeightPx } = useSheetSnapHeights(
    {
      chromeEl,
      collapsedBottomInsetPx,
      halfSnapFraction: resolvedHalfSnap,
    },
  );

  useEffect(() => {
    onSnapHeightsChange?.({ collapsedHeightPx, fullHeightPx });
  }, [collapsedHeightPx, fullHeightPx, onSnapHeightsChange]);

  const { state, dispatch } = useSheetMachine({
    restingSnap: snap ?? defaultSnap,
    controlledSnap: snap,
    collapsedHeightPx,
    halfHeightPx,
    fullHeightPx,
    onSnapChange,
    onDragInteractionChange,
  });

  const { readScrollTop, applyBodyScrollDelta, registerBodyEl } =
    useSheetBodyScroll(state.restingSnap);

  const pointerHandlers = useSheetPointerHandlers(
    dispatch,
    readScrollTop,
    applyBodyScrollDelta,
  );

  const registerChromeMeasure = useCallback((node: HTMLElement | null) => {
    setChromeEl(node);
  }, []);

  const transformStyle = useMemo(
    () => sheetTransformStyle(state.visibleHeightPx, state.phase),
    [state.phase, state.visibleHeightPx],
  );

  const onTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (event.propertyName !== "transform") {
        return;
      }
      if (state.phase === "settling") {
        dispatch({ type: "settleComplete" });
      }
    },
    [dispatch, state.phase],
  );

  const contextValue = useMemo(
    () => ({
      sheetSnap: state.restingSnap,
      visibleHeightPx: state.visibleHeightPx,
      collapsedHeightPx,
      fullHeightPx,
      isDragging: state.phase === "dragging",
      pointerHandlers,
      sheetHandleStyle,
      registerBodyEl,
      registerChromeMeasure,
    }),
    [
      collapsedHeightPx,
      fullHeightPx,
      pointerHandlers,
      registerBodyEl,
      registerChromeMeasure,
      sheetHandleStyle,
      state.phase,
      state.restingSnap,
      state.visibleHeightPx,
    ],
  );

  return (
    <div
      className="sheet"
      style={{
        bottom: "0px",
        ...sheetStyle,
        ...transformStyle,
      }}
      onTransitionEnd={onTransitionEnd}
      data-sheet-phase={state.phase}
    >
      <SheetContextProvider value={contextValue}>
        <div className="sheet-inner">{children}</div>
      </SheetContextProvider>
    </div>
  );
}

export function getVisibleSheetHeightPx(el: HTMLElement | null): number {
  if (!el) {
    return 0;
  }
  return readVisibleSheetHeightPx(el);
}
