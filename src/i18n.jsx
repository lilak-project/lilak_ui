/**
 * i18n — dictionary-based translation, the way elog does it, shared by every
 * LILAK screen.
 *
 * Every UI string lives in a per-language dictionary under a key; switching
 * the language swaps which dictionary `t(key)` reads from. Values may be
 * functions for interpolation: `page_info: (p, n) => \`Page ${p} of ${n}\``.
 * Adding a language is adding one dictionary per module — nothing else.
 *
 * Dictionaries are REGISTERED, not passed around: the portal, the rack kit and
 * each rack service add their own at import time, and one registry answers
 * all of them. So a string can be translated where there is no component to
 * hold a context — a field's label in a service definition, a check message:
 *
 *   addStrings({ ko: { hello: '안녕' }, en: { hello: 'Hello' } })
 *   tr('hello')                       // anywhere — the active language
 *
 *   <LangProvider defaultLang="ko">   // decides the language, re-renders on change
 *     <App />
 *   </LangProvider>
 *   const { t, lang, setLang, toggle, langs } = useLang()
 *
 * The choice is kept under one localStorage key for every app on the origin,
 * and a provider follows a change made in another tab or frame — pick English
 * in the portal and the rack service beside it turns English too.
 */
import { Fragment, createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { applyLangFont } from './theme/applyTheme.js'

const LangContext = createContext(null)
export const LANG_KEY = 'lilak-ui-lang'
const FALLBACK = 'en'

/** lang → key → string | (...args) => string. One for the whole page. */
const REG = {}
let ACTIVE = readSaved() || (typeof document !== 'undefined' && document.documentElement.lang) || FALLBACK

/** Add (or override) strings: `{ ko: {...}, en: {...}, ja: {...} }`. */
export function addStrings(dicts) {
  for (const [lang, d] of Object.entries(dicts || {})) REG[lang] = { ...(REG[lang] || {}), ...d }
}

/** The active language's string for `key` — then English, then Korean, then
 *  the key itself, so a missing entry shows up as its key rather than nothing. */
export function tr(key, ...args) {
  const val = REG[ACTIVE]?.[key] ?? REG[FALLBACK]?.[key] ?? REG.ko?.[key] ?? key
  return typeof val === 'function' ? val(...args) : val
}

/** `tr` for a sentence with markup in it: the arguments may be React nodes
 *  (`trx('k', <b>{n}</b>)`), and the result is a fragment with each node set
 *  where its ${…} was. The dictionary entry is the same kind of function as
 *  for tr — a whole sentence, so each language can put the parts in its order. */
export function trx(key, ...args) {
  const MARK = (i) => `\u0000${i}\u0000`
  const text = tr(key, ...args.map((_, i) => MARK(i)))
  const parts = String(text).split(/\u0000(\d+)\u0000/)
  return <Fragment>{parts.map((p, i) => (i % 2 ? <Fragment key={i}>{args[Number(p)]}</Fragment> : p))}</Fragment>
}

export const langs = () => Object.keys(REG)
export const currentLang = () => ACTIVE

function readSaved() {
  try {
    if (typeof localStorage === 'undefined') return null
    // The portal kept its own key before; carry a choice made there over once.
    const v = localStorage.getItem(LANG_KEY) || localStorage.getItem('sm_lang')
    return v || null
  } catch { return null }
}

export function LangProvider({ dicts, defaultLang, fallbackLang, children }) {
  if (dicts) addStrings(dicts)
  const known = Object.keys(REG)
  const saved = readSaved()
  const initial = (saved && known.includes(saved) ? saved : null) ?? defaultLang ?? known[0] ?? FALLBACK
  const [lang, setLangState] = useState(initial)
  ACTIVE = lang                        // before children render, so tr() agrees with t()

  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, lang) } catch { /* private mode */ }
    if (typeof document !== 'undefined') document.documentElement.lang = lang
    applyLangFont(lang)
  }, [lang])

  // Another tab or frame on this origin picked a language: follow it.
  useEffect(() => {
    const on = (e) => { if (e.key === LANG_KEY && e.newValue && REG[e.newValue]) setLangState(e.newValue) }
    window.addEventListener('storage', on)
    return () => window.removeEventListener('storage', on)
  }, [])

  const setLang = useCallback((name) => { if (REG[name]) setLangState(name) }, [])
  const toggle = useCallback(() => {
    const ls = Object.keys(REG)
    setLangState((prev) => ls[(ls.indexOf(prev) + 1) % ls.length])
  }, [])
  const t = useCallback((key, ...args) => tr(key, ...args), [lang])  // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => ({ lang, setLang, set: setLang, toggle, t, langs: Object.keys(REG), fallback: fallbackLang ?? FALLBACK }),
    [lang, setLang, toggle, t, fallbackLang])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) {
    // No provider: still translate, in whatever language was last chosen.
    return { lang: ACTIVE, setLang: () => {}, set: () => {}, toggle: () => {}, langs: Object.keys(REG), t: tr }
  }
  return ctx
}
