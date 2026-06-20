import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTouchClickActivation } from "./use-touch-click-activation";

function TouchButton({ onActivate }: { onActivate: () => void }) {
  const handlers = useTouchClickActivation(onActivate);
  return (
    <button type="button" {...handlers}>
      Go
    </button>
  );
}

describe("useTouchClickActivation", () => {
  afterEach(() => {
    cleanup();
  });

  it("activates on touch pointerup via rAF", () => {
    vi.useFakeTimers();
    const onActivate = vi.fn();
    const { getByRole } = render(<TouchButton onActivate={onActivate} />);
    const button = getByRole("button");

    fireEvent.pointerDown(button, { pointerType: "touch", button: 0 });
    fireEvent.pointerUp(button, { pointerType: "touch", button: 0 });
    expect(onActivate).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(onActivate).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("activates on mouse click", () => {
    const onActivate = vi.fn();
    const { getByRole } = render(<TouchButton onActivate={onActivate} />);
    const button = getByRole("button");

    fireEvent.click(button, { pointerType: "mouse" });
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});
