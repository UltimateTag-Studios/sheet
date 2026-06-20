import type { CSSProperties, ReactNode } from "react";
import { useCallback } from "react";

import { SheetHandleSpacer } from "./components/handle-spacer";
import { SheetChrome, SheetDivider } from "./components/sheet-chrome";
import { useCanBodyScroll, useSheetContext } from "./context/sheet-context";
import { sheetBodyRootClass } from "./layout/scroll-mode";

export type SheetLayoutProps = {
  /** Optional fixed header in sheet chrome. Omit for handle-only layout. */
  header?: ReactNode;
  body: ReactNode;
  headerStyle?: CSSProperties;
  bodyInnerStyle?: CSSProperties;
  /** Always-on bottom reserve spacer height (e.g. tab bar clearance). */
  bottomReserve?: string;
};

/** Sheet chrome (handle + optional header) and scroll/drag body below the divider. */
export function SheetLayout({
  header,
  body,
  headerStyle,
  bodyInnerStyle,
  bottomReserve,
}: SheetLayoutProps) {
  const {
    registerBodyEl,
    registerChromeMeasure,
    registerReserveSpacer,
    pointerHandlers,
    sheetHandleStyle,
  } = useSheetContext();
  const canBodyScroll = useCanBodyScroll();
  const hasHeader = header != null;

  const chromeMeasureRef = useCallback(
    (node: HTMLDivElement | null) => {
      registerChromeMeasure(node);
    },
    [registerChromeMeasure],
  );

  const bodyRootRef = useCallback(
    (node: HTMLDivElement | null) => {
      registerBodyEl(node);
    },
    [registerBodyEl],
  );

  const reserveSpacerRef = useCallback(
    (node: HTMLDivElement | null) => {
      registerReserveSpacer(node);
    },
    [registerReserveSpacer],
  );

  return (
    <div className="sheet-layers">
      <SheetChrome
        measureRef={chromeMeasureRef}
        handleStyle={sheetHandleStyle}
        style={headerStyle}
        onChromePointerDown={pointerHandlers.onChromePointerDown}
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
      {bottomReserve ? (
        <div
          ref={reserveSpacerRef}
          className="sheet-bottom-reserve"
          aria-hidden
          style={{ height: bottomReserve }}
        />
      ) : null}
    </div>
  );
}
