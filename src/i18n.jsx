/**
 * i18n — dictionary-based translation with a React context.
 *
 * Every UI string lives in a per-language dictionary object; switching the
 * language swaps which dictionary `t(key)` reads from. Values may be functions
 * for interpolation: `page_info: (p, n) => \`Page ${p} of ${n}\``.
 *
 *   // app sets up its dictionaries (any languages, any keys):
 *   const dicts = { en: { hello: 'Hello' }, ko: { hello: '안녕' } }
 *
 *   <LangProvider dicts={dicts} defaultLang="ko">
 *     <App />
 *   </LangProvider>
 *
 *   const { t, lang, setLang, toggle, langs } = useLang()
 *   <span>{t('hello')}</span>
 *   <span>{t('page_info', page, total)}</span>
 */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

const LangContext = createContext(null)
const STORAGE_KEY = 'lilak-ui-lang'

export function LangProvider({ dicts = {}, defaultLang, fallbackLang, children }) {
  const langs = Object.keys(dicts)
  const fallback = fallbackLang ?? langs[0]
  const initial = defaultLang ?? readSaved(langs) ?? langs[0]
  const [lang, setLangState] = useState(initial)

  useEffect(() => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, lang)
    if (typeof document !== 'undefined') document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((name) => { if (dicts[name]) setLangState(name) }, [dicts])
  const toggle = useCallback(() => {
    setLangState((prev) => langs[(langs.indexOf(prev) + 1) % langs.length])
  }, [langs])

  const t = useCallback((key, ...args) => {
    const val = dicts[lang]?.[key] ?? dicts[fallback]?.[key] ?? key
    return typeof val === 'function' ? val(...args) : val
  }, [dicts, lang, fallback])

  const value = useMemo(() => ({ lang, setLang, toggle, t, langs }), [lang, setLang, toggle, t, langs])
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

function readSaved(langs) {
  if (typeof localStorage === 'undefined') return null
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved && langs.includes(saved) ? saved : null
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) {
    // Graceful fallback when no provider: identity translation.
    return { lang: 'en', setLang: () => {}, toggle: () => {}, langs: ['en'], t: (k) => k }
  }
  return ctx
}
