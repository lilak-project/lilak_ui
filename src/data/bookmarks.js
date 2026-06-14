/**
 * Bookmarks — a tiny localStorage-backed star set, shared across every data
 * component. Any DataCard can be starred; the command-bar `*` index then gathers
 * all currently-registered entries whose id is starred (across all kinds).
 *
 * Ids match the tag-index entry id (e.g. `file:12`, `log:5`).
 */
import { useEffect, useReducer } from 'react'

const KEY = 'lilak.bookmarks'
const subs = new Set()

function read() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')) } catch { return new Set() }
}
let cache = read()

function write(set) {
  cache = set
  try { localStorage.setItem(KEY, JSON.stringify([...set])) } catch { /* ignore */ }
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
