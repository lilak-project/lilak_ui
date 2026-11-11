/**
 * Select — a dropdown drawn in the page, written exactly like `<select>`:
 *
 *   <Select className="rl-in" value={v} onChange={(e) => set(e.target.value)}>
 *     <option value="a">A</option>
 *   </Select>
 *
 * Not the browser's own: in a portal service, once its native menu had closed
 * the next click on the page was lost (reproduced only by removing the menu —
 * the browser's reason is unknown).
 *
 * The list stays where it is in the DOM, so a modal's "clicked outside" check
 * still counts it as inside, and takes its look from the page around it. It is
 * `position: fixed` so an `overflow: hidden` pane or a table row can't clip it.
 */
import { Children, Fragment, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

function readOptions(children) {
  const rows = []
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return
    if (c.type === Fragment) rows.push(...readOptions(c.props.children))
    else if (c.type === 'optgroup') rows.push({ header: c.props.label }, ...readOptions(c.props.children))
    else if (c.type === 'option') {
      const label = Children.toArray(c.props.children).join('')
      if (!c.props.hidden) rows.push({ value: String(c.props.value ?? label), label, disabled: c.props.disabled })
    }
  })
  return rows
}

// The nearest background anyone actually painted.
function paintedBehind(el) {
  for (; el; el = el.parentElement) {
    const bg = getComputedStyle(el).backgroundColor
    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') return bg
  }
  return '#fff'
}

const tint = (pct) => `color-mix(in srgb, currentColor ${pct}%, transparent)`

export default function Select({ value, onChange, children, required, name, className = '', style, ...rest }) {
  const [open, setOpen] = useState(false)
  const [at, setAt] = useState(-1)
  const btn = useRef(null)
  const menu = useRef(null)
  const typed = useRef({ s: '', t: 0 })
  const listId = useId()

  const rows = readOptions(children)
  const can = (i) => !!rows[i] && !rows[i].header && !rows[i].disabled
  const cur = String(value ?? '')
  const found = rows.findIndex((r) => !r.header && r.value === cur)
  // A value with no option shows the first one, as a <select> does.
  const shown = found >= 0 ? found : rows.findIndex((_, i) => can(i))

  const toggle = () => {
    if (open) return setOpen(false)
    btn.current.focus({ preventScroll: true })
    setAt(shown)
    setOpen(true)
  }
  const choose = (i) => {
    setOpen(false)
    if (rows[i].value === cur) return
    const target = { value: rows[i].value, name }
    onChange?.({ target, currentTarget: target })
  }
  const go = (i) => {
    setAt(i)
    menu.current?.children[i]?.scrollIntoView?.({ block: 'nearest' })
  }
  const step = (from, d) => {
    for (let i = from + d; i >= 0 && i < rows.length; i += d) if (can(i)) return go(i)
  }

  const onKey = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); toggle() }
      return
    }
    // Native too: a window-level shortcut or a modal's Esc belongs to the list while it is open.
    e.stopPropagation()
    e.nativeEvent.stopPropagation()
    if (e.key === 'Tab') return setOpen(false)
    if (e.key.length > 1 && !['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', 'Escape'].includes(e.key)) return
    if (e.metaKey || e.ctrlKey) return
    e.preventDefault()
    if (e.key === 'ArrowDown') step(at, 1)
    else if (e.key === 'ArrowUp') step(at, -1)
    else if (e.key === 'Home') step(-1, 1)
    else if (e.key === 'End') step(rows.length, -1)
    else if (e.key === 'Enter' || e.key === ' ') { if (can(at)) choose(at) }
    else if (e.key === 'Escape') setOpen(false)
    else {
      const t = typed.current
      const now = Date.now()
      t.s = (now - t.t > 700 ? '' : t.s) + e.key.toLowerCase()
      t.t = now
      const hit = rows.findIndex((r, i) => can(i) && r.label.toLowerCase().startsWith(t.s))
      if (hit >= 0) go(hit)
    }
  }

  // Before paint. The menu starts at 0,0, so where it actually lands is the
  // offset of any transformed ancestor that fixed positioning is relative to.
  useLayoutEffect(() => {
    if (!open) return
    const m = menu.current
    const r = btn.current.getBoundingClientRect()
    const zero = m.getBoundingClientRect()
    const cs = getComputedStyle(btn.current)
    const around = btn.current.parentElement
    m.style.fontFamily = cs.fontFamily
    m.style.fontSize = cs.fontSize
    m.style.background = paintedBehind(around)
    m.style.color = getComputedStyle(around).color
    m.style.minWidth = `${r.width}px`
    const below = window.innerHeight - r.bottom
    const up = m.offsetHeight > below && r.top > below
    m.style.maxHeight = `${Math.max(120, (up ? r.top : below) - 8)}px`
    m.style.left = `${Math.max(4, Math.min(r.left, window.innerWidth - m.offsetWidth - 4)) - zero.left}px`
    m.style.top = `${(up ? r.top - m.offsetHeight : r.bottom) - zero.top}px`
    m.children[shown]?.scrollIntoView?.({ block: 'nearest' })
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const shut = () => setOpen(false)
    const away = (e) => { if (!btn.current?.contains(e.target) && !menu.current?.contains(e.target)) shut() }
    const scrolled = (e) => { if (!menu.current?.contains(e.target)) shut() }
    document.addEventListener('pointerdown', away, true)
    window.addEventListener('scroll', scrolled, true)
    window.addEventListener('resize', shut)
    window.addEventListener('blur', shut)
    return () => {
      document.removeEventListener('pointerdown', away, true)
      window.removeEventListener('scroll', scrolled, true)
      window.removeEventListener('resize', shut)
      window.removeEventListener('blur', shut)
    }
  }, [open])

  return (
    <>
      <button {...rest} ref={btn} type="button" role="combobox" className={`lk-select ${className}`.trim()}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
        aria-activedescendant={open && at >= 0 ? `${listId}-${at}` : undefined}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, textAlign: 'left', whiteSpace: 'nowrap', ...style }}
        // On press rather than on click: Safari spends the first click in an
        // unfocused frame on the frame. The click still comes from the keyboard.
        onPointerDown={(e) => { if (e.button === 0) { e.preventDefault(); toggle() } }}
        onClick={(e) => { if (e.detail === 0) toggle() }}
        onKeyDown={onKey}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{rows[shown]?.label}</span>
        <span className="lk-select-caret" aria-hidden="true" style={{ flex: 'none', fontSize: '.8em', opacity: 0.7 }}>▾</span>
      </button>
      {required ? (
        <input tabIndex={-1} aria-hidden="true" required value={rows[shown]?.value ?? ''} onChange={() => {}}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0, padding: 0, border: 0, pointerEvents: 'none' }} />
      ) : null}
      {open ? (
        <span ref={menu} id={listId} role="listbox"
          style={{
            position: 'fixed', top: 0, left: 0, zIndex: 1000, display: 'flex', flexDirection: 'column',
            maxHeight: 320, overflowY: 'auto', boxSizing: 'border-box', whiteSpace: 'nowrap', textAlign: 'left',
            border: `1px solid ${tint(35)}`, boxShadow: '0 4px 14px rgba(0,0,0,.18)',
          }}
          // A row or a draggable under the field should not hear about the list,
          // and a <label> around it should not re-open it.
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation() }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>
          {rows.map((r, i) => (r.header != null ? (
            <span key={i} role="presentation" style={{ padding: '4px 8px 2px', opacity: 0.6, fontSize: '.85em' }}>{r.header}</span>
          ) : (
            <span key={i} id={`${listId}-${i}`} role="option" aria-selected={i === found} aria-disabled={r.disabled || undefined}
              style={{
                padding: '3px 8px', flex: 'none', minHeight: '1.3em', cursor: r.disabled ? 'default' : 'pointer', opacity: r.disabled ? 0.45 : 1,
                background: i === at && can(i) ? tint(16) : i === found ? tint(8) : undefined,
              }}
              onPointerEnter={() => { if (can(i)) setAt(i) }}
              // A mouse picks on press; a finger on the click, so scrolling the
              // list by touch doesn't pick whatever it starts on.
              onPointerDown={(e) => { if (e.pointerType !== 'touch' && e.button === 0 && can(i)) { e.preventDefault(); choose(i) } }}
              onClick={() => { if (can(i)) choose(i) }}>{r.label}</span>
          )))}
        </span>
      ) : null}
    </>
  )
}
