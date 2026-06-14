# lilak-ui

Shared, compact, theme-aware React UI kit for LILAK projects — `lilak_elog`, the
LILAK control web (`~/Research/lilak/ui`), and future tools. One design system so
every app starts from a finished kit instead of re-building (and re-fixing) the
same shell, theme, log views, and admin tables.

Design language: semantic design tokens (bright / dark / lowcontrast + the
shipped **Teal** preset), tuned for **high information density** — compact rows,
hairline borders, small type. Icons are **Phosphor** throughout, routed through
one semantic map.

## Install

```sh
npm i @phosphor-icons/react       # peer-used runtime dep (see Distribution)
# react-markdown + remark-gfm are also deps (Markdown / log bodies)
```

The kit is consumed **from source** (no build step) — the host app's Vite
transpiles the JSX. Each consumer adds an alias + a couple of Vite settings.

### Wire it into a consumer (Vite)

```js
// vite.config.js
import { resolve } from 'path'
export default defineConfig({
  resolve: {
    alias: { 'lilak-ui': resolve(__dirname, '<rel>/ai_projects/lilak_ui/src') },
  },
  server: {
    // the kit lives outside the project root → allow it
    fs: { allow: [resolve(__dirname), resolve(__dirname, '<rel>/ai_projects/lilak_ui')] },
  },
  // pre-bundle the kit's runtime deps so adding them never triggers a reload loop
  optimizeDeps: { include: ['@phosphor-icons/react', 'react-markdown', 'remark-gfm'] },
})
```

> **Gotcha:** if you add `@phosphor-icons/react` to a running dev server without
> `optimizeDeps.include`, Vite re-optimizes the big icon barrel on demand and the
> page can blank in a reload loop. Fix: add the `include` above + `rm -rf
> node_modules/.vite` + restart.

### Bootstrap (once, at app startup)

```jsx
import { loadFonts, FONT_DEFAULTS } from 'lilak-ui'
loadFonts()   // Pretendard / IBM Plex Sans / D2Coding / JetBrains Mono (jsDelivr)
for (const [k, v] of Object.entries(FONT_DEFAULTS)) document.documentElement.style.setProperty(k, v)
// theme colours: call applyTheme() OR drive [data-theme] yourself (tokens match)
```

## What's inside (barrel: `import { … } from 'lilak-ui'`)

**Theme** — `TOKENS / TOKEN_GROUPS / THEMES`, `applyTheme / setTheme / cycleTheme
/ loadFonts / applyLangFont / FONT_DEFAULTS`, presets `listPresets / applyPreset
/ saveCustomPreset / BUILTIN_PRESETS` (ships **Teal**). `tokens.js` is the single
source of truth; `applyTheme()` generates the CSS-variable blocks at runtime.

**App shell** — `TopBar` (brand + `brandIcon` + tabs-with-icons + right slot),
`CommandBar` (collapsible bottom command line), `Drawer` (top panel up to 3/4,
modal alternative), `NotificationBell`, `ShortcutsModal`, `TopPanel`, `Menu`.

**Command + hotkey connector** — `CommandRegistryProvider` + `useCommand /
useCommands / useShortcut / useCommandRegistry`. Components self-register
commands (with `hotkey`) and shortcuts that auto-wire into the CommandBar, the
global hotkeys, and the ShortcutsModal. The CommandBar supports `/` commands,
option pick-lists (`args`), and lead-char **find modes** (`#` etc.).

**Tag index** — `TagIndexProvider` + `useTaggable / useTaggables / useTagIndex`.
Any searchable component registers `{ id, label, tags, run }`; `#tag` search
(AND-combined) queries the live index from the CommandBar and from your search UI.

**Log domain** (elog model) — `LogEntryCard` (brief/normal/rich), `LogList`
(task-child nesting + configurable `groupBy` divider), `LogToolbar` (page-size /
view-mode / groupBy / filter), `LogFeed`, `LogDetail` (slots for banners /
child-tasks / actions / comments), `LogComposer` (create **and** edit),
`FormatPicker`, `NumberEntryField`, `Markdown`, `formatUtils`, `tagColors`.

**CRUD** — `CrudForm` (schema-driven: text/number/email/password(+eye)/textarea/
select/checkbox/color/custom; `full`, `disabledOnEdit`, `requiredOnCreate`) and
`CrudTable` (DataTable + auto edit/delete actions + Add → inline form +
delete-confirm). `DataTable` columns support a `fit` flag (hug content, no clip).

**Primitives** — `Button` (8 variants, sm/md, icon), `Input`, `Badge`, `Card`,
`Tabs`, `Modal`, `DataTable`, `ColorSettings` (preset + token editor),
`ColorPicker` (popover: hex / copy / paste; single or bg·line·text), layout
`Box / Stack / Row / Grid / Container / Spacer`.

**Icons** — `Icon` (Phosphor via the `ICONS` semantic map) + factories for your
own marks (see below).

**App services** — `LangProvider / useLang` (i18n, consumer supplies dicts),
`useHotkeys / prettyKey`, `IdentityProvider / useIdentity`, `Pagination`,
`LoginForm`.

## Custom icons (Phosphor-compatible)

Three factories build icons that accept the **same props as Phosphor** (`size`,
`color`, `weight` ∈ thin/light/regular/bold/fill/duotone, `mirrored`):

```jsx
import { customIcon, strokeIcon, fillIcon, ICONS, Icon } from 'lilak-ui'

// fill icon on Phosphor's 256 grid (weight = different path per weight)
ICONS['mark'] = customIcon({ regular: <path d="…"/>, fill: <path d="…"/> }, 'Mark')

// line-art (weight → stroke width); sets CSS color so stroke follows `color`
ICONS['scribble'] = strokeIcon((sw) => <path d="…" fill="none" stroke="currentColor" strokeWidth={sw}/>, 'Scribble')

// a logo with its own viewBox (fill, aspect preserved) — e.g. the LILAK brand mark
ICONS['lilak'] = fillIcon('0 0 1024 816', <><path fill="currentColor" d="…"/></>, 'LilakMark')

<Icon name="lilak" size={26} weight="fill" />
```

> Paths use `currentColor`. `customIcon` rides Phosphor's `IconBase` (256 grid);
> `strokeIcon`/`fillIcon` set CSS `color` themselves so stroke art follows the
> `color` prop (IconBase only sets `fill`).

## Implementation notes / gotchas

- **Provider stores:** the command-registry and tag-index context **value is the
  stable store** (not a per-render snapshot); read hooks subscribe via
  `useSyncExternalStore`. Putting a per-render value in registration-hook deps
  causes an infinite "Maximum update depth" loop.
- **No Tailwind in the kit** — components are inline-style + CSS-vars. Use the
  `layout/` primitives instead of `className="flex …"` in glue code.

## Preview the gallery

```sh
npm install
npm run demo        # http://localhost:5120
```

## Migration plan

1. **Now** — new apps (LILAK control) consume `lilak-ui` via alias. The kit was
   proven by rebuilding all of `Research/lilak/elog` from kit blocks.
2. **Once stable** — production `lilak_elog` deletes its local `theme/tokens.js`,
   `theme/uiStyles.js`, and duplicated components and imports them from
   `lilak-ui` (tokens were copied verbatim, so the swap is lossless).

## Ports

Demo dev server `5120` (see `~/ai_projects/PORTS.md`).
