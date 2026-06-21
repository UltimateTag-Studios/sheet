import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SheetContextProvider } from "./context/sheet-context";
import { useSheetHostEl } from "./context/sheet-host-context";
import { useSheetMachine } from "./gesture/use-sheet-machine";
import { useSheetPointerHandlers } from "./gesture/use-sheet-pointer-handlers";
import { useSheetBodyScroll } from "./hooks/use-sheet-body-scroll";
import { useSheetMeasure } from "./hooks/use-sheet-measure";
import { useSheetSlideFrame } from "./hooks/use-sheet-slide-frame";
import { isSheetAtCollapsedHeader } from "./layout/collapsed-header-state";
import {
  DEFAULT_HALF_SNAP_FRACTION,
  normalizeHalfSnapFraction,
} from "./layout/normalize-half-snap-fraction";
import { canBodyScroll } from "./layout/scroll-mode";
import { readVisibleSheetHeightPx } from "./layout/snap-heights";
import type { SheetSnap } from "./layout/snap-math";
import { syncSheetDomFrame } from "./layout/sync-sheet-dom-frame";
import type { SheetSnapHeights } from "./layout/use-snap-heights";
import type { SheetMachineState } from "./machine/sheet-machine";

export type { SheetSnap };
export { DEFAULT_HALF_SNAP_FRACTION };

export type SheetProps = {
  children: ReactNode;
  snap?: SheetSnap;
  defaultSnap?: SheetSnap;
  onSnapChange?: (snap: SheetSnap) => void;
  /** Fires when the user starts or stops dragging (e.g. defer map camera updates). */
  onDragInteractionChange?: (isDragging: boolean) => void;
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
  halfSnapFraction,
  sheetStyle,
  sheetHandleStyle,
  onSnapHeightsChange,
}: SheetProps) {
  const hostEl = useSheetHostEl();
  const resolvedHalfSnap = normalizeHalfSnapFraction(halfSnapFraction);
  const restingSnap = snap ?? defaultSnap;

  const sheetRootRef = useRef<HTMLDivElement | null>(null);
  const sheetSlideRef = useRef<HTMLDivElement | null>(null);
  const bodyRootRef = useRef<HTMLDivElement | null>(null);
  const canBodyScrollRef = useRef(false);
  const onLayoutMeasureRef = useRef<
    ((heights: SheetSnapHeights) => void) | undefined
  >(undefined);

  const {
    collapsedHeightPx,
    fullHeightPx,
    registerChromeMeasure,
    syncReserveHeightPx,
  } = useSheetMeasure({
    hostEl,
    halfSnapFraction: resolvedHalfSnap,
    onSnapHeightsChange,
    onLayoutMeasureRef,
  });

  const applyDragFrame = useCallback((machineState: SheetMachineState) => {
    syncSheetDomFrame({
      machineState,
      sheetRoot: sheetRootRef.current,
      sheetSlide: sheetSlideRef.current,
      bodyRoot: bodyRootRef.current,
      canBodyScrollRef,
    });
  }, []);

  const { state, isReady, dispatch } = useSheetMachine({
    restingSnap,
    controlledSnap: snap,
    onSnapChange,
    onDragInteractionChange,
    onResult: (event, result) => {
      if (event.type === "pointerMove" && result.state.phase === "dragging") {
        applyDragFrame(result.state);
      }
    },
  });

  onLayoutMeasureRef.current = (heights) => {
    dispatch({
      type: "measure",
      collapsedHeightPx: heights.collapsedHeightPx,
      halfHeightPx: heights.halfHeightPx,
      fullHeightPx: heights.fullHeightPx,
    });
  };

  const {
    readScrollTop,
    applyBodyScrollDelta,
    registerBodyEl,
    recordScrollPointerSample,
    releaseScrollMomentum,
    cancelScrollMomentum,
    clearScrollPointerTracking,
  } = useSheetBodyScroll(state?.restingSnap ?? restingSnap);

  const scrollMomentum = useMemo(
    () => ({
      recordScrollPointerSample,
      releaseScrollMomentum,
      cancelScrollMomentum,
      clearScrollPointerTracking,
    }),
    [
      cancelScrollMomentum,
      clearScrollPointerTracking,
      recordScrollPointerSample,
      releaseScrollMomentum,
    ],
  );

  const registerBodyRoot = useCallback(
    (node: HTMLDivElement | null) => {
      bodyRootRef.current = node;
      registerBodyEl(node);
    },
    [registerBodyEl],
  );

  const pointerHandlers = useSheetPointerHandlers(
    dispatch,
    readScrollTop,
    applyBodyScrollDelta,
    scrollMomentum,
  );

  const { frameStyle, onTransitionEnd } = useSheetSlideFrame({
    visibleHeightPx: state?.visibleHeightPx ?? 0,
    phase: state?.phase ?? "idle",
    sheetSlideRef,
    enabled: isReady,
    onSettleComplete: () => {
      dispatch({ type: "settleComplete" });
    },
  });

  const [canBodyScrollEnabled, setCanBodyScrollEnabled] = useState(false);

  useEffect(() => {
    if (!state || state.phase === "dragging") {
      return;
    }
    const next = canBodyScroll({
      sheetSnap: state.restingSnap,
      visibleHeightPx: state.visibleHeightPx,
      fullHeightPx: state.fullHeightPx,
      isDragging: false,
    });
    canBodyScrollRef.current = next;
    setCanBodyScrollEnabled((current) => (current === next ? current : next));
  }, [state]);

  const atCollapsedHeader =
    state !== null &&
    isSheetAtCollapsedHeader({
      sheetSnap: state.restingSnap,
      isDragging: state.phase === "dragging",
      visibleHeightPx: state.visibleHeightPx,
      collapsedHeightPx,
    });

  const controlsValue = useMemo(
    () => ({
      pointerHandlers,
      sheetHandleStyle,
      canBodyScroll: canBodyScrollEnabled,
      registerBodyEl: registerBodyRoot,
      registerChromeMeasure,
      syncReserveHeightPx,
    }),
    [
      canBodyScrollEnabled,
      pointerHandlers,
      registerBodyRoot,
      registerChromeMeasure,
      sheetHandleStyle,
      syncReserveHeightPx,
    ],
  );

  const metricsValue = useMemo(
    () => ({
      sheetSnap: state?.restingSnap ?? restingSnap,
      visibleHeightPx: state?.visibleHeightPx ?? 0,
      collapsedHeightPx,
      fullHeightPx,
      isDragging: state?.phase === "dragging",
    }),
    [collapsedHeightPx, fullHeightPx, restingSnap, state],
  );

  if (!hostEl) {
    return null;
  }

  return (
    <div
      ref={sheetRootRef}
      className="sheet"
      data-sheet-phase={state?.phase ?? "idle"}
      data-sheet-collapsed-header={atCollapsedHeader ? "" : undefined}
    >
      <div
        ref={sheetSlideRef}
        className="sheet-slide"
        style={{
          ...sheetStyle,
          ...frameStyle,
        }}
        onTransitionEnd={onTransitionEnd}
      >
        <SheetContextProvider controls={controlsValue} metrics={metricsValue}>
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
