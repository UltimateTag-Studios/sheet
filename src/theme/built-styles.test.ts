import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { SHEET_THEME_VARS } from "./sheet-theme-vars";

const packageRoot = join(fileURLToPath(import.meta.url), "..", "..", "..");
const builtCssPath = join(packageRoot, "dist/style.css");

describe("built sheet styles", () => {
  it("copies theme tokens into dist/style.css", () => {
    const builtCss = readFileSync(builtCssPath, "utf8");

    for (const token of Object.values(SHEET_THEME_VARS)) {
      expect(builtCss).toContain(token);
    }

    expect(builtCss).toContain('[data-sheet-theme="light"]');
    expect(builtCss).toContain('[data-sheet-theme="dark"]');
  });
});
