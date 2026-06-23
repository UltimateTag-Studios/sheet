import { describe, expect, it, vi } from "vitest";

import { activatePointerDownTarget } from "./activate-pointer-down-target";

describe("activatePointerDownTarget", () => {
  it("clicks the button when the press target is a child node", () => {
    const onClick = vi.fn();
    const button = document.createElement("button");
    const label = document.createElement("span");
    label.textContent = "Save";
    button.append(label);
    button.addEventListener("click", onClick);

    activatePointerDownTarget(label);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("clicks a non-interactive element when no activatable ancestor exists", () => {
    const onClick = vi.fn();
    const div = document.createElement("div");
    div.addEventListener("click", onClick);

    activatePointerDownTarget(div);

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
