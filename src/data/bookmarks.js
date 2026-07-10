/**
 * Bookmarks — a tiny localStorage-backed star set, shared across every data
 * component. Any DataCard can be starred; the command-bar `*` index then gathers
 * all currently-registered entries whose id is starred (across all kinds).
 *
 * Ids match the tag-index entry id (e.g. `file:12`, `log:5`).
 */
import { useEffect, useReducer } from 'react'

// Storage key. Every LILAK app is served from ONE origin behind the portal, so a
// single global key makes a star on `file:12` in one service show up starred in
// every other (and across a service's projects). `setBookmarkScope` namespaces it
// per app/project. Default stays the global key for backward compatibility.
let key = 'lilak.bookmarks'
const subs = new Set()

function read() {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')) } catch { return new Set() }
}
let cache = read()

function write(set) {
  cache = set
  try { localStorage.setItem(key, JSON.stringify([...set])) } catch { /* ignore */ }
  subs.forEach((f) => f())
}

/**
 * Namespace the bookmark set for this app/project. Call ONCE at startup with a
 * stable, app-unique scope (e.g. the service name or the portal base path, which
 * encodes service + project). Idempotent; re-reads the scoped set and notifies
 * subscribers so any mounted UI reflects the switch. Pass a falsy scope to reset
 * to the shared global key.
 */
export function setBookmarkScope(scope) {
  const next = scope ? `lilak.bookmarks:${scope}` : 'lilak.bookmarks'
  if (next === key) return
  key = next
  cache = read()
  subs.forEach((f) => f())
}

export function getBookmarks() { return cache }
export function isBookmarked(id) { return cache.has(String(id)) }
export function toggleBookmark(id) {
  const k = String(id)
  const next = new Set(cache)
  if (next.has(k)) next.delete(k); else next.add(k)
  write(next)
  return next.has(k)
}
export function subscribeBookmarks(fn) { subs.add(fn); return () => subs.delete(fn) }

/** React hook: re-renders on bookmark changes. `{ has, toggle, all }`. */
export function useBookmarks() {
  const [, force] = useReducer((x) => x + 1, 0)
  useEffect(() => subscribeBookmarks(force), [])
  return { has: isBookmarked, toggle: toggleBookmark, all: getBookmarks() }
}
