/**
 * Identity — who is working, for attributing log entries.
 *
 * Two modes:
 *   • name-only (default): no real login; the user just sets a display name.
 *     Persisted to localStorage so logs record who made them.
 *   • backed auth: pass an `auth` object (e.g. an elog AuthProvider adapter)
 *     to drive `user`, `login`, `logout` from a real backend.
 *
 *   <IdentityProvider defaultName="anonymous">
 *     <App/>
 *   </IdentityProvider>
 *
 *   const { name, setName, user, isAuthenticated, login, logout } = useIdentity()
 *
 * For a real login later, wrap with your auth and pass it in:
 *   <IdentityProvider auth={elogAuthAdapter}>…</IdentityProvider>
 * where auth = { user, login(username,password), logout() }.
 */
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

const IdentityContext = createContext(null)
const STORAGE_KEY = 'lilak-ui-username'

export function IdentityProvider({ defaultName = 'anonymous', auth = null, children }) {
  const [name, setNameState] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return saved
    }
    return defaultName
  })

  useEffect(() => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, name)
  }, [name])

  const setName = useCallback((n) => { if (n && n.trim()) setNameState(n.trim()) }, [])

  // When backed by real auth, the logged-in username wins as the display name.
  const user = auth?.user ?? null
  const displayName = user?.username ?? name

  const value = useMemo(() => ({
    name: displayName,
    setName,
    user,
    isAuthenticated: !!user,
    login: auth?.login ?? null,
    logout: auth?.logout ?? null,
    hasAuth: !!auth,
  }), [displayName, setName, user, auth])

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
}

export function useIdentity() {
  const ctx = useContext(IdentityContext)
  if (!ctx) return { name: 'anonymous', setName: () => {}, user: null, isAuthenticated: false, login: null, logout: null, hasAuth: false }
  return ctx
}
