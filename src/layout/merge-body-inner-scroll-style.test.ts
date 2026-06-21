import { describe, expect, it } from "vitest";

import { mergeBodyInnerScrollStyle } from "./merge-body-inner-scroll-style";

describe("mergeBodyInnerScrollStyle", () => {
  it("uses reserve alone when no body inner style is passed", () => {
    expect(mergeBodyInnerScrollStyle("70px", undefined)).toEqual({
      paddingBottom: "70px",
    });
  });

  it("adds float gap to reserve for scroll-end clearance", () => {
    expect(
      mergeBodyInnerScrollStyle("70px", { paddingBottom: "1rem" }),
    ).toEqual({
      paddingBottom: "calc(70px + 1rem)",
    });
  });

  it("passes through body inner style when reserve is absent", () => {
    expect(mergeBodyInnerScrollStyle(undefined, { paddingTop: "8px" })).toEqual(
      {
        paddingTop: "8px",
      },
    );
  });
});
