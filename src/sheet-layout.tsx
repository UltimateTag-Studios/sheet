import type { CSSProperties, ReactNode } from "react";
import { useLayoutEffect, useRef } from "react";

import { SheetHandleSpacer } from "./components/handle-spacer";
import { SheetChrome, SheetDivider } from "./components/sheet-chrome";
import {
  useCanBodyScroll,
  useSheetControlsContext,
} from "./context/sheet-context";
import { mergeBodyInnerScrollStyle } from "./layout/merge-body-inner-scroll-style";
import { sheetBodyRootClass } from "./layout/scroll-mode";

export type SheetLayoutProps = {
  /** Optional fixed header in sheet chrome. Omit for handle-only layout. */
  header?: ReactNode;
  body: ReactNode;
  headerStyle?: CSSProperties;
  bodyInnerStyle?: CSSProperties;
  /** Always-on bottom reserve spacer height (e.g. tab bar clearance). CSS length. */
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
    syncReserveHeightPx,
    pointerHandlers,
    sheetHandleStyle,
  } = useSheetControlsContext();
  const canBodyScroll = useCanBodyScroll();
  const hasHeader = header != null;
  const reserveSpacerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!bottomReserve) {
      syncReserveHeightPx(0);
      return;
    }

    const syncReserveHeight = () => {
      syncReserveHeightPx(reserveSpacerRef.current?.offsetHeight ?? 0);
    };

    syncReserveHeight();
    window.addEventListener("resize", syncReserveHeight);
    window.visualViewport?.addEventListener("resize", syncReserveHeight);

    return () => {
      window.removeEventListener("resize", syncReserveHeight);
      window.visualViewport?.removeEventListener("resize", syncReserveHeight);
    };
  }, [bottomReserve, syncReserveHeightPx]);

  const bodyInnerScrollStyle = mergeBodyInnerScrollStyle(
    bottomReserve,
    bodyInnerStyle,
  );

  return (
    <div className="sheet-layers">
      <SheetChrome
        measureRef={registerChromeMeasure}
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
        ref={registerBodyEl}
        className={sheetBodyRootClass(canBodyScroll)}
        data-sheet-scroll-root
        onPointerDownCapture={pointerHandlers.onBodyPointerDown}
      >
        <div style={bodyInnerScrollStyle}>{body}</div>
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
