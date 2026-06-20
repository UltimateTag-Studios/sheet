import type { ReactNode } from "react";
import { createContext, useContext } from "react";

import type { SheetPointerHandlers } from "../gesture/use-sheet-pointer-handlers";
import { canBodyScroll } from "../layout/scroll-mode";
import type { SheetSnap } from "../layout/snap-math";
import type { SheetMachineEvent } from "../machine/sheet-machine";

export type SheetContextValue = {
  sheetSnap: SheetSnap;
  visibleHeightPx: number;
  collapsedHeightPx: number;
  fullHeightPx: number;
  isDragging: boolean;
  dispatch: (event: SheetMachineEvent) => void;
  pointerHandlers: SheetPointerHandlers;
  drawerHandleStyle?: React.CSSProperties;
  registerChromeEl: (node: HTMLElement | null) => void;
  registerBodyEl: (node: HTMLDivElement | null) => void;
};

const SheetContext = createContext<SheetContextValue | null>(null);

export function SheetContextProvider({
  value,
  children,
}: {
  value: SheetContextValue;
  children: ReactNode;
}) {
  return (
    <SheetContext.Provider value={value}>{children}</SheetContext.Provider>
  );
}

export function useSheetContext(): SheetContextValue {
  const value = useContext(SheetContext);
  if (!value) {
    throw new Error("useSheetContext must be used within Sheet");
  }
  return value;
}

export function useCanBodyScroll(): boolean {
  const { sheetSnap, visibleHeightPx, fullHeightPx, isDragging } =
    useSheetContext();
  return canBodyScroll({
    sheetSnap,
    visibleHeightPx,
    fullHeightPx,
    isDragging,
  });
}
