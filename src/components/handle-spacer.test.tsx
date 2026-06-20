import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SheetHandleSpacer } from "../components/handle-spacer";

describe("SheetHandleSpacer", () => {
  it("renders the balance spacer class", () => {
    const { container } = render(<SheetHandleSpacer />);
    expect(container.firstElementChild).toMatchObject({
      className: expect.stringContaining("sheet-handle-spacer"),
    });
  });
});
