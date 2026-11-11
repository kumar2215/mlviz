# MLViz colour style guide

This guide applies to every frontend component, lesson, chart, tooltip and authored SVG. Keep the blue-and-cyan identity, light surfaces and separate data palettes. Colour changes must preserve lesson behaviour, layouts and progress.

## Source of truth

- Edit `src/theme/palette.json` to change approved colours, semantic roles, chart palettes or contrast pairs.
- Run `npm run colors:generate`. Commit the manifest and both generated files together.
- CSS utilities and the typed exports in `src/theme/colors.ts` are generated from that same manifest. Do not edit generated files directly.
- `npm run check:colors` checks generation, source usage, authored SVGs and contrast. The production build runs this check first.
- In development, open `#/style-guide` for live swatches, focusable controls, pathway examples and chart scales. That page is excluded from production builds and normal navigation.

All literal values are sRGB hex, including eight-digit hex for approved transparency. Do not mix Tailwind's default numbered palette with older hex equivalents. The names below describe MLViz roles, not Tailwind shade numbers.

## Interface palette

| Role | Value | Usage |
| --- | --- | --- |
| `pageStart` → `pageEnd` | `#ecfeff` → `#f0f9ff` | The `bg-page` cyan-to-sky page gradient |
| `surface` | `#ffffff` | Cards, dialogs, fields and tooltips |
| `surfaceSubtle` | `#f8fafc` | Sidebar and plot surfaces |
| `surfaceRecessed` | `#f1f5f9` | Recessed groups and neutral tracks |
| `surfaceTint` | `#eff6ff` | Quiet blue-tinted learning panels |
| `foreground` | `#0f172a` | Main text and headings |
| `textSecondary` | `#475569` | Supporting text |
| `mutedForeground` | `#64748b` | Less prominent text on approved light surfaces |
| `border` | `#cbd5e1` | Decorative boundaries |
| `controlBorder` | `#64748b` | Essential field boundaries |
| `primary` / `primaryHover` / `primaryPressed` | `#2563eb` / `#1d4ed8` / `#1e40af` | Primary actions; white foreground |
| `selection` / `selectionBorder` / `selectionForeground` | `#eff6ff` / `#2563eb` / `#1d4ed8` | Selected controls and tabs |
| `ring` | `#2563eb` | Keyboard focus, with a surface-coloured offset |
| `disabled` / `disabledBorder` / `disabledForeground` | `#f1f5f9` / `#cbd5e1` / `#94a3b8` | Inactive controls |
| `brand` / `brandCyan` | `#0ea5e9` / `#06b6d4` | Branding only; cyan is not a general text colour |

Use slate-based neutral roles throughout. Do not introduce gray, zinc or stone alternatives. Use `textSecondary` for supporting text on tinted/recessed surfaces; reserve `mutedForeground` text for white or `surfaceSubtle` surfaces. White and black are represented by role tokens rather than component literals.

### Feedback and rewards

| Meaning | Background | Border | Text | Strong fill |
| --- | --- | --- | --- | --- |
| Information | `#eff6ff` | `#bfdbfe` | `#1e3a8a` | `#2563eb` |
| Success | `#ecfdf5` | `#a7f3d0` | `#065f46` | `#047857` |
| Warning | `#fffbeb` | `#fde68a` | `#92400e` | `#b45309` |
| Error | `#fef2f2` | `#fecaca` | `#991b1b` | `#dc2626` |
| Reward | `#fffbeb` | `#fde68a` | `#451a03` | Meter `#d97706` |

Destructive buttons use `destructive` with white `destructiveForeground`; hover uses `destructiveHover`. Error messages use the pale `danger` surface and dark `dangerForeground`. Do not put white text on pale feedback surfaces.

Use amber only for XP, rewards and warnings. Distinguish those meanings through text and icons, not additional hues. XP tracks use `rewardTrack`; the `reward-meter` recipe combines `rewardMeter` fill with a `rewardOutline` (`#92400e`) inset outline to reach 3:1 against the track, and decorative sparks use the approved confetti recipe.

## Component recipes

- **Primary actions:** use `<Button>`; its default, hover, pressed, focus and disabled states use semantic tokens. Secondary/outline controls use light surfaces and dark text.
- **Fields:** `bg-surface text-foreground border-control-border`. Disabled fields use the three disabled roles. A pale decorative border is not sufficient when an outline is needed to identify a field.
- **Selection:** `bg-selection border-selection-border text-selection-foreground`. Retain selected labels, ticks or `aria-pressed` in addition to colour.
- **Tooltips:** white `popover`, dark `popoverForeground`, decorative border and the shared shadow. Tooltip arrows must match the tooltip surface.
- **Focus:** a two-pixel `ring-ring`, a two-pixel offset, and `ring-offset-surface`; preserve clear focus on coloured controls. Do not darken a colour with an arbitrary filter to manufacture a new state.
- **Feedback:** use the matching background/border/text roles from the table. Soft affirmative/reject controls pair these roles with their matching `successHover`, `dangerHover`, `warningHover`, or `rewardHover` surface; never let a default blue hover override a soft feedback surface. Use words and icons for success, warning and errors.
- **Overlays:** use `overlay`; loading overlays use `loadingOverlay`. Translucent header surfaces use `surfaceTranslucent`. Do not add per-component alpha suffixes such as `/80`.
- **Shadows:** use `shadow-xs` through `shadow-2xl`, generated from the approved shadow colours. SVG/D3 tooltips and effects use `colourRecipes`.
- **Gradients:** UI gradients are limited to `bg-page` and `bg-brand-gradient`. Use flat semantic surfaces for buttons, headings and callouts. Chart loss and playback gradients use the shared recipe functions.
- **Opacity:** named utilities are `opacity-disabled`, `opacity-dim`, `opacity-muted`, and `opacity-secondary`. Zero/one visibility animation endpoints and data-dependent chart opacity are functional exceptions; they must not select a new hue.

```tsx
<Button>Run step</Button>
<div className="border border-success-border bg-success text-success-foreground">
  ✓ Step completed
</div>
```

```ts
import { chartColors, uiColors } from "@/theme/colors";
selection.attr("stroke", chartColors.proposal);
tooltip.style("background", uiColors.surface);
```

Do not use raw hex/RGB/HSL/OKLCH values, CSS colour keywords, numbered colour utilities, arbitrary colour utilities, or local gradient declarations in components. `none`, `transparent`, inherited colours and SVG `context-stroke` remain valid for their existing technical purposes.

### Pathway and mascot

- Current node: `pathwayCurrent` with `pathwayOnCurrent`; visited nodes: `pathwayVisited`; available nodes: `pathwayAvailable`. Use `pathwayOutline` for available/visited outlines.
- Locked nodes: `pathwayLocked`, `pathwayLockedOutline`, `pathwayLockedText`, dashed outlines and lock descriptions.
- Subpage arcs: `pathwaySegmentCurrent` is dark blue; completed and next arcs use `pathwaySegmentCompleted` and `pathwaySegmentNext`; future arcs use `pathwaySegmentFuture`.
- Edges use `pathwayEdgeCurrent`, `pathwayEdgeTraversed`, or `pathwayEdgeLocked`; retain configured directions and dashed unavailable edges.
- Soccat stays white with navy features and cyan details. Its asset uses the `mascot` palette. Do not introduce purple or change its position/interaction behaviour as a styling change.

In CSS these roles are kebab-cased: `bg-pathway-current`, `stroke-pathway-edge-locked`. In TypeScript use `pathwayColors.current`, etc.

## Visualisation palette

Interface feedback and dataset classes are separate meanings. A red class is not an error. Keep labels, legends, shapes or line patterns that explain data.

| Chart meaning | Token | Value |
| --- | --- | --- |
| Current/user-controlled model | `chartColors.current` | `#2563eb` |
| Pending proposal | `chartColors.proposal` | `#c2410c` |
| Fitted/optimal model | `chartColors.fitted` | `#059669` |
| Training context | `chartColors.train` | `#64748b` |
| Test context | `chartColors.test` | `#94a3b8` |
| Errors/residuals | `chartColors.error` | `#ef4444` |
| Unassigned data | `chartColors.unassigned` | `#999999` |

Current, proposal, fitted and error lines reach 3:1 against approved light plot surfaces. Data fills can be lighter than the UI contrast threshold when their labels or contrasting outlines supply identification. Use approved `axis`, `ink`, `grid`, positive/negative, and region tokens rather than borrowing disabled UI text for chart annotations.

The default categorical palette, in order, is `#1f77b4`, `#ff7f0e`, `#2ca02c`, `#d62728`, `#0891b2`, `#8c564b`, `#eab308`, `#7f7f7f`, `#bcbd22`, `#1e3a8a`. Preserve existing class ordering and helper signatures. Additional approved palettes are `dark2`, `set3`, `paired`, and `pastel1`; their purple-range entries have been replaced with blue in the manifest.

Continuous scales are Cividis, YlOrBr, Blues, Greens, Reds, Oranges and Greys. Preserve compatibility aliases: `viridis`/`plasma` → Cividis; `inferno`/`magma`/`turbo` → YlOrBr; `purples`/`cool` → Blues; `warm` → Oranges. Legacy names are API compatibility, not permission to display purple. Generate loss legends from the same interpolator as the plotted loss. Neural decision regions blend the approved negative and positive region colours.

Data-dependent interpolation and support-vector darkening are permitted within these approved chart encodings. Unrestricted hue generation and random colour selection are not. Use the categorical palette for unknown classes.

The generated TypeScript values are concrete sRGB strings, safe for D3 colour arithmetic and standalone SVG/image export. Avoid unresolved CSS variables in exported SVGs.

## Accessibility, exceptions and changes

Approved text pairs must reach **4.5:1**. Essential control boundaries and focus indicators must reach **3:1** on their approved adjacent surfaces. Decorative borders and inactive controls are separate cases; do not claim a pale decorative divider is an accessible field outline. See [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum) and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast).

Never convey current, selected, completed, locked, success or error states through hue alone. Retain text, aria states, icons, patterns and the mascot marker.

Raster images, photographs, favicon pixels and user-provided imagery are outside the UI palette. Authored SVG files cannot inherit application variables through `<img>`: their literal fill/stroke values are allowed only when present in the manifest, and are checked separately. Generated token files are the only application-source exceptions for literal colours. Gradient formulas are restricted to the named recipe module and generated CSS.

To add a colour, first identify a missing semantic meaning. Reuse a role where possible; otherwise add a named role to the manifest, document its purpose and permitted pairings, regenerate tokens, and update the visual reference and relevant tests. Run `npm run check:colors`, `npm run lint`, `npm test`, and `npm run build`. Do not add a broad checker exemption to accommodate a component.
