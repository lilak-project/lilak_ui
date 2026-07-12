/**
 * Kit smoke test — the cheapest safety net for a source-distributed kit consumed
 * by ~6 apps at once. It does NOT prove correctness; it catches the failure that
 * used to only surface when some consumer's dev server crashed: a broken import in
 * the barrel chain, an accidentally-removed export, or a component that throws at
 * render with trivial props. Run it (and the fleet build) before calling a kit
 * edit done. Extend with real assertions as behaviour is nailed down.
 */
import { describe, it, expect, vi } from 'vitest'
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
  'setBookmarkScope',
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
  'Rail',
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
    ['Rail', <kit.Rail items={[{ id: 'a', label: 'A', icon: 'check' }, { type: 'divider' }, { id: 'b', label: 'B', icon: 'gear' }]}
                       panels={{ a: <span>panel A</span>, b: <span>panel B</span> }} />],
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

// Regression guards for the two portal-hygiene fixes.
describe('bookmark scoping', () => {
  it('isolates the star set per scope', () => {
    // Node 26 ships an experimental global localStorage that can be non-functional
    // in the test env and shadow jsdom's; stub a working in-memory one so this
    // exercises real persistence (bookmarks are localStorage-backed).
    const store = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    })
    kit.setBookmarkScope('svcA')
    kit.toggleBookmark('file:12')
    expect(kit.isBookmarked('file:12')).toBe(true)
    kit.setBookmarkScope('svcB')                 // different app → clean set
    expect(kit.isBookmarked('file:12')).toBe(false)
    kit.setBookmarkScope('svcA')                 // back → star preserved
    expect(kit.isBookmarked('file:12')).toBe(true)
    kit.toggleBookmark('file:12')                // cleanup
    kit.setBookmarkScope(null)
    vi.unstubAllGlobals()
  })
})

describe('loadFonts', () => {
  it('makes no CDN requests when cdn:false and never sets an inline root font', () => {
    kit.loadFonts({ cdn: false })
    const links = [...document.querySelectorAll('link[href]')]
    expect(links.some((l) => l.href.includes('jsdelivr'))).toBe(false)
    // default font applied via an overridable <style>, not an inline root style
    expect(document.getElementById('lilak-ui-font-default')).not.toBeNull()
    expect(document.documentElement.style.fontFamily).toBe('')
  })
})
