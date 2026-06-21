import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { SheetHost } from "./context/sheet-host-context";
import { Sheet, type SheetSnap } from "./sheet";
import { SheetLayout } from "./sheet-layout";

function SheetStoryPlayground() {
  const [snap, setSnap] = useState<SheetSnap>("half");

  return (
    <div className="relative h-[100dvh] bg-neutral-200">
      <SheetHost className="sheet-host absolute inset-0">
        <Sheet snap={snap} onSnapChange={setSnap}>
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
  render: () => <SheetStoryPlayground />,
};
