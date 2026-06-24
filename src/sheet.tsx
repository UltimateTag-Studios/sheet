import type { ReactNode, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { SheetContextProvider } from "./context/sheet-context";
import { useSheetHostEl } from "./context/sheet-host-context";
import { sheetDebugLog } from "./debug/sheet-debug";
import { useSheetPointerHandlers } from "./gesture/use-sheet-pointer-handlers";
import { useSheetBodyScroll } from "./hooks/use-sheet-body-scroll";
import { useSheetMeasure } from "./hooks/use-sheet-measure";
import { useSheetSlideFrame } from "./hooks/use-sheet-slide-frame";
import { isSheetAtCollapsedHeader } from "./layout/collapsed-header-state";
import {
  DEFAULT_HALF_SNAP_FRACTION,
  normalizeHalfSnapFraction,
} from "./layout/normalize-half-snap-fraction";
import type { SheetLayoutFrameChange } from "./layout/sheet-layout-frame-change";
import { toSheetLayoutFrameChange } from "./layout/sheet-layout-frame-change";
import type { SheetLayoutConfig } from "./layout/sheet-layout-vars";
import { buildSheetLayoutVars } from "./layout/sheet-layout-vars";
import { readVisibleSheetHeightPx } from "./layout/snap-heights";
import type { SheetSnap } from "./layout/snap-math";
import type { SheetSnapHeights } from "./layout/use-snap-heights";
import type {
  SheetMachineDispatch,
  SheetMachineEffect,
  SheetMachineState,
} from "./machine";
import { useSheetMachine } from "./machine";
import { runSheetMachineEffect } from "./sheet/run-sheet-effect";

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
   * During drag, `visibleHeightPx` matches the live `.sheet` DOM height.
   * During CSS height transitions, read `.sheet` geometry for in-between heights.
   */
  onLayoutFrameChange?: (frame: SheetLayoutFrameChange) => void;
  /** Log settle and controlled-snap events to console ([sheet] prefix). */
  debug?: boolean;
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
  debug = false,
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

  const onSnapChangeRef = useRef(onSnapChange);
  onSnapChangeRef.current = onSnapChange;
  const onDragInteractionChangeRef = useRef(onDragInteractionChange);
  onDragInteractionChangeRef.current = onDragInteractionChange;
  const onSnapSettledRef = useRef(onSnapSettled);
  onSnapSettledRef.current = onSnapSettled;
  const onSnapHeightsChangeRef = useRef(onSnapHeightsChange);
  onSnapHeightsChangeRef.current = onSnapHeightsChange;
  const onLayoutFrameChangeRef = useRef(onLayoutFrameChange);
  onLayoutFrameChangeRef.current = onLayoutFrameChange;
  const debugRef = useRef(debug);
  debugRef.current = debug;

  const dispatchRef = useRef<SheetMachineDispatch | null>(null);
  const hookStateRef = useRef<RefObject<SheetMachineState | null> | null>(null);

  const emitLayoutFrameChange = useCallback(
    (machineState: SheetMachineState) => {
      onLayoutFrameChangeRef.current?.(toSheetLayoutFrameChange(machineState));
    },
    [],
  );

  const emitLayoutFrameChangeRef = useRef(emitLayoutFrameChange);
  emitLayoutFrameChangeRef.current = emitLayoutFrameChange;

  const applyBodyScrollDeltaRef = useRef<(deltaPx: number) => void>(() => {});
  const startScrollMomentumRef = useRef<(velocityPxPerMs: number) => void>(
    () => {},
  );
  const cancelScrollMomentumRef = useRef<() => void>(() => {});
  const resetBodyScrollRef = useRef<() => void>(() => {});

  const runEffect = useCallback((effect: SheetMachineEffect) => {
    runSheetMachineEffect(effect, {
      sheetSlideRef,
      machineStateRef: hookStateRef,
      debugRef,
      onSnapChangeRef,
      onDragInteractionChangeRef,
      onSnapSettledRef,
      onSnapHeightsChangeRef,
      emitLayoutFrameChangeRef,
      applyBodyScrollDeltaRef,
      startScrollMomentumRef,
      cancelScrollMomentumRef,
      resetBodyScrollRef,
      canBodyScrollRef,
      setCanBodyScrollEnabledRef,
    });
  }, []);

  const onLayoutMeasureRef = useRef<
    ((heights: SheetSnapHeights) => void) | undefined
  >(undefined);

  const { registerChromeMeasure, syncReserveHeightPx } = useSheetMeasure({
    hostEl,
    halfSnapFraction: resolvedHalfSnap,
    onLayoutMeasureRef,
  });

  const { state, stateRef, isReady, dispatch, readPhase } = useSheetMachine({
    restingSnap,
    controlledSnap: snap,
    runEffect,
    debug,
  });

  dispatchRef.current = dispatch;
  hookStateRef.current = stateRef;

  useEffect(() => {
    if (debug) {
      sheetDebugLog(true, "debug enabled");
    }
  }, [debug]);

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
    startScrollMomentum,
    cancelScrollMomentum,
    resetBodyScroll,
  } = useSheetBodyScroll();

  applyBodyScrollDeltaRef.current = applyBodyScrollDelta;
  startScrollMomentumRef.current = startScrollMomentum;
  cancelScrollMomentumRef.current = cancelScrollMomentum;
  resetBodyScrollRef.current = resetBodyScroll;

  const collapsedHeightPx = state?.collapsedHeightPx ?? 0;
  const fullHeightPx = state?.fullHeightPx ?? 0;

  const registerBodyRoot = useCallback(
    (node: HTMLDivElement | null) => {
      bodyRootRef.current = node;
      registerBodyEl(node);
    },
    [registerBodyEl],
  );

  const readPointerArm = useCallback(
    () => stateRef.current?.pointerArm ?? null,
    [stateRef],
  );

  const readVisibleHeightPx = useCallback(
    () => stateRef.current?.visibleHeightPx ?? 0,
    [stateRef],
  );

  const pointerHandlers = useSheetPointerHandlers(
    dispatch,
    readScrollTop,
    readPhase,
    readPointerArm,
  );

  const { frameStyle, onTransitionEnd } = useSheetSlideFrame({
    visibleHeightPx: state?.visibleHeightPx ?? 0,
    phase: state?.phase ?? "idle",
    enabled: isReady,
    onSettleComplete: () => {
      dispatch({ type: "settleComplete" });
    },
  });

  const [canBodyScrollEnabled, setCanBodyScrollEnabled] = useState(false);
  setCanBodyScrollEnabledRef.current = setCanBodyScrollEnabled;

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
      readVisibleHeightPx,
    }),
    [collapsedHeightPx, fullHeightPx, readVisibleHeightPx, restingSnap, state],
  );

  if (!hostEl) {
    return null;
  }

  return (
    <div
      ref={sheetSlideRef}
      className="sheet"
      data-sheet-phase={state?.phase ?? "idle"}
      data-sheet-collapsed-header={atCollapsedHeader ? "" : undefined}
      style={{
        ...sheetSlideStyle,
        ...frameStyle,
      }}
      onTransitionEnd={onTransitionEnd}
    >
      <SheetContextProvider controls={controlsValue} metrics={metricsValue}>
        {children}
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
