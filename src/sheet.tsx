import type { CSSProperties, ReactNode, TransitionEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChromeMeasureProvider } from "./context/chrome-measure-context";
import { SheetContextProvider } from "./context/sheet-context";
import { useSheetMachine } from "./gesture/use-sheet-machine";
import { useSheetPointerHandlers } from "./gesture/use-sheet-pointer-handlers";
import { drawerStyleForVisibleHeightPx } from "./layout/drawer-transform";
import {
  DEFAULT_HALF_SNAP_FRACTION,
  normalizeHalfSnapFraction,
} from "./layout/normalize-half-snap-fraction";
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
  /** Merged layout vars + optional drawer visual overrides. */
  drawerStyle?: CSSProperties;
  /** Optional handle visual overrides. */
  drawerHandleStyle?: CSSProperties;
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
  drawerStyle,
  drawerHandleStyle,
  onSnapHeightsChange,
}: SheetProps) {
  const resolvedHalfSnap = normalizeHalfSnapFraction(halfSnapFraction);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const bodyElRef = useRef<HTMLDivElement | null>(null);
  const bodyScrollCleanupRef = useRef<(() => void) | null>(null);
  const scrollTopRef = useRef(0);
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

  const readScrollTop = useCallback(() => {
    if (bodyElRef.current) {
      scrollTopRef.current = bodyElRef.current.scrollTop;
    }
    return scrollTopRef.current;
  }, []);

  const pointerHandlers = useSheetPointerHandlers(dispatch, readScrollTop);

  const prevRestingSnapRef = useRef(state.restingSnap);

  useEffect(() => {
    if (prevRestingSnapRef.current === state.restingSnap) {
      return;
    }

    prevRestingSnapRef.current = state.restingSnap;

    const bodyEl = bodyElRef.current;
    if (!bodyEl) {
      return;
    }

    bodyEl.scrollTop = 0;
    scrollTopRef.current = 0;
  }, [state.restingSnap]);

  const registerChromeEl = useCallback((node: HTMLElement | null) => {
    setChromeEl(node);
  }, []);

  const registerBodyEl = useCallback((node: HTMLDivElement | null) => {
    bodyScrollCleanupRef.current?.();
    bodyScrollCleanupRef.current = null;
    bodyElRef.current = node;
    if (node) {
      const onScroll = () => {
        scrollTopRef.current = node.scrollTop;
      };
      onScroll();
      node.addEventListener("scroll", onScroll, { passive: true });
      bodyScrollCleanupRef.current = () => {
        node.removeEventListener("scroll", onScroll);
      };
    }
  }, []);

  useEffect(
    () => () => {
      bodyScrollCleanupRef.current?.();
    },
    [],
  );

  const transformStyle = useMemo(
    () => drawerStyleForVisibleHeightPx(state.visibleHeightPx, state.phase),
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
      dispatch,
      pointerHandlers,
      drawerHandleStyle,
      registerChromeEl,
      registerBodyEl,
    }),
    [
      collapsedHeightPx,
      dispatch,
      drawerHandleStyle,
      fullHeightPx,
      pointerHandlers,
      registerBodyEl,
      registerChromeEl,
      state.phase,
      state.restingSnap,
      state.visibleHeightPx,
    ],
  );

  return (
    <div
      ref={sheetRef}
      className="sheet-drawer"
      style={{
        bottom: "0px",
        ...drawerStyle,
        ...transformStyle,
      }}
      onTransitionEnd={onTransitionEnd}
      data-sheet-phase={state.phase}
    >
      <SheetContextProvider value={contextValue}>
        <ChromeMeasureProvider onChromeMeasure={registerChromeEl}>
          <div className="sheet-drawer-inner">{children}</div>
        </ChromeMeasureProvider>
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
