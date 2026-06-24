import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { SheetHost } from "./context/sheet-host-context";
import { Sheet, type SheetSnap } from "./sheet";
import { SheetLayout } from "./sheet-layout";

function SheetDebugPlayground() {
  const [snap, setSnap] = useState<SheetSnap>("collapsed");

  return (
    <div className="relative h-[100dvh] bg-neutral-200">
      <SheetHost className="sheet-host absolute inset-0">
        <Sheet snap={snap} debug>
          <SheetLayout
            header={
              <div className="flex items-start justify-between gap-3 px-4 pt-1">
                <div>
                  <p className="text-sm text-neutral-500">Debug harness</p>
                  <h2 className="text-lg font-semibold">Sheet contract</h2>
                  <p className="text-xs text-neutral-500">
                    Filter console for [sheet]
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(["collapsed", "half", "full"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs capitalize"
                      onClick={() => setSnap(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            }
            body={
              <div className="px-4">
                {Array.from({ length: 16 }, (_, index) => (
                  <button
                    key={`debug-row-${index + 1}`}
                    type="button"
                    className="block w-full border-b border-neutral-200 py-3 text-left"
                    onClick={() => setSnap("half")}
                  >
                    List item {index + 1}
                  </button>
                ))}
              </div>
            }
          />
        </Sheet>
      </SheetHost>
    </div>
  );
}

const meta = {
  title: "Patterns/Sheet",
  component: Sheet,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Sheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {
  args: {
    children: null,
  },
  render: () => (
    <div className="relative h-[100dvh] bg-neutral-200">
      <SheetHost className="sheet-host absolute inset-0">
        <Sheet defaultSnap="half">
          <SheetLayout
            header={
              <div className="px-4 pt-1">
                <p className="text-sm text-neutral-500">Header</p>
                <h2 className="text-lg font-semibold">Sheet title</h2>
              </div>
            }
            body={
              <div className="px-4">
                {Array.from({ length: 24 }, (_, index) => (
                  <p
                    key={`sheet-story-row-${index + 1}`}
                    className="border-b border-neutral-200 py-3"
                  >
                    Row {index + 1}
                  </p>
                ))}
              </div>
            }
          />
        </Sheet>
      </SheetHost>
    </div>
  ),
};

export const Debug: Story = {
  args: {
    children: null,
  },
  render: () => <SheetDebugPlayground />,
};
