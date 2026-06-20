import type { CSSProperties, ReactNode } from "react";

import { SheetDivider } from "./divider";
import { SheetHandle } from "./handle";

export type SheetChromeProps = {
  measureRef: (node: HTMLElement | null) => void;
  handleStyle?: CSSProperties;
  style?: CSSProperties;
  children?: ReactNode;
  onChromePointerDown: (event: React.PointerEvent<HTMLElement>) => void;
};

/** Handle + optional header + divider — one drag surface and collapsed-height measure root. */
export function SheetChrome({
  measureRef,
  handleStyle,
  style,
  children,
  onChromePointerDown,
}: SheetChromeProps) {
  return (
    <div
      ref={measureRef}
      className="sheet-chrome"
      style={style}
      data-sheet-chrome
      onPointerDown={onChromePointerDown}
    >
      <SheetHandle style={handleStyle} />
      {children}
    </div>
  );
}

export { SheetDivider };
