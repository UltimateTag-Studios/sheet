import type { RefObject } from "react";

import { sheetDebugLog } from "../debug/sheet-debug";
import { activatePostDragClickRepair } from "../gesture/activate-post-drag-click-repair";
import { applySheetSlideFrame } from "../layout/sync-sheet-dom-frame";
import type { SheetMachineEffect, SheetMachineState } from "../machine";

export type SheetEffectRunnerDeps = {
  sheetSlideRef: RefObject<HTMLDivElement | null>;
  machineStateRef: RefObject<RefObject<SheetMachineState | null> | null>;
  debugRef: RefObject<boolean>;
  onSnapChangeRef: RefObject<
    ((snap: import("../layout/snap-math").SheetSnap) => void) | undefined
  >;
  onDragInteractionChangeRef: RefObject<
    ((isDragging: boolean) => void) | undefined
  >;
  onSnapSettledRef: RefObject<
    ((snap: import("../layout/snap-math").SheetSnap) => void) | undefined
  >;
  onSnapHeightsChangeRef: RefObject<
    | ((heights: {
        collapsedHeightPx: number;
        halfHeightPx: number;
        fullHeightPx: number;
      }) => void)
    | undefined
  >;
  emitLayoutFrameChangeRef: RefObject<(state: SheetMachineState) => void>;
  applyBodyScrollDeltaRef: RefObject<(deltaPx: number) => void>;
  startScrollMomentumRef: RefObject<(velocityPxPerMs: number) => void>;
  cancelScrollMomentumRef: RefObject<() => void>;
  resetBodyScrollRef: RefObject<() => void>;
  canBodyScrollRef: RefObject<boolean>;
  setCanBodyScrollEnabledRef: RefObject<
    (value: boolean | ((current: boolean) => boolean)) => void
  >;
};

export function runSheetMachineEffect(
  effect: SheetMachineEffect,
  deps: SheetEffectRunnerDeps,
): void {
  switch (effect.type) {
    case "notifySnapChange":
      deps.onSnapChangeRef.current?.(effect.snap);
      break;
    case "notifyDragStart":
      deps.onDragInteractionChangeRef.current?.(true);
      break;
    case "notifyDragEnd":
      deps.onDragInteractionChangeRef.current?.(false);
      break;
    case "scrollBody":
      deps.applyBodyScrollDeltaRef.current(effect.deltaPx);
      break;
    case "syncDragFrame": {
      const slide = deps.sheetSlideRef.current;
      if (slide) {
        applySheetSlideFrame(slide, effect.heightPx, "dragging", false);
      }
      deps.canBodyScrollRef.current = effect.bodyScrollEnabled;
      deps.setCanBodyScrollEnabledRef.current((current) =>
        current === effect.bodyScrollEnabled
          ? current
          : effect.bodyScrollEnabled,
      );
      break;
    }
    case "syncSettleFrame": {
      const slide = deps.sheetSlideRef.current;
      if (slide) {
        applySheetSlideFrame(slide, effect.heightPx, "settling", false);
      }
      sheetDebugLog(deps.debugRef.current, "settle enter", {
        targetHeightPx: effect.heightPx,
        settleEpoch: effect.settleEpoch,
        animated: true,
      });
      break;
    }
    case "syncIdleFrame": {
      const slide = deps.sheetSlideRef.current;
      const machineState = deps.machineStateRef.current?.current ?? null;
      if (slide && machineState) {
        applySheetSlideFrame(
          slide,
          machineState.visibleHeightPx,
          "idle",
          effect.suppressTransition,
        );
      }
      break;
    }
    case "notifySnapSettled":
      sheetDebugLog(deps.debugRef.current, "onSnapSettled", {
        snap: effect.snap,
        settleEpoch: effect.settleEpoch,
      });
      deps.onSnapSettledRef.current?.(effect.snap);
      break;
    case "notifySnapHeightsChange":
      deps.onSnapHeightsChangeRef.current?.({
        collapsedHeightPx: effect.collapsedHeightPx,
        halfHeightPx: effect.halfHeightPx,
        fullHeightPx: effect.fullHeightPx,
      });
      break;
    case "notifyLayoutFrame": {
      const machineState = deps.machineStateRef.current?.current ?? null;
      if (machineState) {
        deps.emitLayoutFrameChangeRef.current(machineState);
      }
      break;
    }
    case "syncBodyScrollEnabled":
      deps.canBodyScrollRef.current = effect.enabled;
      deps.setCanBodyScrollEnabledRef.current((current) =>
        current === effect.enabled ? current : effect.enabled,
      );
      break;
    case "cancelScrollMomentum":
      deps.cancelScrollMomentumRef.current();
      break;
    case "resetBodyScroll":
      deps.resetBodyScrollRef.current();
      break;
    case "startScrollMomentum":
      deps.startScrollMomentumRef.current(effect.velocityPxPerMs);
      break;
    case "activatePostDragClickRepair": {
      const slide = deps.sheetSlideRef.current;
      if (slide) {
        activatePostDragClickRepair(slide);
      }
      break;
    }
  }
}
