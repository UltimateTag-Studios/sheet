import type { ReactNode } from "react";
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
import type { SheetLayoutFrameChange } from "./layout/sheet-layout-frame-change";
import { toSheetLayoutFrameChange } from "./layout/sheet-layout-frame-change";
import type { SheetLayoutConfig } from "./layout/sheet-layout-vars";
import { buildSheetLayoutVars } from "./layout/sheet-layout-vars";
import { readVisibleSheetHeightPx } from "./layout/snap-heights";
import type { SheetSnap } from "./layout/snap-math";
import { applySheetSlideFrame } from "./layout/sync-sheet-dom-frame";
import type { SheetSnapHeights } from "./layout/use-snap-heights";
import type { SheetMachineState } from "./machine/sheet-machine";

export type { SheetLayoutFrameChange };

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
  /** Sheet geometry — spacing/sizing tokens as CSS variables. */
  layout?: SheetLayoutConfig;
  /** Called when measured snap heights change. */
  onSnapHeightsChange?: (heights: {
    collapsedHeightPx: number;
    halfHeightPx: number;
    fullHeightPx: number;
  }) => void;
  /** Fires after the sheet CSS height transition completes at a snap. */
  onSnapSettled?: (snap: SheetSnap) => void;
  /**
   * Fires when the machine commits a layout frame (drag move, snap apply, settle start).
   * During drag, `visibleHeightPx` matches the live `.sheet-slide` DOM height.
   * During CSS height transitions, read `.sheet-slide` geometry for in-between heights.
   */
  onLayoutFrameChange?: (frame: SheetLayoutFrameChange) => void;
};

export function Sheet({
  children,
  snap,
  defaultSnap = "half",
  onSnapChange,
  onDragInteractionChange,
  halfSnapFraction,
  layout = {},
  onSnapHeightsChange,
  onSnapSettled,
  onLayoutFrameChange,
}: SheetProps) {
  const hostEl = useSheetHostEl();
  const resolvedHalfSnap = normalizeHalfSnapFraction(halfSnapFraction);
  const restingSnap = snap ?? defaultSnap;

  const sheetSlideRef = useRef<HTMLDivElement | null>(null);
  const bodyRootRef = useRef<HTMLDivElement | null>(null);
  const canBodyScrollRef = useRef(false);
  const setCanBodyScrollEnabledRef = useRef<
    (value: boolean | ((current: boolean) => boolean)) => void
  >(() => {});
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

  const onLayoutFrameChangeRef = useRef(onLayoutFrameChange);
  onLayoutFrameChangeRef.current = onLayoutFrameChange;

  const emitLayoutFrameChange = useCallback(
    (machineState: SheetMachineState) => {
      onLayoutFrameChangeRef.current?.(toSheetLayoutFrameChange(machineState));
    },
    [],
  );

  const emitLayoutFrameChangeRef = useRef(emitLayoutFrameChange);
  emitLayoutFrameChangeRef.current = emitLayoutFrameChange;

  const { state, isReady, dispatch, readPhase } = useSheetMachine({
    restingSnap,
    controlledSnap: snap,
    onSnapChange,
    onDragInteractionChange,
    onResult: (event, result) => {
      if (event.type !== "pointerMove" || result.state.phase !== "dragging") {
        return;
      }

      const slide = sheetSlideRef.current;
      if (slide) {
        applySheetSlideFrame(
          slide,
          result.state.visibleHeightPx,
          "dragging",
          false,
        );
      }
      emitLayoutFrameChangeRef.current(result.state);

      const nextCanBodyScroll = canBodyScroll({
        sheetSnap: result.state.restingSnap,
        visibleHeightPx: result.state.visibleHeightPx,
        fullHeightPx: result.state.fullHeightPx,
        isDragging: true,
      });
      canBodyScrollRef.current = nextCanBodyScroll;
      setCanBodyScrollEnabledRef.current((current) =>
        current === nextCanBodyScroll ? current : nextCanBodyScroll,
      );
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
    readPhase,
    applyBodyScrollDelta,
    scrollMomentum,
  );

  const onSnapSettledRef = useRef(onSnapSettled);
  onSnapSettledRef.current = onSnapSettled;

  const stateRefForSettle = useRef(state);
  stateRefForSettle.current = state;

  const notifyRestLayoutFrame = useCallback(() => {
    const machineState = stateRefForSettle.current;
    if (!machineState || machineState.phase === "dragging") {
      return;
    }
    emitLayoutFrameChange(machineState);
  }, [emitLayoutFrameChange]);

  const { frameStyle, onTransitionEnd } = useSheetSlideFrame({
    visibleHeightPx: state?.visibleHeightPx ?? 0,
    phase: state?.phase ?? "idle",
    sheetSlideRef,
    enabled: isReady,
    onSettleComplete: () => {
      const result = dispatch({ type: "settleComplete" });
      emitLayoutFrameChange(result.state);
      const snap = result.state.restingSnap;
      if (snap) {
        onSnapSettledRef.current?.(snap);
      }
    },
    onLayoutFrameApplied: notifyRestLayoutFrame,
  });

  const [canBodyScrollEnabled, setCanBodyScrollEnabled] = useState(false);
  setCanBodyScrollEnabledRef.current = setCanBodyScrollEnabled;

  useEffect(() => {
    if (!state) {
      return;
    }
    const next = canBodyScroll({
      sheetSnap: state.restingSnap,
      visibleHeightPx: state.visibleHeightPx,
      fullHeightPx: state.fullHeightPx,
      isDragging: state.phase === "dragging",
    });
    canBodyScrollRef.current = next;
    setCanBodyScrollEnabled((current) => (current === next ? current : next));
  }, [state]);

  const sheetSlideStyle = useMemo(() => buildSheetLayoutVars(layout), [layout]);

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
      layout,
      canBodyScroll: canBodyScrollEnabled,
      registerBodyEl: registerBodyRoot,
      registerChromeMeasure,
      syncReserveHeightPx,
    }),
    [
      canBodyScrollEnabled,
      layout,
      pointerHandlers,
      registerBodyRoot,
      registerChromeMeasure,
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
      ref={sheetSlideRef}
      className="sheet sheet-slide"
      data-sheet-phase={state?.phase ?? "idle"}
      data-sheet-collapsed-header={atCollapsedHeader ? "" : undefined}
      style={{
        ...sheetSlideStyle,
        ...frameStyle,
      }}
      onTransitionEnd={onTransitionEnd}
    >
      <SheetContextProvider controls={controlsValue} metrics={metricsValue}>
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
