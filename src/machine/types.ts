import type { SheetSnap } from "../layout/snap-math";
import type {
  SheetMachineState,
  SheetPointerRoute,
  SheetPointerSurface,
} from "./state";

export type SheetMachinePointerArm = {
  type: "pointerArm";
  pointerId: number;
  clientY: number;
  scrollTopPx: number;
  surface: SheetPointerSurface;
  route: SheetPointerRoute;
};

export type SheetMachinePointerCommit = {
  type: "pointerCommit";
  pointerId: number;
  clientY: number;
  scrollTopPx: number;
  timeMs: number;
};

export type SheetMachinePointerMove = {
  type: "pointerMove";
  pointerId: number;
  clientY: number;
  scrollTopPx: number;
  timeMs: number;
};

export type SheetMachinePointerUp = {
  type: "pointerUp";
  pointerId: number;
};

export type SheetMachineMeasure = {
  type: "measure";
  collapsedHeightPx: number;
  halfHeightPx: number;
  fullHeightPx: number;
};

export type SetSnapSource = "controlled" | "gesture";

export type SheetMachineSetSnap = {
  type: "setSnap";
  snap: SheetSnap;
  source?: SetSnapSource;
};

export type SheetMachineSettleComplete = {
  type: "settleComplete";
};

export type SheetMachineEvent =
  | SheetMachinePointerArm
  | SheetMachinePointerCommit
  | SheetMachinePointerMove
  | SheetMachinePointerUp
  | SheetMachineMeasure
  | SheetMachineSetSnap
  | SheetMachineSettleComplete;

export type SheetMachineEffect =
  | { type: "notifySnapChange"; snap: SheetSnap }
  | { type: "notifyDragStart" }
  | { type: "notifyDragEnd" }
  /** Positive values scroll content down (increase scrollTop). */
  | { type: "scrollBody"; deltaPx: number }
  | {
      type: "syncDragFrame";
      heightPx: number;
      bodyScrollEnabled: boolean;
    }
  | { type: "syncSettleFrame"; heightPx: number; settleEpoch: number }
  | { type: "syncIdleFrame"; suppressTransition: boolean }
  | { type: "syncBodyScrollEnabled"; enabled: boolean }
  | { type: "notifySnapSettled"; snap: SheetSnap; settleEpoch: number }
  | {
      type: "notifySnapHeightsChange";
      collapsedHeightPx: number;
      halfHeightPx: number;
      fullHeightPx: number;
    }
  | { type: "notifyLayoutFrame" }
  | { type: "resetBodyScroll" }
  | { type: "cancelScrollMomentum" }
  | { type: "startScrollMomentum"; velocityPxPerMs: number }
  | { type: "activatePostDragClickRepair" };

export type SheetMachineResult = {
  state: SheetMachineState;
  effects: SheetMachineEffect[];
};
