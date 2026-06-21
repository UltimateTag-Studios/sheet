import type { MutableRefObject } from "react";

import type { SheetMachineState } from "../machine/sheet-machine";
import { isSheetAtCollapsedHeader } from "./collapsed-header-state";
import { canBodyScroll, sheetBodyRootClass } from "./scroll-mode";
import { sheetFrameStyle } from "./sheet-transform";

export function applySheetSlideFrame(
  sheetSlide: HTMLDivElement,
  visibleHeightPx: number,
  phase: "idle" | "dragging" | "settling",
  suppressTransition: boolean,
): void {
  const frameStyle = sheetFrameStyle(
    visibleHeightPx,
    phase,
    suppressTransition,
  );
  sheetSlide.style.height = frameStyle.height;
  sheetSlide.style.transition = frameStyle.transition;
}

export function syncSheetDomFrame(args: {
  machineState: SheetMachineState;
  sheetRoot: HTMLDivElement | null;
  sheetSlide: HTMLDivElement | null;
  bodyRoot: HTMLDivElement | null;
  canBodyScrollRef: MutableRefObject<boolean>;
}): void {
  const { machineState, sheetRoot, sheetSlide, bodyRoot } = args;

  if (sheetSlide) {
    applySheetSlideFrame(
      sheetSlide,
      machineState.visibleHeightPx,
      "dragging",
      false,
    );
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
