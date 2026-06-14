/**
 * Color presets — built-in theme presets (from tokens.js) plus user-defined
 * custom presets saved in localStorage. A custom preset is a base theme id +
 * a set of token overrides; applying it sets the theme then overrides those
 * CSS variables live.
 *
 *   listPresets()                       → [{id,label,builtin,base,overrides}]
 *   applyPreset(id)                     → set theme + apply overrides
 *   saveCustomPreset(label, base, overrides)
 *   deleteCustomPreset(id)
 *   setTokenOverride(name, value)       → live single-token override (not saved)
 *   getActivePreset() / setActivePreset(id)
 */
import { THEMES, TOKENS } from './tokens.js'
import { setTheme } from './applyTheme.js'

const STORE = 'lilak-ui-custom-presets'
const ACTIVE = 'lilak-ui-active-preset'

/**
 * Built-in presets that ship with the kit (beyond the raw bright/dark/lowcontrast
 * themes). A preset's "main color" defines BOTH the accent tokens (buttons,
 * links, focus, info) AND the top bar + bottom command bar (nav-* tokens) — the
 * bars take on the theme's main color.
 *
 * Teal (#0d9488 family): teal bars + teal accents on a bright base.
 */
const TEAL = {
  // accents
  'btn-primary-bg': '#0d9488', 'btn-primary-hover': '#0f766e', 'btn-primary-text': '#ffffff',
  'text-link': '#0d9488', 'text-link-hover': '#0f766e',
  'border-focus': '#0d9488', 'input-focus-border': '#0d9488',
  'info-bg': '#ccfbf1', 'info-text': '#0f766e',
  'selection-bg': 'rgba(13,148,136,0.28)',
  // top bar + bottom command bar = the main color
  'nav-bg': '#0d9488', 'nav-border': '#0f766e', 'nav-accent': '#0f766e',
  'nav-text': '#ffffff', 'nav-text-muted': '#a7f3e4',
}

export const BUILTIN_PRESETS = [
  { id: 'teal', label: 'Teal', base: 'bright', overrides: TEAL },
]

function readCustom() {
  if (typeof localStorage === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(STORE) || '[]') } catch { return [] }
}
function writeCustom(list) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORE, JSON.stringify(list))
}

export function listPresets() {
  const themes = THEMES.map((t) => ({ id: t.id, label: t.label, builtin: true, base: t.id, overrides: {} }))
  const shipped = BUILTIN_PRESETS.map((p) => ({ ...p, builtin: true }))
  const custom = readCustom().map((p) => ({ ...p, builtin: false }))
  return [...themes, ...shipped, ...custom]
}

export function getActivePreset() {
  if (typeof localStorage === 'undefined') return THEMES[0].id
  return localStorage.getItem(ACTIVE) || THEMES[0].id
}
export function setActivePreset(id) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(ACTIVE, id)
}

/** Clear any live single-token overrides on the root element. */
export function clearOverrides() {
  if (typeof document === 'undefined') return
  const style = document.documentElement.style
  for (const name of Object.keys(TOKENS)) style.removeProperty(`--${name}`)
}

/** Live-override one token (does not persist). */
export function setTokenOverride(name, value) {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty(`--${name}`, value)
}

/** Apply a preset by id: set its base theme, clear old overrides, apply its own. */
export function applyPreset(id) {
  const preset = listPresets().find((p) => p.id === id) || listPresets()[0]
  setTheme(preset.base)
  clearOverrides()
  for (const [name, value] of Object.entries(preset.overrides || {})) setTokenOverride(name, value)
  setActivePreset(preset.id)
  return preset
}

export function saveCustomPreset(label, base, overrides) {
  const list = readCustom()
  const id = 'custom-' + Date.now()
  list.push({ id, label, base, overrides: { ...overrides } })
  writeCustom(list)
  return id
}

export function deleteCustomPreset(id) {
  writeCustom(readCustom().filter((p) => p.id !== id))
}
