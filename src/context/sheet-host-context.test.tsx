import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SheetHost, useSheetHostEl } from "./sheet-host-context";

function HostProbe() {
  const hostEl = useSheetHostEl();
  return <span data-testid="host-probe">{hostEl?.className ?? "missing"}</span>;
}

describe("SheetHost", () => {
  afterEach(() => {
    cleanup();
  });

  it("useSheetHostEl returns null outside SheetHost", () => {
    render(<HostProbe />);
    expect(screen.getByTestId("host-probe").textContent).toBe("missing");
  });

  it("useSheetHostEl resolves the host element before paint", () => {
    render(
      <SheetHost className="sheet-host">
        <HostProbe />
      </SheetHost>,
    );

    expect(screen.getByTestId("host-probe").textContent).toBe("sheet-host");
    expect(document.querySelector(".sheet-host")).toBeTruthy();
  });

  it("sets data-sheet-theme on the host", () => {
    render(
      <SheetHost className="sheet-host" theme="dark">
        <HostProbe />
      </SheetHost>,
    );

    expect(
      document.querySelector(".sheet-host")?.getAttribute("data-sheet-theme"),
    ).toBe("dark");
  });
});
