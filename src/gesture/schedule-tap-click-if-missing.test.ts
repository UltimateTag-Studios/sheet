/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

import { scheduleTapClickIfMissing } from "./schedule-tap-click-if-missing";

async function flushDoubleRaf(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

describe("scheduleTapClickIfMissing", () => {
  it("synthesizes click when pointerup does not produce one", async () => {
    const button = document.createElement("button");
    button.type = "button";
    document.body.appendChild(button);

    const onClick = vi.fn();
    button.addEventListener("click", onClick);

    scheduleTapClickIfMissing(button, 10, 10);

    expect(onClick).not.toHaveBeenCalled();

    await flushDoubleRaf();

    expect(onClick).toHaveBeenCalledTimes(1);

    button.remove();
  });

  it("does not double-fire when click already follows pointerup", async () => {
    const button = document.createElement("button");
    button.type = "button";
    document.body.appendChild(button);

    const onClick = vi.fn();
    button.addEventListener("click", onClick);

    scheduleTapClickIfMissing(button, 10, 10);
    button.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
      }),
    );

    await flushDoubleRaf();

    expect(onClick).toHaveBeenCalledTimes(1);

    button.remove();
  });
});
