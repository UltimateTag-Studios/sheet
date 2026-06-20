import type { CSSProperties, ReactNode } from "react";
import { useCallback } from "react";

import { SheetHandleSpacer } from "./components/handle-spacer";
import { SheetChrome, SheetDivider } from "./components/sheet-chrome";
import { useChromeMeasureRef } from "./context/chrome-measure-context";
import { useCanBodyScroll, useSheetContext } from "./context/sheet-context";
import { sheetBodyRootClass } from "./layout/scroll-mode";

export type SheetLayoutProps = {
  /** Optional fixed header in sheet chrome. Omit for handle-only layout. */
  header?: ReactNode;
  body: ReactNode;
  headerStyle?: CSSProperties;
  bodyInnerStyle?: CSSProperties;
};

/** Sheet chrome (handle + optional header) and scroll/drag body below the divider. */
export function SheetLayout({
  header,
  body,
  headerStyle,
  bodyInnerStyle,
}: SheetLayoutProps) {
  const onChromeMeasure = useChromeMeasureRef();
  const { registerBodyEl, pointerHandlers, drawerHandleStyle } =
    useSheetContext();
  const canBodyScroll = useCanBodyScroll();
  const hasHeader = header != null;

  const chromeMeasureRef = useCallback(
    (node: HTMLDivElement | null) => {
      onChromeMeasure(node);
    },
    [onChromeMeasure],
  );

  const bodyRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      registerBodyEl(node);
    },
    [registerBodyEl],
  );

  return (
    <div className="sheet-layers">
      <SheetChrome
        measureRef={chromeMeasureRef}
        handleStyle={drawerHandleStyle}
        style={headerStyle}
        onPointerDown={pointerHandlers.onChromePointerDown}
      >
        {hasHeader ? (
          <>
            <div className="sheet-header">{header}</div>
            <SheetHandleSpacer />
            <SheetDivider />
          </>
        ) : null}
      </SheetChrome>
      <div
        ref={bodyRootRef}
        className={sheetBodyRootClass(canBodyScroll)}
        data-sheet-scroll-root
        onPointerDown={pointerHandlers.onBodyPointerDown}
      >
        <div style={bodyInnerStyle}>{body}</div>
      </div>
    </div>
  );
}
