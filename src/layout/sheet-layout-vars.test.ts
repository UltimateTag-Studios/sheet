import { describe, expect, it } from "vitest";

import { buildSheetLayoutVars, mergeSheetLayout } from "./sheet-layout-vars";

describe("buildSheetLayoutVars", () => {
  it("defaults geometry tokens", () => {
    expect(buildSheetLayoutVars()).toEqual({
      "--sheet-handle-margin-top": "0.75rem",
      "--sheet-handle-margin-bottom": "0.75rem",
      "--sheet-handle-bar-height": "0.25rem",
      "--sheet-handle-width": "2.5rem",
      "--sheet-handle-border-radius": "9999px",
      "--sheet-border-radius": "0.75rem",
      "--sheet-border-width": "1px",
      "--sheet-backdrop-blur": "24px",
      "--sheet-header-padding-inline": "0",
      "--sheet-header-padding-block": "0",
      "--sheet-divider-height": "1px",
      "--sheet-divider-padding-inline": "0",
      "--sheet-divider-padding-block": "0",
      "--sheet-body-padding-inline": "0",
      "--sheet-body-padding-block": "0",
      "--sheet-body-gap": "0",
      "--sheet-list-item-gap": "0.5rem",
      "--sheet-list-item-padding-inline": "0",
      "--sheet-list-item-padding-block": "0",
      "--sheet-list-item-border-radius": "0",
      "--sheet-list-item-content-gap": "0",
    });
  });

  it("accepts nested layout sections", () => {
    expect(
      buildSheetLayoutVars({
        handle: {
          marginTop: "0.5rem",
          height: 4,
          width: 100,
          borderRadius: "0.5rem",
        },
        sheet: { borderRadius: "1rem", borderWidth: 2, backdropBlur: "12px" },
        header: { paddingHorizontal: "1.25rem", paddingVertical: "0.25rem" },
        divider: { height: 2, paddingHorizontal: "1rem" },
        body: { paddingHorizontal: 16, paddingVertical: 16, gap: "0.75rem" },
        listItem: {
          gap: "0.625rem",
          paddingHorizontal: "0.75rem",
          paddingVertical: "0.75rem",
          borderRadius: "0.5rem",
          contentGap: "0.125rem",
        },
      }),
    ).toEqual({
      "--sheet-handle-margin-top": "0.5rem",
      "--sheet-handle-margin-bottom": "0.75rem",
      "--sheet-handle-bar-height": "4px",
      "--sheet-handle-width": "100px",
      "--sheet-handle-border-radius": "0.5rem",
      "--sheet-border-radius": "1rem",
      "--sheet-border-width": "2px",
      "--sheet-backdrop-blur": "12px",
      "--sheet-header-padding-inline": "1.25rem",
      "--sheet-header-padding-block": "0.25rem",
      "--sheet-divider-height": "2px",
      "--sheet-divider-padding-inline": "1rem",
      "--sheet-divider-padding-block": "0",
      "--sheet-body-padding-inline": "16px",
      "--sheet-body-padding-block": "16px",
      "--sheet-body-gap": "0.75rem",
      "--sheet-list-item-gap": "0.625rem",
      "--sheet-list-item-padding-inline": "0.75rem",
      "--sheet-list-item-padding-block": "0.75rem",
      "--sheet-list-item-border-radius": "0.5rem",
      "--sheet-list-item-content-gap": "0.125rem",
    });
  });
});

describe("mergeSheetLayout", () => {
  it("deep-merges section objects", () => {
    expect(
      mergeSheetLayout(
        {
          handle: { marginTop: "0.75rem" },
          header: { paddingHorizontal: "1rem" },
        },
        {
          handle: { width: "3rem" },
          divider: { height: "2px" },
          listItem: { gap: "0.5rem" },
          body: { gap: "0.5rem" },
        },
      ),
    ).toEqual({
      handle: { marginTop: "0.75rem", width: "3rem" },
      header: { paddingHorizontal: "1rem" },
      divider: { height: "2px" },
      listItem: { gap: "0.5rem" },
      body: { gap: "0.5rem" },
    });
  });
});
