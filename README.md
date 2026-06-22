# @siegetag/sheet

Generic bottom sheet for React web apps — unified gesture state machine, no third-party sheet library.

**In scope:** measured snap heights (collapsed / half / full), handle + header + body gesture routing, continuous scroll/sheet handoffs at full height, structural layout (`SheetLayout`), semantic CSS.

**Out of scope:** product-specific sheet content (lists, titles, legends). Map integration lives in `@siegetag/sheet-map`. Floating tab bar padding is injected by the consumer via style props.

## Install

**Monorepo (this repo):**

```json
{
  "dependencies": {
    "@siegetag/sheet": "workspace:*"
  }
}
```

**External app:** pin a version or git URL — do **not** use `workspace:*` outside a pnpm workspace.

```json
{
  "dependencies": {
    "@siegetag/sheet": "github:UltimateTag-Studios/sheet#v0.1.0"
  }
}
```

Import base layout styles once in your app entry (built to `dist/style.css`, exported as `@siegetag/sheet/styles.css`):

```tsx
import "@siegetag/sheet/styles.css";
```

Override semantic classes in your app CSS (see [Theming](#theming)).

## Quick start

`Sheet` must render inside a sized `SheetHost`. The app positions the host (map frame, inset region, etc.); snap heights measure from the host's `clientHeight`.

```tsx
import { Sheet, SheetHost, SheetLayout, type SheetSnap } from "@siegetag/sheet";
import "@siegetag/sheet/styles.css";
import { useState } from "react";

function Demo() {
  const [snap, setSnap] = useState<SheetSnap>("half");

  return (
    <div className="app-map-frame">
      <SheetHost className="sheet-host">
        <Sheet snap={snap} onSnapChange={setSnap}>
          <SheetLayout
            header={<header>Title</header>}
            body={<main>Scrollable body at full height</main>}
          />
        </Sheet>
      </SheetHost>
    </div>
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

Body scroll is driven programmatically while the pointer is captured. On release, a fast fling continues with decaying momentum (same direction as the drag). A new pointer down or snap change cancels momentum. When the sheet settles to a new snap, body scroll resets to the top.

Body pointer routing uses **capture** on the scroll root so drags can start on buttons and cards. Below move slop (8px), taps activate controls normally; once slop is exceeded, the gesture commits and the control click is suppressed.

Do **not** add `overflow-y-auto` to body content — the shell owns scroll on the body root (`data-sheet-scroll-root`).

## Architecture

```
SheetHost                      ← sized region; snap heights measure from here
Sheet                          ← snap props, height animation, gesture wiring
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
| `SheetHost` | Sized container — required parent for `Sheet` |
| `Sheet` | Root sheet + context provider |
| `SheetLayout` | Default chrome/body structure |
| `useSheetContext` | Live snap, heights, drag phase (custom layouts) |
| `useSheetControlsContext` | Stable layout wiring (prefer in `SheetLayout` hot paths) |
| `useSheetMetricsContext` | Volatile snap/height metrics |
| `useCanBodyScroll` | Whether body root should use scroll vs drag overflow |
| `isSheetAtCollapsedHeader` | Whether sheet is at collapsed header height (divider hide) |
| `buildSheetStyle` / `buildSheetLayoutVars` | Handle geometry tokens |
| `getVisibleSheetHeightPx` | Measure visible sheet slide height |
| `toSheetLayoutFrameChange` | Map machine state → `SheetLayoutFrameChange` payload |
| `SheetLayoutFrameChange` | Layout frame callback payload type |

## Live layout for map / overlay integrators

Consumers that align external UI with the sheet (map padding, visible-area overlays) need **live geometry while the sheet moves**.

| Source | When to use |
|--------|-------------|
| **`onLayoutFrameChange`** | Drag moves and snap commits from the gesture machine — `visibleHeightPx` matches `.sheet-slide` during drag |
| **`.sheet-slide` DOM** (`getBoundingClientRect`, `ResizeObserver`) | CSS height transitions (settle animation) and any sub-frame samples between machine commits |
| **`useSheetMetricsContext().visibleHeightPx`** | Same as machine state — updated every pointer frame during drag |

During drag, height is driven by React (`frameStyle` on `.sheet-slide`). Prefer `onLayoutFrameChange` or DOM reads for sub-frame samples during CSS height transitions.

```tsx
<Sheet
  onLayoutFrameChange={({ visibleHeightPx, phase, restingSnap }) => {
    syncMapPaddingBottom(visibleHeightPx);
  }}
>
```

`@siegetag/sheet-map` uses host canvas geometry plus live sheet DOM for viewport sync; this callback is an optional machine-authoritative alternative to polling during drag.

## Configuration

| Prop | Default | Description |
|------|---------|-------------|
| `halfSnapFraction` | `0.5` | Fraction snap between collapsed and full |
| `sheetStyle` / `sheetHandleStyle` | — | CSS overrides (prefer theme CSS on `.sheet-slide`) |
| `onSnapSettled` | — | After CSS height transition completes at a snap |
| `onLayoutFrameChange` | — | Machine-committed layout frame — see [Live layout](#live-layout-for-map--overlay-integrators) |

`SheetLayout` accepts optional `bottomReserve` (CSS height). The reserve is measured for collapsed snap height and applied as **scroll padding** on the body inner wrapper so list content can scroll behind floating app chrome (tab bar). It is not a scroll clip region. Pair with `bodyInnerStyle.paddingBottom` for an extra float gap above that chrome (`calc(reserve + gap)`).

During drag, height updates write directly to `.sheet-slide` so React does not re-render every pointer frame. Context is split: **controls** (handlers, registrars) vs **metrics** (snap, heights).

The sheet fills the host with `position: absolute` and **no `z-index`**. Height animation runs on **`.sheet-slide`** (bottom-anchored, explicit height). Stack order: render the map shell first, then app chrome that must sit on top.

## Theming

Override semantic classes from `@siegetag/sheet/styles.css`:

| Class | Purpose |
|-------|---------|
| `.sheet-host` | Sized region the app positions |
| `.sheet` | Absolute fill inside host (no surface styling — do not set `z-index`) |
| `.sheet-slide` | Bottom-anchored surface (background, border, shadow; height set inline) |
| `.sheet-handle` | Drag pill |
| `.sheet-header` | Optional header content area |
| `.sheet-header` `button`, `a`, `input`, … | Native controls are clickable; other header text stays drag-through |
| `.sheet-header-interactive` | Opt-in for custom (non-native) header controls |
| `.sheet-body-interactive` | Opt-in: non-native click targets get `touch-action: manipulation` inside the body scroll root |
| `.sheet-divider` | Line between chrome and body (hidden at collapsed header via `data-sheet-collapsed-header`) |
| `.sheet-bottom-reserve` | Hidden measurement node for reserve height (collapsed snap); body scroll uses the same length as padding |
| `.sheet-body-root--scroll` | Body at full height (overflow scroll) |
| `.sheet-body-root--drag` | Body below full height (overflow hidden) |
| `.sheet[data-sheet-collapsed-header] .sheet-body-root` | Body hidden at collapsed header snap |

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

Opens [`apps/sheet-demo`](../../apps/sheet-demo) with screens for minimal content, long scroll, handle-only, tab-bar reserve, and inset host positioning.

## Tests

```bash
pnpm --filter @siegetag/sheet test
```

Unit tests cover the gesture reducer, snap math, scroll mode, and integration tests cover chrome drag, scroll handoffs, and snap settle behavior inside `SheetHost`.

## License

**GNU Affero General Public License v3.0 or later** — see [LICENSE](./LICENSE).

Using this package in a network-facing app (including SaaS) may require you to share corresponding source when users interact with the modified version over a network. Linking from a private app to a published copy of this package is a separate question — review with counsel for your deployment model.
