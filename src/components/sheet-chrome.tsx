import type { CSSProperties, ReactNode } from "react";

import type { SheetPointerHandlers } from "../gesture/use-sheet-pointer-handlers";
import { SheetDivider } from "./divider";
import { SheetHandle } from "./handle";

export type SheetChromeProps = SheetPointerHandlers & {
  measureRef: (node: HTMLDivElement | null) => void;
  handleStyle?: CSSProperties;
  style?: CSSProperties;
  children?: ReactNode;
};

/** Handle + optional header + divider — one drag surface and collapsed-height measure root. */
export function SheetChrome({
  measureRef,
  handleStyle,
  style,
  children,
  onPointerDown,
}: SheetChromeProps) {
  return (
    <div
      ref={measureRef}
      className="sheet-chrome"
      style={style}
      data-sheet-chrome
      onPointerDown={onPointerDown}
    >
      <SheetHandle style={handleStyle} />
      {children}
    </div>
  );
}

export { SheetDivider };
