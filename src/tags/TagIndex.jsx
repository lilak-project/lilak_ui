/**
 * TagIndexProvider + hooks — reusable hash-tag search across the app.
 *
 *   <TagIndexProvider>… app …</TagIndexProvider>
 *
 * A searchable component registers itself (or a batch of items):
 *   useTaggable({ id: `log:${log.id}`, label: log.title, tags: log.tags.map(t=>t.name),
 *                 kind: 'log', run: () => openLog(log.id) })
 *   useTaggables(() => entries, [deps])
 *
 * Consumers query the live index:
 *   const { search, tagCounts, entries } = useTagIndex()
 *   const hits = search('#run18 calibration')
 *
 * Like the command registry, the context value is the STABLE store so the
 * registration hooks don't re-register in a loop; the read hook subscribes.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { createTagStore } from './index.js'

const Ctx = createContext(null)

export function TagIndexProvider({ children }) {
  const storeRef = useRef(null)
  if (!storeRef.current) storeRef.current = createTagStore()
  return <Ctx.Provider value={storeRef.current}>{children}</Ctx.Provider>
}

const EMPTY = []
function emptySnap() { return EMPTY }
function noopSub() { return () => {} }

export function useTagIndex() {
  const store = useContext(Ctx)
  const entries = useSyncExternalStore(
    store ? store.subscribe : noopSub,
    store ? store.getSnapshot : emptySnap,
    store ? store.getSnapshot : emptySnap,
  )
  return useMemo(() => ({
    store,
    entries,
    search: (q, limit) => (store ? store.search(q, limit) : []),
    tagCounts: () => (store ? store.tagCounts() : new Map()),
  }), [store, entries])
}

/** Register a single searchable entry for the lifetime of the component. */
export function useTaggable(entry, deps = []) {
  const store = useContext(Ctx)
  useEffect(() => {
    if (!store || !entry) return
    return store.add(entry)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, ...deps])
}

/** Register many entries (factory keeps them fresh across deps). */
export function useTaggables(factory, deps = []) {
  const store = useContext(Ctx)
  useEffect(() => {
    if (!store) return
    const list = typeof factory === 'function' ? factory() : factory
    return store.addMany(list || [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, ...deps])
}
