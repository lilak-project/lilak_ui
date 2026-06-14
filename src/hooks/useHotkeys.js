/**
 * useHotkeys — register global keyboard shortcuts for navigation/commands.
 *
 *   useHotkeys({
 *     '/':      () => openCommandBar(),     // focus the bottom bar
 *     'g h':    () => goto('home'),         // chord: press g then h
 *     'mod+k':  () => openPalette(),        // ⌘K / Ctrl+K
 *     '?':      () => showShortcuts(),
 *     'Escape': () => closeAll(),
 *   })
 *
 * Key syntax:
 *   - single key:      'a', '/', '?', 'Escape', 'ArrowDown'
 *   - modifiers:       'mod+k' (⌘ on mac / Ctrl elsewhere), 'shift+/', 'alt+n', 'ctrl+s'
 *   - chords (vim):    'g h'  (space-separated, pressed in sequence within ~800ms)
 *
 * By default, shortcuts are ignored while typing in an input/textarea/select or
 * contenteditable, EXCEPT 'Escape' and any binding that includes a modifier.
 * Pass { enableOnFormTags: true } to override.
 */
import { useEffect, useRef } from 'react'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

function normalizeEvent(e) {
  const parts = []
  if (e.metaKey && isMac) parts.push('mod')
  if (e.ctrlKey && !isMac) parts.push('mod')
  if (e.ctrlKey && isMac) parts.push('ctrl')
  if (e.metaKey && !isMac) parts.push('meta')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey && e.key.length > 1) parts.push('shift') // shift+Named; for chars shift is in the char
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
  parts.push(key)
  return parts.join('+')
}

function inFormField(e) {
  const el = e.target
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export function useHotkeys(map, { enableOnFormTags = false, deps = [] } = {}) {
  const mapRef = useRef(map)
  mapRef.current = map
  const chordRef = useRef({ prefix: '', timer: null })

  useEffect(() => {
    function onKeyDown(e) {
      const combo = normalizeEvent(e)
      const hasModifier = e.metaKey || e.ctrlKey || e.altKey
      const typing = inFormField(e)
      const bindings = mapRef.current || {}

      // chord continuation (e.g. after 'g', expect 'h')
      const c = chordRef.current
      if (c.prefix) {
        const chordKey = `${c.prefix} ${e.key.toLowerCase()}`
        clearTimeout(c.timer)
        c.prefix = ''
        if (bindings[chordKey]) { e.preventDefault(); bindings[chordKey](e); return }
      }

      // exact combo match
      const handler = bindings[combo] || bindings[e.key]
      if (handler) {
        if (typing && !enableOnFormTags && !hasModifier && e.key !== 'Escape') return
        e.preventDefault()
        handler(e)
        return
      }

      // start a chord if some binding begins with this single key + space
      if (!hasModifier && e.key.length === 1) {
        const prefix = e.key.toLowerCase()
        const startsChord = Object.keys(bindings).some((k) => k.startsWith(prefix + ' '))
        if (startsChord && !(typing && !enableOnFormTags)) {
          c.prefix = prefix
          c.timer = setTimeout(() => { c.prefix = '' }, 800)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** Pretty-print a binding for display: 'mod+k' -> '⌘K' / 'Ctrl+K'. */
export function prettyKey(binding) {
  return binding
    .split(' ')
    .map((combo) =>
      combo.split('+').map((p) =>
        p === 'mod' ? (isMac ? '⌘' : 'Ctrl')
        : p === 'meta' ? '⌘'
        : p === 'ctrl' ? 'Ctrl'
        : p === 'alt' ? (isMac ? '⌥' : 'Alt')
        : p === 'shift' ? '⇧'
        : p.length === 1 ? p.toUpperCase() : p,
      ).join(isMac ? '' : '+'),
    )
    .join(' ')
}
