import { describe, expect, it, vi } from "vitest";

import { activateSheetClickTarget } from "./sheet-click-activation";

describe("activateSheetClickTarget", () => {
  it("clicks the target on the next frame", () => {
    vi.useFakeTimers();
    const button = document.createElement("button");
    const click = vi.fn();
    button.addEventListener("click", click);

    activateSheetClickTarget(button);
    vi.runAllTimers();

    expect(click).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
