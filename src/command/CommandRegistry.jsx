/**
 * CommandRegistryProvider + hooks — the "connector" the user asked for.
 *
 * Wrap the app once:
 *   <CommandRegistryProvider>… app …</CommandRegistryProvider>
 *
 * Any component then self-registers commands / shortcuts that auto-wire into the
 * CommandBar, the global hotkey handler, and the ShortcutsModal:
 *
 *   useCommand({ id: 'log new', title: 'New log', hotkey: 'n', run: () => openNew() })
 *   useCommands(() => myList, [deps])          // register many at once
 *   useShortcut('[', () => prevTab())          // bare key, no command-line entry
 *
 * Read the live registry:
 *   const reg = useCommandRegistry()           // { commands, shortcuts, run, store }
 *
 * The context value is the STABLE store (its identity never changes), so the
 * registration hooks can depend on it without causing re-register loops. The
 * read hook subscribes to the store internally for live data.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { createCommandStore } from './registry.js'
import { useHotkeys } from '../hooks/useHotkeys.js'

const Ctx = createContext(null)

/** Installs the global hotkey handler from the live registry snapshot. */
function HotkeyBridge({ store }) {
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const hotkeyMap = useMemo(() => {
    const m = {}
    for (const c of snap.commands) if (c.hotkey) m[c.hotkey] = () => c.run?.()
    for (const s of snap.shortcuts) if (s.combo) m[s.combo] = (e) => s.fn?.(e)
    return m
  }, [snap])
  useHotkeys(hotkeyMap, { deps: [hotkeyMap] })
  return null
}

export function CommandRegistryProvider({ children }) {
  const storeRef = useRef(null)
  if (!storeRef.current) storeRef.current = createCommandStore()
  const store = storeRef.current
  return (
    <Ctx.Provider value={store}>
      <HotkeyBridge store={store} />
      {children}
    </Ctx.Provider>
  )
}

/** Reactive read of the registry (re-renders the caller on changes). */
export function useCommandRegistry() {
  const store = useContext(Ctx)
  const snap = useSyncExternalStore(
    store ? store.subscribe : noopSub,
    store ? store.getSnapshot : emptySnap,
    store ? store.getSnapshot : emptySnap,
  )
  return useMemo(() => ({
    store,
    commands: snap.commands,
    shortcuts: snap.shortcuts,
    run: (id, arg) => store?.run(id, arg),
  }), [store, snap])
}

const EMPTY = { commands: [], shortcuts: [] }
function emptySnap() { return EMPTY }
function noopSub() { return () => {} }

/** The stable store (no subscription) — for registration hooks' deps. */
function useStore() { return useContext(Ctx) }

/** Register a single command for the lifetime of the calling component. */
export function useCommand(cmd, deps = []) {
  const store = useStore()
  useStableEffect(store, () => {
    if (!store) return
    const c = typeof cmd === 'function' ? cmd() : cmd
    return store.addCommand(c)
  }, deps)
}

/** Register a list of commands (factory keeps them fresh across deps). */
export function useCommands(factory, deps = []) {
  const store = useStore()
  useStableEffect(store, () => {
    if (!store) return
    const list = typeof factory === 'function' ? factory() : factory
    return store.addCommands(list || [])
  }, deps)
}

/** Register a bare key→fn shortcut (no command-line entry). */
export function useShortcut(combo, fn, deps = [], label) {
  const store = useStore()
  useStableEffect(store, () => {
    if (!store) return
    return store.addShortcut(combo, fn, label)
  }, [combo, ...deps])
}

// Small wrapper so all registration hooks share the same effect shape and the
// store (stable) is the only "framework" dependency.
function useStableEffect(store, effect, deps) {
  useEffect(() => {
    return effect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, ...deps])
}
