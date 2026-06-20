import type { CSSProperties, ReactNode } from "react";
import { createContext, useContext } from "react";

import type { SheetPointerHandlers } from "../gesture/use-sheet-pointer-handlers";
import type { SheetSnap } from "../layout/snap-math";

/** Stable layout wiring — does not change during drag frames. */
export type SheetControlsContextValue = {
  pointerHandlers: SheetPointerHandlers;
  sheetHandleStyle?: CSSProperties;
  canBodyScroll: boolean;
  registerBodyEl: (node: HTMLDivElement | null) => void;
  registerChromeMeasure: (node: HTMLElement | null) => void;
  /** Reports laid-out reserve spacer height in px (from the CSS length prop). */
  syncReserveHeightPx: (heightPx: number) => void;
};

/** Live snap / height metrics — changes during gestures. */
export type SheetMetricsContextValue = {
  sheetSnap: SheetSnap;
  visibleHeightPx: number;
  collapsedHeightPx: number;
  fullHeightPx: number;
  isDragging: boolean;
};

export type SheetContextValue = SheetControlsContextValue &
  SheetMetricsContextValue;

const SheetControlsContext = createContext<SheetControlsContextValue | null>(
  null,
);
const SheetMetricsContext = createContext<SheetMetricsContextValue | null>(
  null,
);

export function SheetControlsProvider({
  value,
  children,
}: {
  value: SheetControlsContextValue;
  children: ReactNode;
}) {
  return (
    <SheetControlsContext.Provider value={value}>
      {children}
    </SheetControlsContext.Provider>
  );
}

export function SheetMetricsProvider({
  value,
  children,
}: {
  value: SheetMetricsContextValue;
  children: ReactNode;
}) {
  return (
    <SheetMetricsContext.Provider value={value}>
      {children}
    </SheetMetricsContext.Provider>
  );
}

export function SheetContextProvider({
  controls,
  metrics,
  children,
}: {
  controls: SheetControlsContextValue;
  metrics: SheetMetricsContextValue;
  children: ReactNode;
}) {
  return (
    <SheetControlsProvider value={controls}>
      <SheetMetricsProvider value={metrics}>{children}</SheetMetricsProvider>
    </SheetControlsProvider>
  );
}

export function useSheetControlsContext(): SheetControlsContextValue {
  const value = useContext(SheetControlsContext);
  if (!value) {
    throw new Error("useSheetControlsContext must be used within Sheet");
  }
  return value;
}

export function useSheetMetricsContext(): SheetMetricsContextValue {
  const value = useContext(SheetMetricsContext);
  if (!value) {
    throw new Error("useSheetMetricsContext must be used within Sheet");
  }
  return value;
}

/** Full sheet context — prefer controls/metrics hooks in layout hot paths. */
export function useSheetContext(): SheetContextValue {
  return {
    ...useSheetControlsContext(),
    ...useSheetMetricsContext(),
  };
}

export function useCanBodyScroll(): boolean {
  return useSheetControlsContext().canBodyScroll;
}
