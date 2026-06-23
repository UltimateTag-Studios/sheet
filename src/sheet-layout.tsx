import type { ReactNode } from "react";
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
};

/** Sheet chrome (handle + optional header) and scroll/drag body below the divider. */
export function SheetLayout({ header, body }: SheetLayoutProps) {
  const {
    registerBodyEl,
    registerChromeMeasure,
    syncReserveHeightPx,
    pointerHandlers,
    layout,
  } = useSheetControlsContext();
  const canBodyScroll = useCanBodyScroll();
  const hasHeader = header != null;
  const reserveSpacerRef = useRef<HTMLDivElement | null>(null);
  const bottomReserve = layout.bottomChromeReserve?.reserve;
  const bottomGap = layout.bottomChromeReserve?.gap;

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
    bottomGap ? { paddingBottom: bottomGap } : undefined,
  );

  return (
    <>
      <SheetChrome
        measureRef={registerChromeMeasure}
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
        <div className="sheet-body-inner" style={bodyInnerScrollStyle}>
          {body}
        </div>
      </div>
      {bottomReserve ? (
        <div
          ref={reserveSpacerRef}
          className="sheet-bottom-reserve"
          aria-hidden
          style={{ height: bottomReserve }}
        />
      ) : null}
    </>
  );
}
