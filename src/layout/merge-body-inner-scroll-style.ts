import type { CSSProperties } from "react";

function cssLength(value: CSSProperties["paddingBottom"]): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return typeof value === "number" ? `${value}px` : value;
}

/** Scroll padding clears floating bottom chrome; reserve is not a scroll clip region. */
export function mergeBodyInnerScrollStyle(
  bottomReserve: string | undefined,
  bodyInnerStyle: CSSProperties | undefined,
): CSSProperties | undefined {
  if (!bottomReserve && !bodyInnerStyle) {
    return undefined;
  }

  const extraPaddingBottom = cssLength(bodyInnerStyle?.paddingBottom);
  const paddingBottom = bottomReserve
    ? extraPaddingBottom
      ? `calc(${bottomReserve} + ${extraPaddingBottom})`
      : bottomReserve
    : extraPaddingBottom;

  if (!bodyInnerStyle && paddingBottom === undefined) {
    return undefined;
  }

  return {
    ...bodyInnerStyle,
    ...(paddingBottom !== undefined ? { paddingBottom } : {}),
  };
}
