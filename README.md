# lilak-ui

A shared, compact, **theme-aware React UI kit** for LILAK projects — the
electronic logbook (`lilak_elog` / `lilak_elog_v2`), the LILAK control web, and
future tools. One design system so every app starts from a finished kit instead
of re-building (and re-fixing) the same shell, theme, log views, command bar, and
admin tables.

The kit is the product; the apps are its proving grounds. Anything reusable is
pushed *out* of an app and *into* the kit, so the next project inherits it for
free.

---

## Design language

- **Semantic design tokens.** Every colour is a CSS variable (`--surface`,
  `--text-primary`, `--btn-primary-bg`, …) defined per theme: **bright / dark /
  lowcontrast**, plus the shipped **Teal** preset. `theme/tokens.js` is the single
  source of truth; `applyTheme()` generates the CSS-variable blocks at runtime.
- **High information density.** Compact rows, hairline borders, small type, a
  9-step font scale (`--fs-micro` … `--fs-display`). Built for dashboards and
  logbooks where you want a lot on screen without it feeling cramped.
- **Phosphor icons throughout**, routed through one semantic map (`ICONS`) so a
  single swap changes an icon everywhere.
- **No Tailwind, no build step.** Components are inline-style + CSS-vars. The kit
  ships as source; the host app's Vite transpiles the JSX.

---

## What's inside

Everything is a single barrel import: `import { … } from 'lilak-ui'`.

**Theme** — `TOKENS / TOKEN_GROUPS / THEMES`, `applyTheme / setTheme / cycleTheme
/ buildThemeCSS`, font helpers `loadFonts / applyLangFont / FONT_DEFAULTS`, and
presets `listPresets / applyPreset / saveCustomPreset / setTokenOverride /
BUILTIN_PRESETS` (ships **Teal**). `uiStyles` + `hoverify` for shared style
recipes.

**App shell** — `TopBar` (brand + `brandIcon` + `brandSuffix` + `onBrandClick` +
tabs-with-icons that collapse to icons when narrow + a right slot), `CommandBar`
(the collapsible bottom command line), `Drawer` (top panel up to 3/4 of the
viewport, a modal alternative), `TopPanel`, `NotificationBell`, `ShortcutsModal`,
`Menu`.

**Command + hotkey connector** — `CommandRegistryProvider` + `useCommand /
useCommands / useShortcut / useCommandRegistry`. Components self-register commands
(each with an optional `hotkey`) and shortcuts that auto-wire into the CommandBar,
the global hotkey layer, and the ShortcutsModal. The CommandBar supports `/`
commands, option pick-lists (`args`), Tab-autocomplete, a secure password mode,
free-text input mode, a portal `slot` mode, and lead-char **find modes**.

**Tag index** — `TagIndexProvider` + `useTaggable / useTaggables / useTagIndex`.
Any searchable surface registers `{ id, label, tags, kind, number, run }`; `#tag`
search (AND-combined) queries the live index from the CommandBar and from your own
search UI. The store is exposed via `useSyncExternalStore` so registration is
cheap and render-safe.

**Data components** — the unified, collapsible data-entry abstraction.
`DataCard` (collapsed = index char + title + tags; open = image / text / node
media), `DataGrid` (roving-focus arrows + `hjkl`, space to toggle), and
`makeDataFindModes / DATA_INDEX / INDEX_CHARS` — the special-character index
scheme (`% _ ^ & @ ~ > !` per kind, `*` for bookmarks). `bookmarks.js` backs the
`*` channel.

**Log domain** (the elog model) — `LogEntryCard` (brief / normal / rich),
`LogList` (task-child nesting + a configurable `groupBy` divider), `LogToolbar`
(page-size / view-mode / groupBy / filter), `LogFeed`, `LogDetail` (slots for
banners / child-tasks / actions / comments), `LogComposer` (create **and** edit),
`FormatPicker`, `NumberEntryField`, `Markdown`, plus `formatUtils` and
`tagColors`.

**CRUD scaffolding** — `CrudForm` (schema-driven fields: text / number / email /
password (+eye) / textarea / select / checkbox / color / custom; with `full`,
`disabledOnEdit`, `requiredOnCreate`) and `CrudTable` (DataTable + auto
edit/delete actions + Add → inline form + delete-confirm).

**Primitives** — `Button` (8 variants, sm/md, icon-only), `Input`, `Badge`,
`Chip / ChipGroup`, `Callout`, `Card`, `Tabs`, `SubTabs`, `Modal`, `DataTable`
(columns support a `fit` flag that hugs content), `Avatar` (Phosphor-in-a-circle,
seedable), `CopyField`, `Lightbox`, `DashboardGrid`, `TimeRangePicker`, `SideNav`,
`Pagination`, `ColorSettings` (preset + token editor), `ColorPicker` (popover:
hex / copy / paste; single or bg·line·text).

**Layout** — `Box / Stack / Row / Grid / Container / Spacer`. Use these in glue
code instead of `className="flex …"`.

**App services** — `LangProvider / useLang` (i18n; the consumer supplies the
dictionaries), `useHotkeys / prettyKey`, `IdentityProvider / useIdentity`,
`LoginForm`.

**Icons** — `Icon` (Phosphor via the `ICONS` semantic map) + `customIcon /
strokeIcon / fillIcon` factories for your own marks.

---

## Directory layout

```
src/
  index.js          # the public barrel (every export above)
  theme/            # tokens.js, applyTheme.js, presets.js, uiStyles.js
  i18n.jsx          # LangProvider / useLang
  icons.jsx         # Icon + ICONS map + custom-icon factories
  commands.js       # low-level command match/run
  command/          # registry.js + CommandRegistry.jsx (the connector)
  tags/             # index.js + TagIndex.jsx (the search index)
  data/             # DataCard, DataGrid, dataFindModes, bookmarks
  log/              # LogEntryCard, LogFeed, LogList, LogDetail, LogComposer, …
  crud/             # CrudTable, CrudForm
  layout/           # Box / Stack / Row / Grid / Container / Spacer
  auth/             # LoginForm
  components/        # everything else (TopBar, CommandBar, Drawer, Modal, …)
  hooks/            # useHotkeys
demo/               # the gallery app (npm run demo)
```

---

## Usage

### Install the runtime deps

```sh
npm i @phosphor-icons/react react-markdown remark-gfm
```

The kit itself is consumed **from source** — no build step. The host app's Vite
transpiles the JSX. Each consumer adds an alias + a couple of Vite settings.

### Wire it into a consumer (Vite)

```js
// vite.config.js
import { resolve } from 'path'
export default defineConfig({
  resolve: {
    alias: { 'lilak-ui': resolve(__dirname, '<rel>/lilak_ui/src') },
  },
  server: {
    // the kit lives outside the project root → allow Vite to read it
    fs: { allow: [resolve(__dirname), resolve(__dirname, '<rel>/lilak_ui')] },
  },
  // pre-bundle the kit's runtime deps so adding them never triggers a reload loop
  optimizeDeps: { include: ['@phosphor-icons/react', 'react-markdown', 'remark-gfm'] },
})
```

> **Gotcha:** if you add `@phosphor-icons/react` to a running dev server without
> `optimizeDeps.include`, Vite re-optimizes the big icon barrel on demand and the
> page can blank in a reload loop. Fix: add the `include` above, then
> `rm -rf node_modules/.vite` and restart.

### Bootstrap once at app startup

```jsx
import { loadFonts, FONT_DEFAULTS, applyTheme } from 'lilak-ui'

loadFonts()                                   // Pretendard / IBM Plex / JetBrains Mono
for (const [k, v] of Object.entries(FONT_DEFAULTS))
  document.documentElement.style.setProperty(k, v)
applyTheme()                                  // or drive [data-theme] yourself
```

### Compose a screen

```jsx
import { TopBar, CommandBar, Drawer, Button, Icon, Container } from 'lilak-ui'

<TopBar brand="LILAK" brandIcon={<Icon name="lilak" size={28}/>}
        tabs={tabs} active={tab} onTab={setTab} right={<Button>…</Button>} />
<Container max={1180}>{/* page */}</Container>
<CommandBar collapsible commands={registry.commands} findModes={findModes} />
```

### Register a command + a searchable entry

```jsx
import { useCommand, useTaggables } from 'lilak-ui'

useCommand({ id: 'new-log', title: 'New log', hotkey: 'c', run: () => openNewLog() })

useTaggables(() => logs.map((l) => ({
  id: `log:${l.id}`, label: l.title, number: l.id,
  tags: l.tags, kind: 'log', run: () => openLog(l.id),
})), [logs])
```

### Custom icons (Phosphor-compatible)

Three factories build icons that take the **same props as Phosphor** (`size`,
`color`, `weight` ∈ thin/light/regular/bold/fill/duotone, `mirrored`):

```jsx
import { customIcon, strokeIcon, fillIcon, ICONS, Icon } from 'lilak-ui'

ICONS['mark']     = customIcon({ regular: <path d="…"/>, fill: <path d="…"/> }, 'Mark')
ICONS['scribble'] = strokeIcon((sw) => <path d="…" fill="none" stroke="currentColor" strokeWidth={sw}/>, 'Scribble')
ICONS['lilak']    = fillIcon('0 0 1024 816', <path fill="currentColor" d="…"/>, 'LilakMark')

<Icon name="lilak" size={26} weight="fill" />
```

Paths use `currentColor`. `customIcon` rides Phosphor's `IconBase` (256 grid);
`strokeIcon` / `fillIcon` set CSS `color` themselves so stroke art follows the
`color` prop.

---

## Development

```sh
npm install
npm run demo        # the component gallery → http://localhost:5120
```

**Conventions**

- **No Tailwind in the kit.** Inline styles + CSS-vars only. Reach for the
  `layout/` primitives, never `className="flex …"`.
- **Tokens, not literals.** Colours come from `var(--…)`; font sizes from the
  `--fs-*` scale. A new colour belongs in `theme/tokens.js`, a new icon in the
  `ICONS` map — never hardcoded inline.
- **i18n at the edge.** Kit components never hardcode user-facing text; the
  consumer passes strings (or dict-backed `t()`).
- **Add a component:** drop it in the right subfolder, export it from
  `src/index.js`, and add a demo case so the gallery documents it.

**Gotchas**

- **Provider stores.** The command-registry and tag-index context *value is the
  stable store* (not a per-render snapshot); read hooks subscribe via
  `useSyncExternalStore`. Putting a per-render value in a registration hook's deps
  causes an infinite "Maximum update depth" loop.
- **Phosphor named exports.** One wrong import name (e.g. `Pushpin` vs `PushPin`)
  makes the whole `icons.jsx` module fail and blanks the app **with no console
  error**. Diagnose by `await import()`-ing the module in the browser console.
- **Border shorthand vs longhand.** Don't mix the `border` shorthand with
  longhand props across a rerender — React warns.

---

## Distribution & migration

The kit is consumed from source today (Vite alias). The `package.json` already
declares proper `exports` and `files: ["src"]`, so it can later be linked via a
`file:` dependency, `npm link`, or published — without changing any consumer
import.

1. **Now** — apps consume `lilak-ui` via the alias. The kit was hardened by
   rebuilding **all** of `lilak_elog_v2` from kit blocks + thin glue.
2. **Once stable** — production `lilak_elog` deletes its local `theme/tokens.js`,
   `theme/uiStyles.js`, and duplicated components and imports them from
   `lilak-ui` (tokens were copied verbatim, so the swap is lossless).

---

## Ports & license

- Demo dev server: **5120**.
- License: MIT (`package.json`).
