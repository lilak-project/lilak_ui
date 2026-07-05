/**
 * AppShell — the kit's default application skeleton.
 *
 * Wires the chrome most LILAK apps share (as pioneered by lilak_elog and
 * lilak_gui) so a new app is a one-liner:
 *
 *   <CommandRegistryProvider> is NOT needed — AppShell provides it.
 *
 *   <AppShell
 *     brand="lilak" service="gui"          // two-line wordmark: lilak / gui
 *     tabs={[{id,label,icon}]} active={tab} onTab={setTab}
 *   >
 *     {tabContent}
 *   </AppShell>
 *
 * What it gives you, out of the box:
 *   • Top bar: lilak mark (dims in command mode) + two-line brand + optional
 *     project chip + tabs + right slot (status + account button).
 *   • `/` command bar (bottom), pre-registered with: help, system, theme,
 *     language, and one "go to <tab>" per tab. Pass more via `commands`.
 *   • `\` drawer — your `drawer` node, or a built-in settings panel
 *     (theme + language + account) when you don't pass one.
 *   • `?` shortcuts modal (reads the live registry).
 *   • Keys: `[` / `]` prev/next tab, `/` command bar, `\` drawer, `?` help.
 *   • Responsive: on phones the tabs fold into a ☰ pick-list (`tabsAsMenu`,
 *     default 'auto'; pass true/false to force).
 *
 * Strings are dict-independent: pass a `labels` object to localize the few
 * chrome strings (defaults are English). Tab labels come from `tabs`.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import TopBar from './TopBar.jsx'
import CommandBar from './CommandBar.jsx'
import Drawer from './Drawer.jsx'
import ShortcutsModal from './ShortcutsModal.jsx'
import Icon from '../icons.jsx'
import { Row, Stack } from '../layout/index.jsx'
import { useBreakpoint } from '../hooks/useBreakpoint.js'
import { CommandRegistryProvider, useCommandRegistry, useCommands, useShortcut } from '../command/CommandRegistry.jsx'
import { useLang } from '../i18n.jsx'
import { useIdentity } from '../identity.jsx'
import { THEMES } from '../theme/tokens.js'
import { getTheme, setTheme as kitSetTheme } from '../theme/applyTheme.js'

const DEFAULT_LABELS = {
  help: 'Shortcuts help',
  system: 'System',
  theme: 'Theme',
  language: 'Language',
  account: 'Account',
  notifications: 'Notifications',
  command: 'Type a command…',
  shortcuts: 'Keyboard shortcuts',
}

/** Small pill button used inside the built-in settings drawer. */
function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 30, padding: '0 12px', borderRadius: 8, cursor: 'pointer', fontSize: 'var(--fs-small, 12px)',
        borderWidth: 1, borderStyle: 'solid',
        borderColor: active ? 'var(--nav-text-muted)' : 'var(--nav-border)',
        backgroundColor: active ? 'var(--nav-text)' : 'var(--nav-accent)',
        color: active ? 'var(--nav-bg)' : 'var(--nav-text)',
        transition: 'background-color .12s, border-color .12s, color .12s',
      }}
    >{children}</button>
  )
}

function Section({ label, children }) {
  return (
    <Stack gap={8}>
      <div style={{ fontSize: 'var(--fs-micro, 10px)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--nav-text-muted)' }}>{label}</div>
      {children}
    </Stack>
  )
}

/** Default drawer content: account + theme + language. Styled for the dark
 *  nav-* palette (the drawer reads as the top bar dropping down).
 *  Optional: `accountAvatar` node + `accountMeta` line (e.g. an SSO profile), and
 *  an `onExit`/`exitLabel` action (e.g. "leave for the portal"). */
function DefaultDrawer({ L, accountName, accountAvatar, accountMeta, onExit, exitLabel,
  theme, setTheme, themes, lang, setLang, langs }) {
  const themeOpts = THEMES.filter((t) => themes.includes(t.id))
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '100%' }}>
      <div style={{ flex: 2, minWidth: 0, paddingRight: 18 }}>
        <Section label={L.notifications}>
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--nav-text-muted)', fontSize: 'var(--fs-body, 13px)' }}>—</div>
        </Section>
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingLeft: 18, borderLeft: '1px solid var(--nav-border)' }}>
        <Stack gap={14}>
          <Section label={L.account}>
            <Row gap={14} style={{ alignItems: 'center' }}>
              {accountAvatar}
              <Stack gap={3} style={{ minWidth: 0 }}>
                <span style={{ fontSize: 'var(--fs-large, 18px)', fontWeight: 700, color: 'var(--nav-text)', lineHeight: 1.15 }}>{accountName}</span>
                {accountMeta && <span style={{ fontSize: 'var(--fs-small, 12px)', color: 'var(--nav-text-muted)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{accountMeta}</span>}
              </Stack>
            </Row>
          </Section>
          {themeOpts.length > 1 && (
            <Section label={L.theme}>
              <Row gap={6} wrap>
                {themeOpts.map((t) => <Chip key={t.id} active={theme === t.id} onClick={() => setTheme(t.id)}>{t.label}</Chip>)}
              </Row>
            </Section>
          )}
          {langs.length > 1 && (
            <Section label={L.language}>
              <Row gap={6} wrap>
                {langs.map((l) => <Chip key={l} active={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</Chip>)}
              </Row>
            </Section>
          )}
          {onExit && (
            <button onClick={onExit}
              style={{ marginTop: 4, height: 34, padding: '0 14px', borderRadius: 8, cursor: 'pointer',
                fontSize: 'var(--fs-small, 12px)', fontWeight: 600, border: '1px solid var(--nav-border)',
                background: 'var(--nav-accent)', color: 'var(--nav-text)', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', gap: 7, alignSelf: 'flex-start' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--nav-text-muted)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--nav-border)' }}>
              <Icon name="logout" size={15} />{exitLabel || 'Exit'}
            </button>
          )}
        </Stack>
      </div>
    </div>
  )
}

function AppShellInner({
  brand = 'lilak',
  service,
  brandIcon = 'lilak',
  project,
  onProjectClick,
  tabs = [],
  active,
  onTab,
  status,
  accountName,
  accountIcon,         // top-bar account button leading node; pass `false` for name-only
  accountAvatar,       // optional node (e.g. SSO Avatar) shown in the drawer profile
  accountMeta,         // optional secondary line (e.g. email) in the drawer
  onAccountClick,
  onExit,              // optional: renders an "exit" action in the default drawer
  exitLabel,
  drawer,
  drawerHeight = 'half',
  // Bottom `/` command bar. On by default; pass false to drop it (and its launcher)
  // entirely — e.g. an app that doesn't want the collapsible bottom bar.
  commandBar = true,
  // 'auto' (default) folds tabs into a ☰ pick-list on phones; true/false forces it.
  tabsAsMenu = 'auto',
  themes = THEMES.map((t) => t.id),
  commands,
  extraShortcuts = [],
  labels,
  children,
}) {
  const L = { ...DEFAULT_LABELS, ...(labels || {}) }
  const { lang, setLang, langs } = useLang()
  const identity = useIdentity()
  const reg = useCommandRegistry()
  const { isPhone } = useBreakpoint()
  const foldTabs = tabsAsMenu === 'auto' ? isPhone : !!tabsAsMenu

  const [barOpen, setBarOpen] = useState(false)
  const [barLead, setBarLead] = useState('/')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [theme, setThemeState] = useState(getTheme())

  const setTheme = useCallback((th) => { kitSetTheme(th); setThemeState(th) }, [])
  const name = accountName ?? identity?.name ?? 'anonymous'

  // The drawer drops from the top bar; a tab change or opening the bar slides it up.
  useEffect(() => { setDrawerOpen(false) }, [active])
  useEffect(() => { if (barOpen) setDrawerOpen(false) }, [barOpen])

  // Stable signatures so command/shortcut registration (which updates registry
  // state) doesn't re-fire every render — an unstable dep here means an infinite
  // register → render → register loop.
  const tabsKey = tabs.map((tb) => `${tb.id}:${tb.label}`).join('|')
  const langsKey = langs.join(',')
  const themesKey = themes.join(',')
  const labelsKey = JSON.stringify(labels || {})

  const ids = useMemo(() => tabs.map((tb) => tb.id), [tabsKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const moveTab = useCallback((dir) => {
    const idx = ids.indexOf(active)
    const next = ids[Math.min(ids.length - 1, Math.max(0, idx + dir))]
    if (next != null) onTab?.(next)
  }, [ids, active, onTab])

  useShortcut('[', () => moveTab(-1), [moveTab], 'prev tab')
  useShortcut(']', () => moveTab(1), [moveTab], 'next tab')
  useShortcut('/', () => setBarOpen((o) => { if (!o) setBarLead('/'); return !o }), [], 'command bar')
  useShortcut('\\', () => setDrawerOpen((o) => !o), [], 'system panel')
  useShortcut('?', () => setShortcutsOpen((s) => !s), [], 'shortcuts help')

  // Caller-supplied bare shortcuts — registered in one effect (a hook loop would
  // break the rules of hooks when the array length changes). Keyed on the combo
  // list so a stable set doesn't re-register every render.
  const comboKey = extraShortcuts.map((s) => s.combo).join('|')
  useEffect(() => {
    if (!reg?.store) return
    const disposers = extraShortcuts.map((s) => reg.store.addShortcut(s.combo, s.fn, s.label))
    return () => disposers.forEach((d) => d && d())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reg, comboKey])

  useCommands(() => {
    const themeOpts = THEMES.filter((t) => themes.includes(t.id))
    const list = [
      { id: 'help', title: L.help, category: 'system', run: () => setShortcutsOpen(true) },
      { id: 'system', title: L.system, category: 'system', run: () => setDrawerOpen(true) },
    ]
    if (themeOpts.length > 1) {
      list.push({ id: 'theme', title: L.theme, category: 'view', keywords: 'color',
        args: themeOpts.map((t) => ({ value: t.id, label: t.label })), run: (arg) => arg && setTheme(arg) })
    }
    if (langs.length > 1) {
      list.push({ id: 'lang', title: L.language, category: 'view',
        args: langs.map((l) => ({ value: l, label: l.toUpperCase() })), run: (arg) => arg && setLang(arg) })
    }
    for (const tb of tabs) {
      list.push({ id: tb.id, title: tb.label, category: 'tab', keywords: tb.id, run: () => onTab?.(tb.id) })
    }
    const extra = typeof commands === 'function' ? commands() : commands
    if (Array.isArray(extra)) list.push(...extra)
    return list
  }, [labelsKey, langsKey, themesKey, tabsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Command-mode indicator: the lilak logo mark dims while a bar is open
  // (keyboard commands suspended). Only applied when brandIcon is an icon name.
  const logoColor = barOpen ? 'var(--nav-text-muted)' : 'var(--nav-text)'
  const iconNode = typeof brandIcon === 'string'
    ? <Icon name={brandIcon} size={30} color={logoColor} style={{ height: 30, width: 'auto', display: 'block', transition: 'color .15s' }} />
    : brandIcon

  const projectChip = project ? (
    <span role={onProjectClick ? 'button' : undefined} tabIndex={onProjectClick ? 0 : undefined}
      onClick={onProjectClick ? (e) => { e.stopPropagation(); onProjectClick() } : undefined}
      onKeyDown={onProjectClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onProjectClick() } } : undefined}
      style={{ marginLeft: 2, padding: '3px 8px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontWeight: 500,
        cursor: onProjectClick ? 'pointer' : 'default', fontSize: 'var(--fs-micro, 10px)', lineHeight: 1.2,
        backgroundColor: 'var(--nav-accent)', color: 'var(--nav-text-muted)' }}>{project}</span>
  ) : null

  const accountBtn = (
    <button
      onClick={onAccountClick || (() => setDrawerOpen((o) => !o))}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 10px', borderRadius: 8,
        background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--nav-text)',
        fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-tiny, 11px)' }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--nav-accent)' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
      title={`${L.system}  ( \\ )`}
    >
      {accountIcon === false ? null : (accountIcon || <Icon name="user" size={15} />)}<span>{name}</span>
    </button>
  )

  const drawerContent = drawer != null ? drawer : (
    <DefaultDrawer L={L} accountName={name} accountAvatar={accountAvatar} accountMeta={accountMeta}
      onExit={onExit} exitLabel={exitLabel} theme={theme} setTheme={setTheme} themes={themes}
      lang={lang} setLang={setLang} langs={langs} />
  )

  return (
    <div style={{ minHeight: '100vh', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface)', fontFamily: 'var(--font-sans)' }}>
      <TopBar
        brand={brand}
        brandSub={service}
        brandIcon={iconNode}
        brandSuffix={projectChip}
        tabs={tabs}
        active={active}
        onTab={onTab}
        tabsAsMenu={foldTabs}
        right={<>{status}{accountBtn}</>}
      />

      <main style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingBottom: 8 }}>{children}</main>

      {commandBar && (
        <CommandBar
          collapsible
          commands={reg?.commands || []}
          open={barOpen}
          onOpenChange={setBarOpen}
          openWith={barLead}
          onRun={(cmd, raw) => { if (!cmd && raw) reg?.run(raw) }}
          placeholder={L.command}
        />
      )}

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} height={drawerHeight}>
        {drawerContent}
      </Drawer>

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} title={L.shortcuts} />
    </div>
  )
}

/** AppShell provides its own command registry, so the app doesn't have to wrap
 *  it. Wrap the app in LangProvider / IdentityProvider for localized chrome and
 *  a real account name (both optional — sensible fallbacks otherwise). */
export default function AppShell(props) {
  return (
    <CommandRegistryProvider>
      <AppShellInner {...props} />
    </CommandRegistryProvider>
  )
}
