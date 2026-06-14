/**
 * DashboardGrid — a Grafana-style draggable + resizable panel grid. No external
 * dependency: pointer-driven move/resize that snaps to a column grid, with the
 * layout lifted to the consumer (persist it however you like).
 *
 *   <DashboardGrid cols={12} rowHeight={30} gap={8}
 *     layout={layout} onLayoutChange={setLayout}>
 *     {panels.map(p => (
 *       <div key={p.id}>
 *         <header data-drag-handle>…title…</header>   // drag from the handle
 *         …panel body…
 *       </div>
 *     ))}
 *   </DashboardGrid>
 *
 * layout: [{ i, x, y, w, h }] in GRID UNITS (x,w in columns; y,h in row units).
 * Each child's `key` must equal its layout `i`. Children without a layout entry
 * are auto-placed. Drag starts only on an element matching `draggableHandle`
 * (default `[data-drag-handle]`); a resize grip sits at each panel's SE corner.
 */
import { Children, isValidElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

// Original (un-escaped) keys of the children, in order.
function childIds(children) {
  const ids = []
  Children.forEach(children, (c) => { if (isValidElement(c)) ids.push(String(c.key)) })
  return ids
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function autoPlace(existing, ids, cols, defW, defH) {
  const lay = existing.filter(l => ids.includes(l.i))
  const have = new Set(lay.map(l => l.i))
  let cursor = lay.length
  for (const id of ids) {
    if (have.has(id)) continue
    const x = (cursor * defW) % cols
    const y = Math.floor((cursor * defW) / cols) * defH
    lay.push({ i: id, x, y, w: defW, h: defH })
    cursor++
  }
  return lay
}

// Vertical compaction (Grafana/RGL-style): pull every item up to just under the
// lowest already-placed item it overlaps in x. Removes gaps left by collapsing
// or resizing. Preserves x/w and the top-to-bottom order.
function compact(items) {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x)
  const placed = []
  for (const it of sorted) {
    let y = 0
    for (const p of placed) {
      const overlapX = it.x < p.x + p.w && p.x < it.x + it.w
      if (overlapX) y = Math.max(y, p.y + p.h)
    }
    placed.push({ ...it, y })
  }
  return placed
}

export default function DashboardGrid({
  children, layout = [], onLayoutChange,
  cols = 12, rowHeight = 30, gap = 8,
  defaultW = 6, defaultH = 8,
  draggableHandle = '[data-drag-handle]',
  editable = true,
  compactVertical = true,
}) {
  const pack = (items) => (compactVertical ? compact(items) : items)
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(0)
  const [lay, setLay] = useState(layout)
  const drag = useRef(null)
  const latest = useRef(lay)
  useEffect(() => { latest.current = lay }, [lay])

  // Measure available width.
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // Sync from the controlled `layout` prop (handles add/remove AND external
  // value changes like collapse→height) — but never mid-drag.
  const ids = childIds(children)
  useEffect(() => {
    if (drag.current) return
    setLay(pack(autoPlace(layout, ids, cols, defaultW, defaultH)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, ids.join('|')])

  const colWidth = width > 0 ? (width - gap * (cols - 1)) / cols : 0
  const unitX = colWidth + gap
  const unitY = rowHeight + gap
  const get = (id) => lay.find(l => String(l.i) === String(id))

  const onPointerDown = useCallback((e, id, mode) => {
    if (!editable || e.button !== 0) return
    if (mode === 'move') {
      if (!e.target.closest(draggableHandle)) return
      // never start a drag from an interactive control inside the handle
      if (e.target.closest('button, a, input, select, textarea, [data-no-drag]')) return
    }
    e.preventDefault()
    const item = get(id); if (!item) return
    drag.current = { id, mode, sx: e.clientX, sy: e.clientY, orig: { ...item } }
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lay, colWidth, editable])

  const onMove = useCallback((e) => {
    const d = drag.current; if (!d) return
    const dCols = Math.round((e.clientX - d.sx) / unitX)
    const dRows = Math.round((e.clientY - d.sy) / unitY)
    setLay(prev => prev.map(l => {
      if (String(l.i) !== String(d.id)) return l
      if (d.mode === 'move') {
        return { ...l, x: clamp(d.orig.x + dCols, 0, cols - l.w), y: Math.max(0, d.orig.y + dRows) }
      }
      const w = clamp(d.orig.w + dCols, 2, cols - l.x)
      const h = Math.max(3, d.orig.h + dRows)
      return { ...l, w, h }
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitX, unitY, cols])

  const onUp = useCallback(() => {
    window.removeEventListener('pointermove', onMove)
    document.body.style.userSelect = ''
    drag.current = null
    const packed = pack(latest.current)
    setLay(packed)
    onLayoutChange?.(packed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMove, onLayoutChange, compactVertical])

  const totalRows = lay.reduce((m, l) => Math.max(m, l.y + l.h), 0)
  const height = totalRows * unitY - gap

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: Math.max(0, height) }}>
      {Children.map(children, (child) => {
        if (!child) return null
        const id = String(child.key)
        const l = get(id)
        if (!l || colWidth === 0) return null
        const active = drag.current?.id === id
        return (
          <div
            key={id}
            onPointerDown={(e) => onPointerDown(e, id, 'move')}
            style={{
              position: 'absolute',
              left: l.x * unitX,
              top: l.y * unitY,
              width: l.w * colWidth + (l.w - 1) * gap,
              height: l.h * rowHeight + (l.h - 1) * gap,
              zIndex: active ? 5 : 1,
              transition: active ? 'none' : 'left .12s, top .12s, width .12s, height .12s',
              boxShadow: active ? '0 8px 24px rgba(0,0,0,0.25)' : undefined,
            }}
          >
            <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>{child}</div>
            {editable && (
              <div
                onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, id, 'resize') }}
                title="크기 조절"
                style={{
                  position: 'absolute', right: 0, bottom: 0, width: 16, height: 16,
                  cursor: 'nwse-resize', zIndex: 6,
                  background: 'linear-gradient(135deg, transparent 50%, var(--border-strong) 50%, var(--border-strong) 60%, transparent 60%, transparent 72%, var(--border-strong) 72%, var(--border-strong) 82%, transparent 82%)',
                  borderBottomRightRadius: 10,
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
