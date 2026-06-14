/**
 * DataGrid — a grid of data components with keyboard navigation.
 *
 * Lays items out in `cols` columns and gives them roving focus:
 *   ← → (h l)  move focus by one          ↑ ↓ (k j)  move focus by a row
 *   space / enter  open/close the focused item
 *   esc        clear focus
 *
 * Open/closed state can be controlled (`openIds` + `onOpenChange`) or left to the
 * grid. `renderItem(item, { focused, open, toggle, focus, index })` draws each
 * cell — typically a <DataCard>. Item identity comes from `getId`.
 *
 *   <DataGrid items={files} cols={3} getId={(f) => f.id}
 *     renderItem={(f, { focused, open, toggle }) => (
 *       <DataCard kind="file" title={f.name} open={open} focused={focused}
 *         onToggle={toggle} onFocus={() => {}} media={mediaFor(f)} />
 *     )} />
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const asSet = (v) => (v instanceof Set ? v : new Set(v || []))

export default function DataGrid({
  items = [],
  cols = 3,
  gap = 12,
  getId = (it, i) => (it && it.id != null ? it.id : i),
  openIds,
  onOpenChange,
  defaultOpenIds,
  focusIndex: focusIndexProp,
  onFocusChange,
  renderItem,
  autoFocus = false,
  style,
  ...rest
}) {
  const rootRef = useRef(null)
  const ids = useMemo(() => items.map((it, i) => getId(it, i)), [items, getId])

  // open set (controlled or internal)
  const ctrlOpen = openIds != null
  const [openState, setOpenState] = useState(() => asSet(defaultOpenIds))
  const openSet = ctrlOpen ? asSet(openIds) : openState
  const setOpen = useCallback((next) => {
    if (ctrlOpen) onOpenChange?.(next)
    else setOpenState(next)
  }, [ctrlOpen, onOpenChange])

  const toggleId = useCallback((id, force) => {
    const next = new Set(openSet)
    const willOpen = force != null ? force : !next.has(id)
    if (willOpen) next.add(id); else next.delete(id)
    setOpen(next)
  }, [openSet, setOpen])

  // roving focus index (controlled or internal)
  const ctrlFocus = focusIndexProp != null
  const [focusState, setFocusState] = useState(-1)
  const focusIndex = ctrlFocus ? focusIndexProp : focusState
  const setFocus = useCallback((i) => {
    const clamped = items.length ? Math.max(0, Math.min(items.length - 1, i)) : -1
    if (ctrlFocus) onFocusChange?.(clamped)
    else setFocusState(clamped)
  }, [ctrlFocus, onFocusChange, items.length])

  useEffect(() => { if (autoFocus && items.length && focusIndex < 0) setFocus(0) }, [autoFocus, items.length]) // eslint-disable-line

  function onKeyDown(e) {
    if (!items.length) return
    const cur = focusIndex < 0 ? 0 : focusIndex
    const k = e.key
    let next = null
    if (k === 'ArrowRight' || k === 'l') next = cur + 1
    else if (k === 'ArrowLeft' || k === 'h') next = cur - 1
    else if (k === 'ArrowDown' || k === 'j') next = cur + cols
    else if (k === 'ArrowUp' || k === 'k') next = cur - cols
    else if (k === ' ' || k === 'Enter') {
      e.preventDefault()
      const id = ids[cur]; if (id != null) toggleId(id)
      if (focusIndex < 0) setFocus(cur)
      return
    } else if (k === 'Escape') { setFocus(-1); rootRef.current?.focus(); return }
    else return

    e.preventDefault()
    if (next < 0 || next >= items.length) return  // clamp at edges, no wrap
    setFocus(next)
  }

  // keep the DOM focus on the focused cell so the page scrolls it into view
  useEffect(() => {
    if (focusIndex < 0) return
    const cell = rootRef.current?.querySelector(`[data-cell="${focusIndex}"]`)
    cell?.querySelector('[data-data-card]')?.focus?.()
    cell?.scrollIntoView?.({ block: 'nearest' })
  }, [focusIndex])

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      style={{
        display: 'grid', gap,
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        alignItems: 'start', outline: 'none',
        ...style,
      }}
      {...rest}
    >
      {items.map((it, i) => {
        const id = ids[i]
        const open = openSet.has(id)
        return (
          <div key={id} data-cell={i} style={{ minWidth: 0 }}>
            {renderItem(it, {
              index: i,
              focused: i === focusIndex,
              open,
              toggle: (force) => toggleId(id, force),
              focus: () => setFocus(i),
            })}
          </div>
        )
      })}
    </div>
  )
}
