import type { CSSProperties, ReactNode, TransitionEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SheetContextProvider } from "./context/sheet-context";
import { useSheetMachine } from "./gesture/use-sheet-machine";
import { useSheetPointerHandlers } from "./gesture/use-sheet-pointer-handlers";
import { useSheetBodyScroll } from "./hooks/use-sheet-body-scroll";
import { isSheetAtCollapsedHeader } from "./layout/collapsed-header-state";
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
  const [reserveSpacerEl, setReserveSpacerEl] = useState<HTMLElement | null>(
    null,
  );

  const { collapsedHeightPx, halfHeightPx, fullHeightPx } = useSheetSnapHeights(
    {
      chromeEl,
      reserveSpacerEl,
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

  const registerReserveSpacer = useCallback((node: HTMLElement | null) => {
    setReserveSpacerEl(node);
  }, []);

  const transformStyle = useMemo(
    () => sheetTransformStyle(state.visibleHeightPx, state.phase),
    [state.phase, state.visibleHeightPx],
  );

  const onTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) {
        return;
      }
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
      registerReserveSpacer,
    }),
    [
      collapsedHeightPx,
      fullHeightPx,
      pointerHandlers,
      registerBodyEl,
      registerChromeMeasure,
      registerReserveSpacer,
      sheetHandleStyle,
      state.phase,
      state.restingSnap,
      state.visibleHeightPx,
    ],
  );

  const atCollapsedHeader = isSheetAtCollapsedHeader({
    sheetSnap: state.restingSnap,
    isDragging: state.phase === "dragging",
    visibleHeightPx: state.visibleHeightPx,
    collapsedHeightPx,
  });

  return (
    <div
      className="sheet"
      style={{ bottom: "0px" }}
      data-sheet-phase={state.phase}
      data-sheet-collapsed-header={atCollapsedHeader ? "" : undefined}
    >
      <div
        className="sheet-slide"
        style={{
          ...sheetStyle,
          ...transformStyle,
        }}
        onTransitionEnd={onTransitionEnd}
      >
        <SheetContextProvider value={contextValue}>
          <div className="sheet-inner">{children}</div>
        </SheetContextProvider>
      </div>
    </div>
  );
}

export function getVisibleSheetHeightPx(el: HTMLElement | null): number {
  if (!el) {
    return 0;
  }
  return readVisibleSheetHeightPx(el);
}
