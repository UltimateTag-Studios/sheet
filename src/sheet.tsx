import type { CSSProperties, ReactNode, TransitionEvent } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { SheetContextProvider } from "./context/sheet-context";
import { useSheetMachine } from "./gesture/use-sheet-machine";
import { useSheetPointerHandlers } from "./gesture/use-sheet-pointer-handlers";
import { useSheetBodyScroll } from "./hooks/use-sheet-body-scroll";
import { isSheetAtCollapsedHeader } from "./layout/collapsed-header-state";
import {
  DEFAULT_HALF_SNAP_FRACTION,
  normalizeHalfSnapFraction,
} from "./layout/normalize-half-snap-fraction";
import { canBodyScroll, sheetBodyRootClass } from "./layout/scroll-mode";
import { sheetTransformStyle } from "./layout/sheet-transform";
import { readVisibleSheetHeightPx } from "./layout/snap-heights";
import type { SheetSnap } from "./layout/snap-math";
import { useSheetSnapHeights } from "./layout/use-snap-heights";
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

function syncSheetDomFrame(args: {
  machineState: SheetMachineState;
  sheetRoot: HTMLDivElement | null;
  sheetSlide: HTMLDivElement | null;
  bodyRoot: HTMLDivElement | null;
  canBodyScrollRef: React.MutableRefObject<boolean>;
}): void {
  const { machineState, sheetRoot, sheetSlide, bodyRoot } = args;

  if (sheetSlide) {
    const frameStyle = sheetTransformStyle(
      machineState.visibleHeightPx,
      "dragging",
    );
    sheetSlide.style.transform = frameStyle.transform ?? "";
    sheetSlide.style.transition = frameStyle.transition ?? "";
  }

  if (sheetRoot) {
    const atCollapsedHeader = isSheetAtCollapsedHeader({
      sheetSnap: machineState.restingSnap,
      isDragging: true,
      visibleHeightPx: machineState.visibleHeightPx,
      collapsedHeightPx: machineState.collapsedHeightPx,
    });
    if (atCollapsedHeader) {
      sheetRoot.setAttribute("data-sheet-collapsed-header", "");
    } else {
      sheetRoot.removeAttribute("data-sheet-collapsed-header");
    }
    sheetRoot.dataset.sheetPhase = "dragging";
  }

  const nextCanBodyScroll = canBodyScroll({
    sheetSnap: machineState.restingSnap,
    visibleHeightPx: machineState.visibleHeightPx,
    fullHeightPx: machineState.fullHeightPx,
    isDragging: true,
  });
  if (nextCanBodyScroll !== args.canBodyScrollRef.current) {
    args.canBodyScrollRef.current = nextCanBodyScroll;
    if (bodyRoot) {
      bodyRoot.className = sheetBodyRootClass(nextCanBodyScroll);
    }
  }
}

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

  const onSnapHeightsChangeRef = useRef(onSnapHeightsChange);
  onSnapHeightsChangeRef.current = onSnapHeightsChange;

  const sheetRootRef = useRef<HTMLDivElement | null>(null);
  const sheetSlideRef = useRef<HTMLDivElement | null>(null);
  const bodyRootRef = useRef<HTMLDivElement | null>(null);
  const canBodyScrollRef = useRef(false);

  const [chromeEl, setChromeEl] = useState<HTMLElement | null>(null);
  const [reserveHeightPx, setReserveHeightPx] = useState(0);

  const { collapsedHeightPx, halfHeightPx, fullHeightPx } = useSheetSnapHeights(
    {
      chromeEl,
      reserveHeightPx,
      collapsedBottomInsetPx,
      halfSnapFraction: resolvedHalfSnap,
    },
  );

  useEffect(() => {
    onSnapHeightsChangeRef.current?.({ collapsedHeightPx, fullHeightPx });
  }, [collapsedHeightPx, fullHeightPx]);

  const syncReserveHeightPx = useCallback((heightPx: number) => {
    setReserveHeightPx((current) =>
      current === heightPx ? current : heightPx,
    );
  }, []);

  const applyDragFrame = useCallback((machineState: SheetMachineState) => {
    syncSheetDomFrame({
      machineState,
      sheetRoot: sheetRootRef.current,
      sheetSlide: sheetSlideRef.current,
      bodyRoot: bodyRootRef.current,
      canBodyScrollRef,
    });
  }, []);

  const { state, dispatch } = useSheetMachine({
    restingSnap: snap ?? defaultSnap,
    controlledSnap: snap,
    collapsedHeightPx,
    halfHeightPx,
    fullHeightPx,
    onSnapChange,
    onDragInteractionChange,
    onResult: (event, result) => {
      if (event.type === "pointerMove" && result.state.phase === "dragging") {
        applyDragFrame(result.state);
      }
    },
  });

  const [canBodyScrollEnabled, setCanBodyScrollEnabled] = useState(() =>
    canBodyScroll({
      sheetSnap: state.restingSnap,
      visibleHeightPx: state.visibleHeightPx,
      fullHeightPx: state.fullHeightPx,
      isDragging: state.phase === "dragging",
    }),
  );

  useEffect(() => {
    if (state.phase === "dragging") {
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
  }, [
    state.phase,
    state.restingSnap,
    state.visibleHeightPx,
    state.fullHeightPx,
  ]);

  const {
    readScrollTop,
    applyBodyScrollDelta,
    registerBodyEl,
    recordScrollPointerSample,
    releaseScrollMomentum,
    cancelScrollMomentum,
    clearScrollPointerTracking,
  } = useSheetBodyScroll(state.restingSnap);

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

  const registerChromeMeasure = useCallback((node: HTMLElement | null) => {
    setChromeEl(node);
  }, []);

  const pointerHandlers = useSheetPointerHandlers(
    dispatch,
    readScrollTop,
    applyBodyScrollDelta,
    scrollMomentum,
  );

  const transformStyle = useMemo(
    () => sheetTransformStyle(state.visibleHeightPx, state.phase),
    [state.phase, state.visibleHeightPx],
  );

  useLayoutEffect(() => {
    if (state.phase === "dragging") {
      return;
    }
    const slide = sheetSlideRef.current;
    if (!slide) {
      return;
    }
    slide.style.transform = transformStyle.transform ?? "";
    slide.style.transition = transformStyle.transition ?? "";
  }, [state.phase, transformStyle]);

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

  const atCollapsedHeader = isSheetAtCollapsedHeader({
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
      sheetSnap: state.restingSnap,
      visibleHeightPx: state.visibleHeightPx,
      collapsedHeightPx,
      fullHeightPx,
      isDragging: state.phase === "dragging",
    }),
    [
      collapsedHeightPx,
      fullHeightPx,
      state.phase,
      state.restingSnap,
      state.visibleHeightPx,
    ],
  );

  return (
    <div
      ref={sheetRootRef}
      className="sheet"
      style={{ bottom: "0px" }}
      data-sheet-phase={state.phase}
      data-sheet-collapsed-header={atCollapsedHeader ? "" : undefined}
    >
      <div
        ref={sheetSlideRef}
        className="sheet-slide"
        style={{
          ...sheetStyle,
          ...transformStyle,
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
