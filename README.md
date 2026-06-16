# lilak-ui

A compact, **theme-aware React UI kit** for LILAK projects — the electronic
logbook (`lilak_elog`), the LILAK control web, and future tools. One design
system, written once and shared, so every app starts from a finished shell
(theme, log views, command bar, admin tables) instead of rebuilding it.

Everything is one barrel import:

```js
import { TopBar, CommandBar, LogFeed, DataTable, applyTheme } from 'lilak-ui'
```

The whole kit lives under [`src/`](src/) as plain JSX + CSS variables — no build
step, no Tailwind. The host app's Vite transpiles the source directly.

---

## The demo gallery

`npm run demo` boots a single-file app ([`demo/main.jsx`](demo/main.jsx)) that
wires the kit into a realistic LILAK shell: a `TopBar` with the brand lockup
(logo `brandIcon` + two-line `brand`/`brandSub` + a `brandSuffix` chip), tabs, a
bottom `CommandBar`, a drop-down system panel, full i18n (한국어 / English / 日本語), and
live theme switching. Each tab exercises a different slice of the kit. The brand
mark ships in the kit (`<Icon name="lilak"/>`) and the same SVG
([`demo/public/lilak.svg`](demo/public/lilak.svg)) is wired up as the browser-tab
favicon.

### Run tab — `DataTable` + `Card`

A parameter table (`LKRun/*`, `lilak/*`) rendered with `DataTable` (zebra rows,
mono columns, inline `Input` editors) inside a `Card` with header actions.

![Run tab](docs/images/run.png)

### Log tab — the elog domain (`LogComposer`, `LogFeed`)

The logbook model. `LogComposer` in **edit mode** (pre-filled from an existing
entry, Save / Cancel) on top, a fresh **create** composer with a format picker
and markdown write/preview below, then the `LogFeed` of entries with keyboard
navigation (`j`/`k`, space to expand).

![Log tab](docs/images/log.png)

### Settings tab — `CrudTable`, `ColorPicker`, `ColorSettings`

`CrudTable` (add / edit / delete over in-memory rows with a schema-driven
form), the component-mode `ColorPicker` (background · line · text for a tag),
and `ColorSettings` — the preset switcher (**Bright / Dark / Low contrast /
Teal**) plus the live per-token editor.

![Settings tab](docs/images/settings.png)

### Phone vs laptop — the same app, adapted

The kit is responsive in two complementary ways, both on show in the demo:

- **Components adapt to their own container.** `TopBar` measures its width with a
  `ResizeObserver` and collapses tabs to **icon-only** when labels no longer fit;
  `ColorSettings` lays its token groups out with `auto-fill minmax(220px, 1fr)`,
  so the editor goes from 3 columns on a laptop down to 1 on a phone — no
  viewport check, no JS.
- **The app branches at the glue level** using the `useBreakpoint` hook
  (`src/hooks/useBreakpoint.js`): below the phone breakpoint the demo stacks the
  system panel to one column, tightens padding, drops the username next to the
  bell, and switches `TopBar` into its **mobile mode** — pass `tabsAsMenu` and a
  taller `height` and the tabs fold behind a single list-icon trigger that opens
  a pick-list of the tabs (tap the icon → choose a tab):

<p>
  <img src="docs/images/phone-tabmenu.png" alt="Phone top bar with the tab pick-list open" width="300" />
</p>

Several components carry the responsive behaviour themselves, so glue code rarely
has to special-case the phone:

- **`DataTable scroll` / `CrudTable`** wrap a wide table in its own horizontal
  scroller, so cells that can't shrink (inputs, action buttons) scroll *inside
  the card* instead of widening the whole page. `CrudTable` enables it by default.
- **`LogComposer`** lays its run / title fields out with `flex-wrap`, so they
  reflow onto multiple rows on a narrow screen rather than squishing.
- **`Grid minCol={220}`** ([`layout/`](src/layout/)) gives you the
  `auto-fill minmax()` column behaviour as a primitive — responsive columns with
  no breakpoint and no JS.

<p>
  <img src="docs/images/phone-run.png" alt="Run tab on a phone" width="300" />
  &nbsp;
  <img src="docs/images/phone-settings.png" alt="Settings tab on a phone" width="300" />
</p>

```jsx
import { useBreakpoint } from 'lilak-ui'

const { isPhone } = useBreakpoint()
<div style={{ display: 'grid', gridTemplateColumns: isPhone ? '1fr' : '2fr 1fr' }}>…</div>
// or branch into an entirely different tree:  isPhone ? <MobileShell/> : <DesktopShell/>
```

### Running it

```sh
npm install
npm run demo        # → http://localhost:5120
```

The port is read from `PORT` (see [`.env.example`](.env.example)), so
`PORT=5121 npm run demo` or a `.env.local` overrides it. The Vite config
([`vite.config.js`](vite.config.js)) roots Vite at `demo/` and serves the kit
from `src/` directly.

Keyboard shortcuts in the demo: `/` command bar · `\` system panel · `[` `]`
switch tabs · `g r/l/o/s` jump to a tab · `?` shortcuts modal.

---

## What's inside `src/`

### Theme — [`theme/`](src/theme/)

The single source of truth for every color and size.

- **`tokens.js`** — every color is a *semantic token* (`--app-bg`, `--surface`,
  `--text-primary`, `--btn-primary-bg`, …) enumerated in `TOKEN_GROUPS` with a
  value for each theme (**bright / dark / lowcontrast**). Grouped by category
  (surface / border / text / status / bubble / button / input / schedule) so
  the settings editor can render them.
- **`applyTheme.js`** — `applyTheme / setTheme / cycleTheme / buildThemeCSS`
  generate the CSS-variable blocks at runtime and drive `[data-theme]`. Font
  helpers `loadFonts / applyLangFont / FONT_DEFAULTS` swap the sans stack per
  language.
- **`presets.js`** — named palettes on top of a theme: `listPresets /
  applyPreset / saveCustomPreset / setTokenOverride / BUILTIN_PRESETS` (ships
  **Teal**).
- **`uiStyles.js`** — shared inline-style recipes + `hoverify`.

### Command + hotkey connector — [`command/`](src/command/) & [`commands.js`](src/commands.js)

- **`commands.js`** — the low-level matcher: `defineCommands / matchCommands /
  runCommand`.
- **`command/registry.js` + `CommandRegistry.jsx`** — a context store where
  components self-register commands and shortcuts (`useCommand / useCommands /
  useShortcut`). Registered entries auto-wire into the `CommandBar`, the global
  hotkey layer, and the `ShortcutsModal`. The CommandBar supports `/` commands,
  option pick-lists, Tab-autocomplete, a secure password mode, free-text and
  portal-`slot` modes, and lead-char **find modes**.

### Tag / search index — [`tags/`](src/tags/)

`TagIndexProvider` + `useTaggable / useTaggables / useTagIndex`. Any searchable
surface registers `{ id, label, tags, kind, number, run }`; `#tag` search
(AND-combined) queries the live index. The store is exposed via
`useSyncExternalStore`, so registration is cheap and render-safe.

### Data components — [`data/`](src/data/)

The unified collapsible data-entry abstraction: `DataCard` (collapsed = index
char + title + tags; open = image / text / node media), `DataGrid`
(roving-focus arrows + `hjkl`, space to toggle), and `makeDataFindModes /
DATA_INDEX / INDEX_CHARS` — the special-character index scheme (`% _ ^ & @ ~ >
!` per kind, `*` for bookmarks, backed by `bookmarks.js`).

### Log domain — [`log/`](src/log/)

The elog model, ported from `lilak_elog`: `LogEntryCard` (brief / normal /
rich), `LogList` (task-child nesting + configurable `groupBy` divider),
`LogToolbar`, `LogFeed`, `LogDetail`, `LogComposer` (create **and** edit),
`FormatPicker`, `NumberEntryField`, `Markdown`, plus `formatUtils` and
`tagColors`.

### CRUD scaffolding — [`crud/`](src/crud/)

`CrudForm` (schema-driven fields: text / number / email / password / textarea /
select / checkbox / color / custom, with `full`, `disabledOnEdit`,
`requiredOnCreate`) and `CrudTable` (a `DataTable` + auto edit/delete actions +
Add → inline form + delete-confirm).

### Primitives — [`components/`](src/components/)

`Button` (8 variants, sm/md, icon-only), `Input`, `Badge`, `Chip / ChipGroup`,
`Callout`, `Card`, `Tabs`, `SubTabs`, `Modal`, `DataTable`, `Avatar`
(seedable Phosphor-in-a-circle), `CopyField`, `Lightbox`, `DashboardGrid`,
`TimeRangePicker`, `SideNav`, `Pagination`, `ColorSettings`, `ColorPicker`,
plus the shell pieces `TopBar`, `CommandBar` (+ `barController.js`), `TopPanel`,
`Drawer`, `NotificationBell`, `ShortcutsModal`, `Menu`.

### Layout — [`layout/`](src/layout/)

`Box / Stack / Row / Grid / Container / Spacer`. Use these in glue code instead
of `className="flex …"`.

### App services & icons

- **[`i18n.jsx`](src/i18n.jsx)** — `LangProvider / useLang`; the consumer
  supplies the dictionaries. Languages are derived from the dict keys, so
  **adding a language is one dict entry** (`t(key)` falls back across languages,
  then to the key itself). For a new script, register its font stack with
  `registerLangFont(lang, stack)` — the demo adds Japanese (日本語) this way.
- **[`identity.jsx`](src/identity.jsx)** — `IdentityProvider / useIdentity`
  (current author name).
- **[`hooks/useHotkeys.js`](src/hooks/useHotkeys.js)** (`useHotkeys /
  prettyKey`) and **[`hooks/useBreakpoint.js`](src/hooks/useBreakpoint.js)**
  (`useMediaQuery / useBreakpoint / BREAKPOINTS` — the responsive helpers above).
- **[`auth/LoginForm.jsx`](src/auth/LoginForm.jsx)**.
- **[`icons.jsx`](src/icons.jsx)** — `Icon` routed through one semantic `ICONS`
  map (a single swap changes an icon everywhere) + `customIcon / strokeIcon /
  fillIcon` factories for your own marks.

---

## Directory layout

```
src/
  index.js          # the public barrel (everything above)
  theme/            # tokens.js · applyTheme.js · presets.js · uiStyles.js
  commands.js       # low-level command match/run
  command/          # registry.js + CommandRegistry.jsx (the connector)
  tags/             # index.js + TagIndex.jsx (the search index)
  data/             # DataCard · DataGrid · dataFindModes · bookmarks
  log/              # LogEntryCard · LogFeed · LogList · LogDetail · LogComposer · …
  crud/             # CrudTable · CrudForm
  layout/           # Box · Stack · Row · Grid · Container · Spacer
  auth/             # LoginForm
  components/       # TopBar · CommandBar · Drawer · Modal · DataTable · …
  hooks/            # useHotkeys · useBreakpoint
  i18n.jsx · identity.jsx · icons.jsx
demo/               # the gallery app (npm run demo)
docs/images/        # the screenshots above
```

---

## Conventions

- **Tokens, not literals.** Colors come from `var(--…)`; font sizes from the
  `--fs-*` scale. A new color belongs in [`theme/tokens.js`](src/theme/tokens.js),
  a new icon in the `ICONS` map — never hardcoded inline.
- **No Tailwind in the kit.** Inline styles + CSS-vars only. Reach for the
  [`layout/`](src/layout/) primitives, never `className="flex …"`.
- **i18n at the edge.** Kit components never hardcode user-facing text; the
  consumer passes strings (or a dict-backed `t()`).
- **Add a component:** drop it in the right subfolder, export it from
  [`src/index.js`](src/index.js), and add a demo case so the gallery documents it.

## Gotchas

- **Provider stores.** The command-registry and tag-index context *value is the
  stable store* (not a per-render snapshot); read hooks subscribe via
  `useSyncExternalStore`. Putting a per-render value in a registration hook's
  deps causes an infinite "Maximum update depth" loop.
- **Border shorthand vs longhand.** Don't mix the `border` shorthand with
  longhand props across a rerender — React warns.

---

License: MIT.
</content>
