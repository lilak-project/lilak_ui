/**
 * ── Theme runtime ──────────────────────────────────────────────────────────
 *
 * Generates the CSS custom properties for every theme directly from
 * `tokens.js` and injects them into the document. This removes the manual
 * "keep index.css in sync with tokens.js" step that the original elog app
 * had to maintain by hand — tokens.js is now the single source of truth.
 *
 * Usage (once, at app startup):
 *   import { applyTheme, setTheme } from 'lilak-ui'
 *   applyTheme()            // inject :root + [data-theme="…"] var blocks
 *   setTheme('dark')        // switch theme (persists to localStorage)
 */
import { TOKENS, THEMES } from './tokens.js'

const STYLE_ID = 'lilak-ui-theme-vars'
const FONT_ID = 'lilak-ui-fonts'
const STORAGE_KEY = 'lilak-ui-theme'

/** Per-language sans stacks: Korean → Pretendard, English → IBM Plex Sans.
 *  Both list the other as fallback so mixed text always renders. */
export const SANS_BY_LANG = {
  ko: "Pretendard, 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  en: "'IBM Plex Sans', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
}
const SANS_DEFAULT = SANS_BY_LANG.ko

export const FONT_DEFAULTS = {
  '--font-sans': SANS_DEFAULT,
  // D2Coding: Korean-aware coding font; JetBrains Mono / system mono as fallback
  '--font-mono': "'D2 coding', 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  '--radius-md': '8px',
  '--radius-lg': '10px',
}

/** Set the sans stack for the active language (ko → Pretendard, en → IBM Plex Sans). */
export function applyLangFont(lang) {
  if (typeof document === 'undefined') return
  const stack = SANS_BY_LANG[lang] ?? SANS_DEFAULT
  document.documentElement.style.setProperty('--font-sans', stack)
}

/** Load Pretendard + IBM Plex Sans + D2Coding (+ JetBrains Mono) from jsDelivr,
 *  AND make the themed sans stack the document-wide default font. Idempotent.
 *
 *  Defines the `--font-sans` / `--font-mono` (+ radius) tokens if the app hasn't
 *  already, then sets `<html style="font-family: var(--font-sans)">` so every
 *  card and component inherits Pretendard / IBM Plex Sans instead of the host's
 *  CSS-reset system font. Pass `{ setDefault: false }` to load files only. */
export function loadFonts({ pretendard = true, ibmPlexSans = true, d2coding = true, jetbrainsMono = true, setDefault = true } = {}) {
  if (typeof document === 'undefined') return
  const links = []
  if (pretendard) links.push('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css')
  if (ibmPlexSans) links.push('https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-sans/index.css')
  if (d2coding) links.push('https://cdn.jsdelivr.net/gh/Joungkyun/font-d2coding/d2coding.css')
  if (jetbrainsMono) links.push('https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono/index.css')
  for (const href of links) {
    const id = 'lilak-ui-font-' + href.length
    if (document.getElementById(id)) continue
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  }
  if (setDefault) {
    const root = document.documentElement
    // Define the font tokens if the app hasn't, so var(--font-sans) resolves…
    for (const [k, v] of Object.entries(FONT_DEFAULTS)) {
      if (!root.style.getPropertyValue(k)) root.style.setProperty(k, v)
    }
    // …then make it the document default (overrides the host's system-ui reset).
    root.style.fontFamily = 'var(--font-sans)'
  }
}

/** Build the full CSS string of `[data-theme="…"] { --token: value; }` blocks. */
export function buildThemeCSS() {
  const blocks = []
  for (const { id } of THEMES) {
    const lines = []
    for (const [name, def] of Object.entries(TOKENS)) {
      const value = def[id]
      if (value != null) lines.push(`  --${name}: ${value};`)
    }
    // First theme also seeds :root so vars exist before any data-theme is set.
    const selector = id === THEMES[0].id ? `:root, [data-theme="${id}"]` : `[data-theme="${id}"]`
    blocks.push(`${selector} {\n${lines.join('\n')}\n}`)
  }
  return blocks.join('\n\n')
}

/** Inject (or refresh) the theme variable <style> block. Idempotent.
 *  Pass { fonts: false } to skip loading the web fonts. */
export function applyTheme({ fonts = true } = {}) {
  if (typeof document === 'undefined') return
  let el = document.getElementById(STYLE_ID)
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    document.head.appendChild(el)
  }
  // Base block holds typography/radius defaults; theme blocks hold colors.
  const fontVars = Object.entries(FONT_DEFAULTS).map(([k, v]) => `  ${k}: ${v};`).join('\n')
  el.textContent = `:root {\n${fontVars}\n}\n\n` + buildThemeCSS()
  if (fonts) loadFonts()
  setTheme(getTheme())
}

/** Current theme id (localStorage → default first theme). */
export function getTheme() {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && THEMES.some((t) => t.id === saved)) return saved
  }
  return THEMES[0].id
}

/** Switch theme: sets <html data-theme> and persists. */
export function setTheme(id) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = id
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, id)
}

/** Convenience: cycle to the next theme in THEMES order. Returns the new id. */
export function cycleTheme() {
  const order = THEMES.map((t) => t.id)
  const next = order[(order.indexOf(getTheme()) + 1) % order.length]
  setTheme(next)
  return next
}
