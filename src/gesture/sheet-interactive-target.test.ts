import { describe, expect, it } from "vitest";

import { isSheetInteractivePointerTarget } from "./sheet-interactive-target";

describe("isSheetInteractivePointerTarget", () => {
  it("returns true for buttons and links", () => {
    expect(
      isSheetInteractivePointerTarget(document.createElement("button")),
    ).toBe(true);
    const link = document.createElement("a");
    link.href = "https://example.com";
    expect(isSheetInteractivePointerTarget(link)).toBe(true);
  });

  it("returns true for opt-in interactive descendants", () => {
    const card = document.createElement("div");
    card.setAttribute("data-sheet-interactive", "");
    const label = document.createElement("span");
    card.append(label);

    expect(isSheetInteractivePointerTarget(label)).toBe(true);
  });

  it("returns false for plain sheet body surfaces", () => {
    expect(isSheetInteractivePointerTarget(document.createElement("div"))).toBe(
      false,
    );
  });
});
