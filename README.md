# @siegetag/sheet

Generic bottom sheet for React web apps — unified gesture state machine, no third-party sheet library.

**In scope:** measured snap heights (collapsed / half / full), handle + header + body gesture routing, continuous scroll/sheet handoffs at full height, structural layout (`SheetLayout`), semantic CSS theme tokens.

**Out of scope:** product-specific sheet content (lists, titles, legends). Map integration lives in `@siegetag/sheet-map`. Floating tab bar padding is injected by the consumer via `SheetLayout.bottomChromeReserve`.

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
import "@siegetag/sheet/styles.css";

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

## Layout (`Sheet.layout` / `sheetLayout`)

Geometry only — spacing, radii, blur. Colors come from theme CSS tokens. Type: `SheetLayoutConfig`.

| Section | Fields | CSS vars (on `.sheet-slide`) |
|---------|--------|------------------------------|
| `handle` | `marginTop`, `marginBottom`, `height`, `width`, `borderRadius` | `--sheet-handle-*` |
| `sheet` | `borderRadius`, `borderWidth`, `backdropBlur` | `--sheet-border-*`, `--sheet-backdrop-blur` |
| `header` | `paddingHorizontal`, `paddingVertical` | `--sheet-header-padding-*` |
| `divider` | `paddingHorizontal`, `paddingVertical`, `height` | `--sheet-divider-*` |
| `body` | `paddingHorizontal`, `paddingVertical`, `gap` | `--sheet-body-*` |
| `listItem` | `gap`, `paddingHorizontal`, `paddingVertical`, `borderRadius`, `contentGap` | `--sheet-list-item-*` |
| `bottomChromeReserve` | `reserve`, `gap` | (measured spacer + scroll padding) |

Use `buildSheetLayoutVars(layout)` or pass `layout` to `Sheet`.

## Theming

`theme: "light" | "dark"` on `SheetHost` sets `data-sheet-theme`. Bundled CSS defines semantic tokens on the host:

| Token | Purpose |
|-------|---------|
| `--sheet-color-text` | Sheet copy color |
| `--sheet-color-surface-background` | Panel background |
| `--sheet-color-surface-border` | Panel border |
| `--sheet-color-surface-shadow` | Panel shadow |
| `--sheet-color-handle` | Drag handle |
| `--sheet-color-divider` | Chrome divider |

Override in app CSS (after bundled import):

```css
.sheet-host[data-sheet-theme="light"] {
  --sheet-color-surface-background: #f8fafc;
}
```

Export `SHEET_THEME_VARS` lists all token names for tooling.

## Live layout for map integrators

Use `onLayoutFrameChange` on `Sheet` for machine-committed `visibleHeightPx` during drag. `@siegetag/sheet-map` syncs map padding from live sheet geometry.

## Tests

```bash
pnpm --filter @siegetag/sheet test
pnpm --filter @siegetag/sheet build:styles
```

## License

GNU Affero General Public License v3.0 or later — see [LICENSE](./LICENSE).
