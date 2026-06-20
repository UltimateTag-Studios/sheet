# @siegetag/sheet

Generic bottom sheet for React web apps — unified gesture state machine, no third-party drawer library.

**In scope:** measured snap heights (collapsed / half / full), handle + header + body gesture routing, body scroll handoff at full height, structural layout (`SheetLayout`), semantic CSS.

**Out of scope:** product-specific sheet content (lists, titles, legends). Map integration lives in `@siegetag/sheet-map`. Floating tab bar padding is injected by the consumer via style props.

## Install

```json
{
  "dependencies": {
    "@siegetag/sheet": "workspace:*"
  }
}
```

Import styles once in your app entry (not bundled automatically):

```tsx
import "@siegetag/sheet/styles.css";
```

## Quick start

```tsx
import { Sheet, SheetLayout } from "@siegetag/sheet";
import "@siegetag/sheet/styles.css";

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

| Zone | Behavior |
|------|----------|
| Handle + header (chrome) | Sheet drag at all snaps — even when body is scrolled at full |
| Body below divider | Sheet drag below full height |
| Body at full height | Scroll when content scrolled; at scroll top, drag down collapses, drag up scrolls |

When the sheet settles to a new snap, body scroll resets to the top.

Do **not** add `overflow-y-auto` to body content — the shell owns scroll on the body root.

## Configuration

| Prop | Default | Description |
|------|---------|-------------|
| `halfSnapFraction` | `0.5` | Fraction snap between collapsed and full |
| `collapsedBottomInsetPx` | `0` | Extra collapsed height without DOM |
| `drawerStyle` / `drawerHandleStyle` | — | CSS overrides (prefer theme CSS on `.sheet-drawer`) |

Use `buildSheetLayoutVars()` / `buildSheetStyle()` for handle geometry tokens.

## Demo app

```bash
pnpm dev:sheet-demo
```

Opens [`apps/sheet-demo`](../../apps/sheet-demo) with screens for minimal content, long scroll, handle-only, and tab-bar reserve padding.
