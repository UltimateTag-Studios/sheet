import type {
  ScrollPointerSample,
  SheetMachineState,
  SheetPointerArm,
  SheetPointerRoute,
  SheetPointerSurface,
} from "../state";

export function createPointerArm(args: {
  pointerId: number;
  clientY: number;
  scrollTopPx: number;
  surface: SheetPointerSurface;
  route: SheetPointerRoute;
}): SheetPointerArm {
  return {
    pointerId: args.pointerId,
    startClientY: args.clientY,
    scrollTopPx: args.scrollTopPx,
    surface: args.surface,
    route: args.route,
    committed: false,
    hadEffect: false,
  };
}

export function markPointerHadEffect(
  state: SheetMachineState,
): SheetMachineState {
  if (!state.pointerArm || state.pointerArm.hadEffect) {
    return state;
  }
  return {
    ...state,
    pointerArm: { ...state.pointerArm, hadEffect: true },
  };
}

export function appendScrollSample(
  state: SheetMachineState,
  sample: ScrollPointerSample,
): SheetMachineState {
  const cutoffMs = sample.timeMs - 120;
  const scrollPointerSamples = [...state.scrollPointerSamples, sample].filter(
    (item) => item.timeMs >= cutoffMs,
  );
  return { ...state, scrollPointerSamples };
}

export function clearScrollSamples(
  state: SheetMachineState,
): SheetMachineState {
  if (state.scrollPointerSamples.length === 0) {
    return state;
  }
  return { ...state, scrollPointerSamples: [] };
}
