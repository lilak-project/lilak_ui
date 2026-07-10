/**
 * Kit smoke test — the cheapest safety net for a source-distributed kit consumed
 * by ~6 apps at once. It does NOT prove correctness; it catches the failure that
 * used to only surface when some consumer's dev server crashed: a broken import in
 * the barrel chain, an accidentally-removed export, or a component that throws at
 * render with trivial props. Run it (and the fleet build) before calling a kit
 * edit done. Extend with real assertions as behaviour is nailed down.
 */
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import * as kit from '../index.js'

// Every name the barrel is contracted to export. Removing one is a breaking change
// for some consumer; this list makes that break loud and local instead of remote.
const EXPORTS = [
  // theme
  'TOKENS', 'TOKEN_GROUPS', 'THEMES', 'applyTheme', 'buildThemeCSS', 'setTheme',
  'loadFonts', 'applyPreset', 'listPresets', 'uiStyles', 'hoverify',
  // i18n / commands / identity
  'LangProvider', 'useLang', 'useHotkeys', 'defineCommands', 'IdentityProvider',
  'useIdentity', 'CommandRegistryProvider', 'useCommandRegistry',
  // data
  'DataCard', 'DataGrid', 'makeDataFindModes', 'getBookmarks', 'toggleBookmark',
  // layout
  'Box', 'Stack', 'Row', 'Grid', 'Container', 'Spacer',
  // icons + crud
  'Icon', 'ICONS', 'CrudTable', 'CrudForm',
  // log system
  'Markdown', 'LogEntryCard', 'LogFeed', 'LogList', 'LogDetail', 'NumberEntryField',
  // components
  'Button', 'Input', 'Badge', 'Chip', 'ChipGroup', 'Callout', 'Card', 'Modal',
  'Tabs', 'SubTabs', 'DataTable', 'Menu', 'TopBar', 'CommandBar', 'Drawer',
  'Pagination', 'ShortcutsModal', 'AppShell', 'Community', 'Avatar', 'LoginForm',
]

describe('kit barrel', () => {
  it('exports every contracted name', () => {
    const missing = EXPORTS.filter((n) => kit[n] === undefined)
    expect(missing, `missing exports: ${missing.join(', ')}`).toEqual([])
  })
})

// Leaf components that need no provider context — render them with trivial props
// and assert they produce markup without throwing. This is where an import-time or
// render-time crash in the kit shows up immediately.
describe('leaf components render', () => {
  const cases = [
    ['Button', <kit.Button>ok</kit.Button>],
    ['Badge', <kit.Badge>1</kit.Badge>],
    ['Card', <kit.Card>body</kit.Card>],
    ['Callout', <kit.Callout>note</kit.Callout>],
    ['Chip', <kit.Chip>tag</kit.Chip>],
    ['Icon', <kit.Icon name="check" />],
    ['Input', <kit.Input value="" onChange={() => {}} />],
    ['Markdown', <kit.Markdown>{'**hi**'}</kit.Markdown>],
  ]
  it.each(cases)('%s renders to non-empty markup', (_name, el) => {
    const html = renderToStaticMarkup(el)
    expect(typeof html).toBe('string')
    expect(html.length).toBeGreaterThan(0)
  })
})

// buildThemeCSS is the heart of the token system — a smoke check it produces CSS.
describe('theme system', () => {
  it('buildThemeCSS emits CSS variables', () => {
    const css = kit.buildThemeCSS()
    expect(typeof css).toBe('string')
    expect(css).toContain('--')
  })
})
