# @siegetag/sheet

Generic bottom sheet for React web — unified gesture state machine, no third-party sheet library.

**In scope:** measured snap heights (collapsed / half / full), handle + header + body gesture routing, continuous scroll/sheet handoffs at full height, structural layout (`SheetLayout`), semantic CSS theme tokens.

**Out of scope:** product-specific sheet content (lists, titles, legends). Map integration lives in [`@siegetag/sheet-map`](../sheet-map). Floating tab bar padding is injected by the consumer via `SheetLayout.bottomChromeReserve`.

## Install

```json
{
  "dependencies": {
    "@siegetag/sheet": "workspace:*"
  }
}
```

Import base styles once:

```tsx
import "@siegetag/sheet/styles.css";
```

## Quick start

```tsx
import { Sheet, SheetHost, SheetLayout, type SheetSnap } from "@siegetag/sheet";
import { useState } from "react";

function Demo() {
  const [snap, setSnap] = useState<SheetSnap>("half");

  return (
    <SheetHost className="sheet-host" theme="light">
      <Sheet snap={snap} onSnapChange={setSnap} layout={{ body: { gap: "0.75rem" } }}>
        <SheetLayout header={<header>Title</header>} body={<main>Body</main>} />
      </Sheet>
    </SheetHost>
  );
}
```

## Components

| Component | Role |
| --------- | ---- |
| `SheetHost` | Positions the sheet stack; sets `data-sheet-theme` |
| `Sheet` | Gesture machine, snap heights, `onSnapChange`, `onSnapSettled`, `onLayoutFrameChange` |
| `SheetLayout` | Structural chrome: handle, header slot, divider, body slot, bottom reserve |

### Snaps

`SheetSnap`: `"collapsed"` | `"half"` | `"full"`. Controlled via `snap` + `onSnapChange`. Use `onSnapSettled` when you need the final snap after animation (e.g. deselect on collapse in `@siegetag/sheet-map`).

### Tap vs drag

The gesture machine distinguishes **tap** from **drag** using move slop (8px) on every surface — handle, header, and body. A tap never reaches the machine: pointer routing holds a pending gesture in refs until slop commits, then dispatches `pointerDown` + `pointerMove`. Buttons and links receive normal clicks on the first tap.

- **Chrome** (handle + header): drag past slop always resizes the sheet.
- **Body below full height**: drag past slop resizes the sheet.
- **Body at full height, scroll top**: finger up scrolls content; finger down collapses the sheet.
- **Body at full height, scrolled**: drag scrolls; reaching scroll top continues into sheet collapse in one gesture.

No opt-in CSS classes or element whitelists are required for interactivity. Put buttons and links directly in `SheetLayout` header and body slots.

See `apps/sheet-demo` route `/interactive` for a scrollable button-list proof.

### Bottom chrome reserve

For floating tab bars or other fixed bottom UI:

```tsx
<Sheet
  layout={{
    bottomChromeReserve: {
      reserve: "calc(env(safe-area-inset-bottom) + 4rem)", // collapsed spacer
      gap: "1rem", // extra scroll padding at full height
    },
  }}
>
```

## Layout (`Sheet.layout` / `SheetLayoutConfig`)

Geometry only — spacing, radii, blur. Colors come from theme CSS tokens.

| Section | Fields | CSS vars (on `.sheet-slide`) |
| ------- | ------ | ------------------------------ |
| `handle` | `marginTop`, `marginBottom`, `height`, `width`, `borderRadius` | `--sheet-handle-*` |
| `sheet` | `borderRadius`, `borderWidth`, `backdropBlur` | `--sheet-border-*`, `--sheet-backdrop-blur` |
| `header` | `paddingHorizontal`, `paddingVertical` | `--sheet-header-padding-*` |
| `divider` | `paddingHorizontal`, `paddingVertical`, `height` | `--sheet-divider-*` |
| `body` | `paddingHorizontal`, `paddingVertical`, `gap` | `--sheet-body-*` |
| `listItem` | `gap`, `paddingHorizontal`, `paddingVertical`, `borderRadius`, `contentGap` | `--sheet-list-item-*` |
| `bottomChromeReserve` | `reserve`, `gap` | measured spacer + scroll padding |

Use `buildSheetLayoutVars(layout)` or pass `layout` to `Sheet`. Export `SHEET_LAYOUT_VARS` for token names.

## Theming

`theme: "light" | "dark"` on `SheetHost` sets `data-sheet-theme`. Bundled CSS defines semantic tokens on the host:

| Token | Purpose |
| ----- | ------- |
| `--sheet-color-text` | Sheet copy color |
| `--sheet-color-surface-background` | Panel background |
| `--sheet-color-surface-border` | Panel border |
| `--sheet-color-surface-shadow` | Panel shadow |
| `--sheet-color-handle` | Drag handle |
| `--sheet-color-divider` | Chrome divider |

Override in app CSS (after bundled import):

```css
.sheet-host[data-sheet-theme="dark"] {
  --sheet-color-surface-background: rgb(15 23 42 / 0.95);
}
```

Export `SHEET_THEME_VARS` lists all token names.

## Map integrators

Use `onLayoutFrameChange` on `Sheet` for machine-committed `visibleHeightPx` during drag. [`@siegetag/sheet-map`](../sheet-map) syncs map padding from that live geometry — you typically do not wire this yourself when using `MapLayout`.

## Tests

```bash
pnpm --filter @siegetag/sheet test
pnpm --filter @siegetag/sheet build:styles
```

## License

GNU Affero General Public License v3.0 or later — see [LICENSE](./LICENSE).
