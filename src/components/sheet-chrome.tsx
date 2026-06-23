import type { ReactNode } from "react";

import { SheetDivider } from "./divider";
import { SheetHandle } from "./handle";

export type SheetChromeProps = {
  measureRef: (node: HTMLElement | null) => void;
  children?: ReactNode;
  onChromePointerDown: (event: React.PointerEvent<HTMLElement>) => void;
};

/** Handle + optional header + divider — one drag surface and collapsed-height measure root. */
export function SheetChrome({
  measureRef,
  children,
  onChromePointerDown,
}: SheetChromeProps) {
  return (
    <div
      ref={measureRef}
      className="sheet-chrome"
      data-sheet-chrome
      onPointerDownCapture={onChromePointerDown}
    >
      <SheetHandle />
      {children}
    </div>
  );
}

export { SheetDivider };
