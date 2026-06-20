# @siegetag/sheet

Generic bottom sheet for React web apps — unified gesture state machine, no third-party sheet library.

**In scope:** measured snap heights (collapsed / half / full), handle + header + body gesture routing, continuous scroll/sheet handoffs at full height, structural layout (`SheetLayout`), semantic CSS.

**Out of scope:** product-specific sheet content (lists, titles, legends). Map integration lives in `@siegetag/sheet-map`. Floating tab bar padding is injected by the consumer via style props.

## Install

```json
{
  "dependencies": {
    "@siegetag/sheet": "workspace:*"
  }
}
```

Import base layout styles once in your app entry (built to `dist/style.css`, exported as `@siegetag/sheet/styles.css`):

```tsx
import "@siegetag/sheet/styles.css";
```

Override semantic classes in your app CSS (see [Theming](#theming)).

## Quick start

```tsx
import { Sheet, SheetLayout, type SheetSnap } from "@siegetag/sheet";
import "@siegetag/sheet/styles.css";
import { useState } from "react";

function Demo() {
  const [snap, setSnap] = useState<SheetSnap>("half");

  return (
    <Sheet snap={snap} onSnapChange={setSnap}>
      <SheetLayout
        header={<header>Title</header>}
        body={<main>Scrollable body at full height</main>}
      />
    </Sheet>
  );
}
```

Omit `header` for handle-only layouts — collapsed snap is handle height only.

## Gestures

One pointer gesture can move through multiple modes without releasing:

| Zone | Behavior |
|------|----------|
| Handle + header (chrome) | Sheet drag at all snaps — even when body is scrolled at full |
| Body below full height | Sheet drag only (expand / collapse) |
| Body at full height, content scrolled | Scroll content |
| Body at full height, scroll at top | Drag up scrolls; drag down collapses sheet |

Body scroll is driven programmatically while the pointer is captured. When the sheet settles to a new snap, body scroll resets to the top.

Do **not** add `overflow-y-auto` to body content — the shell owns scroll on the body root (`data-sheet-scroll-root`).

## Architecture

```
Sheet                          ← snap props, transform, gesture wiring
├── sheet-machine              ← pure reducer (sheet / scroll / pendingAxis intents)
├── use-sheet-pointer-handlers ← capture + apply scroll deltas
├── use-sheet-body-scroll      ← body el ref, scrollTop tracking, reset on snap
└── SheetLayout                ← chrome + body DOM (default layout)
```

**Gesture intents** (body surface):

- `sheet` — adjust visible height
- `scroll` — apply vertical scroll delta to body root
- `pendingAxis` — at full + scroll top, wait 8px to pick scroll up vs sheet down

Chrome surface always uses `sheet` intent.

## Public API

| Export | Role |
|--------|------|
| `Sheet` | Root sheet + context provider |
| `SheetLayout` | Default chrome/body structure |
| `useSheetContext` | Live snap, heights, drag phase (custom layouts) |
| `useCanBodyScroll` | Whether body root should use scroll vs drag overflow |
| `showCollapsedBottomChromePadding` | Tab-bar reserve helper for header padding |
| `buildSheetStyle` / `buildSheetLayoutVars` | Handle geometry tokens |
| `getVisibleSheetHeightPx` | Measure visible sheet height in viewport |

## Configuration

| Prop | Default | Description |
|------|---------|-------------|
| `halfSnapFraction` | `0.5` | Fraction snap between collapsed and full |
| `collapsedBottomInsetPx` | `0` | Extra collapsed height without DOM |
| `sheetStyle` / `sheetHandleStyle` | — | CSS overrides (prefer theme CSS on `.sheet`) |

## Theming

Override semantic classes from `@siegetag/sheet/styles.css`:

| Class | Purpose |
|-------|---------|
| `.sheet` | Root surface (background, border, shadow) |
| `.sheet-handle` | Drag pill |
| `.sheet-header` | Optional header content area |
| `.sheet-divider` | Line between chrome and body |
| `.sheet-body-root--scroll` | Body at full height (overflow scroll) |
| `.sheet-body-root--drag` | Body below full height (overflow hidden) |

## Build

Styles compile from `styles/sheet.css` to `dist/style.css` on `pnpm install` (`prepare`) or manually:

```bash
pnpm --filter @siegetag/sheet build:styles
```

`dist/` is gitignored — after a clean checkout run `pnpm install` (or `build:styles`) before starting apps that import `@siegetag/sheet/styles.css`.

## Demo app

```bash
pnpm dev:sheet-demo
```

Opens [`apps/sheet-demo`](../../apps/sheet-demo) with screens for minimal content, long scroll, handle-only, and tab-bar reserve padding.

## Tests

```bash
pnpm --filter @siegetag/sheet test
```

Unit tests cover the gesture reducer, snap math, scroll mode, and integration tests cover chrome drag, scroll handoffs, and snap settle behavior.
