import type { CSSProperties } from "react";

export function SheetHandle({ style }: { style?: CSSProperties }) {
  return (
    <div
      className="sheet-drawer-handle"
      style={style}
      data-sheet-handle
      aria-hidden
    />
  );
}
