import { useState } from "react";

import { useSheetMetricsContext } from "../../context/sheet-context";
import { Sheet, type SheetSnap } from "../../sheet";
import { SheetLayout } from "../../sheet-layout";
import { BUTTON_LIST_ROW_COUNT, liveHeightReader } from "./helpers";

export function LiveHeightProbe() {
  const { readVisibleHeightPx } = useSheetMetricsContext();
  liveHeightReader.current = readVisibleHeightPx;
  return null;
}

export function TestSheet() {
  const [snap, setSnap] = useState<SheetSnap>("half");

  return (
    <>
      <div data-testid="snap">{snap}</div>
      <Sheet snap={snap} onSnapChange={setSnap}>
        <SheetLayout
          header={<div data-testid="sheet-header">Header title</div>}
          body={<div>Body</div>}
        />
      </Sheet>
    </>
  );
}

export function TestFullSheetWithScroll() {
  const [snap, setSnap] = useState<SheetSnap>("full");

  return (
    <>
      <div data-testid="snap">{snap}</div>
      <Sheet snap={snap} onSnapChange={setSnap}>
        <SheetLayout
          header={<div data-testid="sheet-header">Header title</div>}
          body={
            <div data-testid="tall-body" style={{ height: "2000px" }}>
              Body
            </div>
          }
        />
      </Sheet>
    </>
  );
}

export function TestHalfSheetWithScroll() {
  const [snap, setSnap] = useState<SheetSnap>("half");

  return (
    <>
      <div data-testid="snap">{snap}</div>
      <Sheet snap={snap} onSnapChange={setSnap}>
        <SheetLayout
          header={<div data-testid="sheet-header">Header title</div>}
          body={
            <div data-testid="tall-body" style={{ height: "2000px" }}>
              Body
            </div>
          }
        />
      </Sheet>
    </>
  );
}

export function TestFullSheetWithButtonList() {
  const [snap, setSnap] = useState<SheetSnap>("full");
  const [lastTappedRow, setLastTappedRow] = useState<number | null>(null);
  const [headerAction, setHeaderAction] = useState<string | null>(null);

  return (
    <>
      <div data-testid="snap">{snap}</div>
      <div data-testid="last-tapped-row">
        {lastTappedRow === null ? "none" : String(lastTappedRow)}
      </div>
      <div data-testid="header-action">{headerAction ?? "none"}</div>
      <Sheet snap={snap} onSnapChange={setSnap}>
        <SheetLayout
          header={
            <div className="sheet-header-actions">
              <button
                type="button"
                data-testid="header-dismiss"
                onClick={() => setHeaderAction("dismiss")}
              >
                Dismiss
              </button>
              <button
                type="button"
                data-testid="header-secondary"
                onClick={() => setHeaderAction("secondary")}
              >
                Secondary
              </button>
            </div>
          }
          body={
            <div data-testid="button-list">
              {Array.from({ length: BUTTON_LIST_ROW_COUNT }, (_, index) => {
                const row = index + 1;
                return (
                  <button
                    key={`row-${row}`}
                    type="button"
                    data-testid={`row-${row}`}
                    onClick={() => setLastTappedRow(row)}
                  >
                    Row {row}
                  </button>
                );
              })}
            </div>
          }
        />
      </Sheet>
    </>
  );
}

export function TestHalfSheetWithHeaderAndBodyButtons() {
  const [snap, setSnap] = useState<SheetSnap>("collapsed");
  const [headerAction, setHeaderAction] = useState(false);
  const [bodyAction, setBodyAction] = useState(false);

  return (
    <>
      <div data-testid="snap">{snap}</div>
      <div data-testid="header-selected">{headerAction ? "yes" : "no"}</div>
      <div data-testid="body-selected">{bodyAction ? "yes" : "no"}</div>
      <Sheet snap={snap} onSnapChange={setSnap}>
        <SheetLayout
          header={
            <button
              type="button"
              data-testid="header-action-button"
              onClick={() => setHeaderAction(true)}
            >
              Header action
            </button>
          }
          body={
            <button
              type="button"
              data-testid="body-action-button"
              onClick={() => setBodyAction(true)}
            >
              Body action
            </button>
          }
        />
      </Sheet>
    </>
  );
}

export function TestHalfSheetWithHeaderButtons() {
  const [snap, setSnap] = useState<SheetSnap>("half");
  const [headerAction, setHeaderAction] = useState<string | null>(null);

  return (
    <>
      <div data-testid="snap">{snap}</div>
      <div data-testid="header-action">{headerAction ?? "none"}</div>
      <Sheet snap={snap} onSnapChange={setSnap}>
        <SheetLayout
          header={
            <button
              type="button"
              data-testid="header-action-button"
              onClick={() => setHeaderAction("fired")}
            >
              Header action
            </button>
          }
          body={<div>Body</div>}
        />
      </Sheet>
    </>
  );
}

export function TestHalfSheetWithBodyButton() {
  const [snap, setSnap] = useState<SheetSnap>("half");
  const [selected, setSelected] = useState(false);

  return (
    <>
      <div data-testid="selected">{selected ? "yes" : "no"}</div>
      <Sheet snap={snap} onSnapChange={setSnap}>
        <SheetLayout
          header={<div data-testid="sheet-header">Header title</div>}
          body={
            <button
              type="button"
              data-testid="body-action"
              onClick={() => setSelected(true)}
            >
              Select
            </button>
          }
        />
      </Sheet>
    </>
  );
}

export function TestCollapsedSheetWithSettleSync() {
  const [snap, setSnap] = useState<SheetSnap>("collapsed");

  return (
    <>
      <div data-testid="snap">{snap}</div>
      <Sheet snap={snap} onSnapChange={setSnap} onSnapSettled={setSnap}>
        <SheetLayout
          header={<div data-testid="sheet-header">Header title</div>}
          body={
            <button
              type="button"
              data-testid="cmd-half"
              onClick={() => setSnap("half")}
            >
              Command half
            </button>
          }
        />
      </Sheet>
    </>
  );
}

export function TestContractListSelectPattern() {
  const [snap, setSnap] = useState<SheetSnap>("collapsed");

  return (
    <>
      <div data-testid="snap">{snap}</div>
      <Sheet snap={snap} onSnapChange={setSnap} onSnapSettled={setSnap}>
        <SheetLayout
          header={<div data-testid="sheet-header">Header title</div>}
          body={
            <button
              type="button"
              data-testid="list-row"
              onClick={() => {
                if (snap === "collapsed") {
                  setSnap("half");
                }
              }}
            >
              Item 1
            </button>
          }
        />
      </Sheet>
    </>
  );
}

export function TestCollapsedSheet() {
  const [snap, setSnap] = useState<SheetSnap>("collapsed");

  return (
    <>
      <div data-testid="snap">{snap}</div>
      <Sheet snap={snap} onSnapChange={setSnap}>
        <SheetLayout
          header={<div data-testid="sheet-header">Header title</div>}
          body={<div>Body</div>}
        />
      </Sheet>
    </>
  );
}

export function TestHalfSheetWithSnapCommands() {
  const [snap, setSnap] = useState<SheetSnap>("half");

  return (
    <>
      <button
        type="button"
        data-testid="cmd-full"
        onClick={() => setSnap("full")}
      >
        Full
      </button>
      <button
        type="button"
        data-testid="cmd-half"
        onClick={() => setSnap("half")}
      >
        Half
      </button>
      <div data-testid="snap">{snap}</div>
      <Sheet snap={snap} onSnapChange={setSnap}>
        <SheetLayout
          header={<div data-testid="sheet-header">Header title</div>}
          body={<div>Body</div>}
        />
      </Sheet>
    </>
  );
}

export function TestFullSheetWithSettleCallback({
  onSnapSettled,
}: {
  onSnapSettled: (snap: SheetSnap) => void;
}) {
  const [snap, setSnap] = useState<SheetSnap>("full");

  return (
    <>
      <button
        type="button"
        data-testid="cmd-half"
        onClick={() => setSnap("half")}
      >
        Half
      </button>
      <div data-testid="snap">{snap}</div>
      <Sheet snap={snap} onSnapChange={setSnap} onSnapSettled={onSnapSettled}>
        <SheetLayout
          header={<div data-testid="sheet-header">Header title</div>}
          body={<div>Body</div>}
        />
      </Sheet>
    </>
  );
}

export function TestFullSheetWithBottomReserve() {
  const [snap, setSnap] = useState<SheetSnap>("full");

  return (
    <Sheet
      snap={snap}
      onSnapChange={setSnap}
      layout={{
        bottomChromeReserve: { reserve: "80px", gap: "16px" },
      }}
    >
      <SheetLayout
        header={<div data-testid="sheet-header">Header title</div>}
        body={
          <div data-testid="tall-body" style={{ height: "2000px" }}>
            Body
          </div>
        }
      />
    </Sheet>
  );
}
