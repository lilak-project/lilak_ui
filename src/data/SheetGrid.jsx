/**
 * SheetGrid — a spreadsheet-grade table.
 *
 * DataTable renders rows; this renders a *sheet*. The difference is what you can
 * do to the values once they are on screen: pick a rectangle of cells, see what
 * they add up to, sort by any column, copy the block straight into Excel or
 * Google Sheets, and drag the columns to a width that fits the numbers.
 *
 *   <SheetGrid
 *     columns={[{ key: 'run_number', label: 'Run', frozen: true },
 *               { key: 'pressure', label: 'Pressure', unit: 'Torr' }]}
 *     rows={rows}
 *     height={520}
 *   />
 *
 * Column: { key, label, unit?, align?, width?, format?(value,row), sortable? }
 * A column carrying `frozen` stays put while the rest scrolls horizontally;
 * frozen columns must come first.
 *
 * Selection follows the spreadsheet conventions people already have in their
 * fingers: click / shift-click / drag, arrows and shift-arrows, Ctrl+A for
 * everything, Shift+Space for the row, Ctrl+Space for the column, Ctrl+C to
 * copy as TSV. The row gutter selects a row and the corner selects the sheet.
 *
 * Every row is in the DOM — there is no virtualisation. That is the right
 * trade for the run-summary tables this was built for (hundreds of rows, and a
 * browser's own Ctrl+F still finds things); tens of thousands of rows would
 * need windowing added here first.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { copyText } from '../utils/clipboard.js'

const DEFAULT_LABELS = {
  empty:    'no rows',
  count:    'count', numbers: 'numeric', sum: 'sum', avg: 'avg', min: 'min', max: 'max',
  selected: 'selected', copy: 'Copy', copied: 'Copied',
  hint:     'click / shift-click / drag to select · Ctrl+C to copy',
  autofit:  'drag to resize · double-click to fit',
  fitAll:   'Fit columns',
}

const GUTTER_W  = 52
const DEFAULT_W = 120
const MIN_W     = 44

/**
 * One value, in a notation that actually shows it.
 *
 * Fixed notation silently swallows whole quantities: a vacuum reading of 2.9e-5
 * renders as "0.000" and reads like a dead gauge. Outside the range a fixed
 * decimal can express, fall back to exponential.
 */
export function formatSheetValue(v, digits = 4) {
  if (v == null || v === '') return ''
  if (typeof v !== 'number') return String(v)
  if (!Number.isFinite(v)) return String(v)
  const a = Math.abs(v)
  // Switch to exponential one decade EARLIER than the fixed notation runs out.
  // At the old threshold a vacuum reading of 1.49e-4 was not small enough to
  // qualify, so it went through toFixed(4) and came out as "0.0001" — one
  // significant digit, with every reading in the run rendering as the same
  // 0.0001/0.0002 while the underlying numbers all differed.
  if (a !== 0 && (a < 10 ** -(digits - 1) || a >= 1e7)) return v.toExponential(Math.max(1, digits - 1))
  return String(Number(v.toFixed(digits)))
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

/**
 * Width of `text` in `font`, or 0 where there is no 2D canvas (jsdom).
 *
 * Measured rather than read off the DOM because auto-fit has to be able to make
 * a column NARROWER, and an element's scrollWidth never reports less than the
 * box it is already in — every "fit to contents" would then be a no-op.
 */
let _measureCtx
function textWidth(text, font) {
  if (typeof document === 'undefined') return 0
  if (_measureCtx === undefined) _measureCtx = document.createElement('canvas').getContext?.('2d') ?? null
  if (!_measureCtx) return 0
  _measureCtx.font = font
  return _measureCtx.measureText(String(text ?? '')).width
}

const isBlank = (v) => v == null || v === ''

/** Compare two present values: numbers numerically, anything else as text. */
function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true })
}

/**
 * Order two rows on one column, in `dir`.
 *
 * Blanks sink to the bottom in BOTH directions. Folding them into the value
 * comparison and flipping the whole thing for descending floated every empty
 * cell to the top instead — turning "show me the largest readings" into a screen
 * of the runs that have no reading at all.
 */
function compareRows(a, b, key, dir) {
  const va = a[key], vb = b[key]
  if (isBlank(va) || isBlank(vb)) {
    return isBlank(va) && isBlank(vb) ? 0 : isBlank(va) ? 1 : -1
  }
  return dir * compareValues(va, vb)
}

export default function SheetGrid({
  columns = [],
  rows = [],
  rowKey = (_r, i) => i,
  height = 520,
  digits = 4,
  zebra = true,
  fitOnLoad = true,
  labels: labelOverrides,
  emptyText,
  onSelectionChange,
  style,
}) {
  const L = { ...DEFAULT_LABELS, ...(labelOverrides || {}) }
  const nCols = columns.length

  // ── Column widths (draggable) ──────────────────────────────────────────────
  // Keyed by column key so a width survives the column list changing around it.
  const [widths, setWidths] = useState({})
  const widthOf = (c) => widths[c.key] ?? c.width ?? DEFAULT_W
  const frozenCount = useMemo(() => {
    let n = 0
    for (const c of columns) { if (c.frozen) n++; else break }
    return n
  }, [columns])
  // Left offset of each frozen column, measured from the gutter's right edge.
  const frozenLeft = useMemo(() => {
    const out = []
    let x = GUTTER_W
    for (let i = 0; i < frozenCount; i++) { out.push(x); x += widthOf(columns[i]) }
    return out
  }, [columns, frozenCount, widths])

  const tableRef = useRef(null)

  const dragRef = useRef(null)
  const startResize = (e, col) => {
    e.preventDefault(); e.stopPropagation()
    dragRef.current = { key: col.key, x0: e.clientX, w0: widthOf(col) }
    const onMove = (ev) => {
      const d = dragRef.current
      if (!d) return
      setWidths((w) => ({ ...w, [d.key]: Math.max(MIN_W, d.w0 + ev.clientX - d.x0) }))
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // ── Sorting ────────────────────────────────────────────────────────────────
  const [sort, setSort] = useState(null)          // { key, dir: 1 | -1 }
  const viewRows = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return rows
    // Sort a copy: `rows` belongs to the caller, and the unsorted order is what
    // a third click has to give back.
    return [...rows].sort((ra, rb) => compareRows(ra, rb, col.key, sort.dir))
  }, [rows, sort, columns])
  const nRows = viewRows.length

  /**
   * Size a column to its widest visible value — the double-click every
   * spreadsheet puts on the column edge. Measures the strings actually on
   * screen (header included), so it shrinks as readily as it grows.
   */
  const autoFit = useCallback((col) => {
    const t = tableRef.current
    if (!t) return
    // nth-child(2) — the first DATA cell. Column 1 is the row-number gutter, and
    // it is set two sizes smaller, so measuring against it undersized every
    // column by the difference.
    const bodyCell = t.querySelector('tbody td:nth-child(2)')
    const headCell = t.querySelector('thead th:nth-child(2)')
    const bodyFont = bodyCell ? getComputedStyle(bodyCell).font : ''
    const headFont = headCell ? getComputedStyle(headCell).font : ''
    let body = 0
    for (const row of viewRows) {
      const txt = col.format ? col.format(row[col.key], row) : formatSheetValue(row[col.key], digits)
      body = Math.max(body, textWidth(txt, bodyFont))
    }
    // The header carries the sort caret and the unit beside the label.
    const head = textWidth(`${col.label} ${col.unit || ''}`, headFont) + 22
    const want = Math.ceil(Math.max(body + 18, head + 16))
    if (!want) return
    setWidths((w) => ({ ...w, [col.key]: clamp(want, MIN_W, 420) }))
  }, [viewRows, digits])

  const fitAll = useCallback(() => { columns.forEach(autoFit) }, [columns, autoFit])

  // Size a column the first time there is data to size it against. A flat
  // default width is wrong twice over on a real sheet: a run number wastes half
  // its column while a timestamp is cut in half. Only columns nobody has sized
  // are touched, so a width dragged by hand survives every reload and re-sort.
  useLayoutEffect(() => {
    if (!fitOnLoad || !viewRows.length) return
    const unsized = columns.filter((c) => widths[c.key] == null)
    if (unsized.length) unsized.forEach(autoFit)
  }, [fitOnLoad, columns, widths, viewRows.length, autoFit])

  const cycleSort = (col) => {
    if (col.sortable === false) return
    setSort((s) => (s?.key !== col.key ? { key: col.key, dir: 1 }
                  : s.dir === 1 ? { key: col.key, dir: -1 }
                  : null))
  }

  // ── Selection ──────────────────────────────────────────────────────────────
  // Stored anchor→focus so shift-extension knows which corner is pinned.
  const [sel, setSel] = useState(null)            // { r1, c1, r2, c2 }
  const dragging = useRef(false)
  const scrollRef = useRef(null)
  const focusCellRef = useRef(null)

  const area = useMemo(() => {
    if (!sel || !nRows || !nCols) return null
    return {
      top:  Math.min(sel.r1, sel.r2), bottom: Math.max(sel.r1, sel.r2),
      left: Math.min(sel.c1, sel.c2), right:  Math.max(sel.c1, sel.c2),
    }
  }, [sel, nRows, nCols])

  // A sort or a data reload leaves the old rectangle pointing at other values.
  useEffect(() => { setSel(null) }, [sort, nRows, nCols])

  const setFocus = useCallback((r, c, extend) => {
    setSel((s) => {
      const rr = clamp(r, 0, nRows - 1), cc = clamp(c, 0, nCols - 1)
      if (!extend || !s) return { r1: rr, c1: cc, r2: rr, c2: cc }
      return { ...s, r2: rr, c2: cc }
    })
  }, [nRows, nCols])

  // Keep the moving corner on screen — the only reason arrow keys feel like a
  // spreadsheet rather than a list that scrolled away from you.
  useLayoutEffect(() => {
    focusCellRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [sel?.r2, sel?.c2])

  useEffect(() => {
    if (!onSelectionChange) return
    onSelectionChange(area ? { ...area, rows: viewRows, columns } : null)
  }, [area, onSelectionChange, viewRows, columns])

  useEffect(() => {
    const up = () => { dragging.current = false }
    window.addEventListener('mouseup', up)
    return () => window.removeEventListener('mouseup', up)
  }, [])

  const selectAll = () => nRows && nCols && setSel({ r1: 0, c1: 0, r2: nRows - 1, c2: nCols - 1 })

  // ── Copy ───────────────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false)
  const selectionTSV = useCallback(() => {
    if (!area) return ''
    const lines = []
    for (let r = area.top; r <= area.bottom; r++) {
      const cells = []
      for (let c = area.left; c <= area.right; c++) {
        const col = columns[c]
        const raw = viewRows[r]?.[col.key]
        // Tabs and newlines inside a value would forge extra cells and rows in
        // whatever this is pasted into; a space keeps the block rectangular.
        cells.push(String(col.format ? col.format(raw, viewRows[r]) : formatSheetValue(raw, digits))
          .replace(/[\t\r\n]+/g, ' '))
      }
      lines.push(cells.join('\t'))
    }
    return lines.join('\n')
  }, [area, columns, viewRows, digits])

  const doCopy = useCallback(async () => {
    const tsv = selectionTSV()
    if (!tsv) return
    if (await copyText(tsv)) { setCopied(true); setTimeout(() => setCopied(false), 1400) }
  }, [selectionTSV])

  // ── Selection statistics ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!area) return null
    let count = 0, nums = 0, sum = 0, min = Infinity, max = -Infinity
    for (let r = area.top; r <= area.bottom; r++) {
      for (let c = area.left; c <= area.right; c++) {
        const v = viewRows[r]?.[columns[c].key]
        if (v == null || v === '') continue
        count++
        const n = typeof v === 'number' ? v : Number(v)
        if (Number.isFinite(n) && typeof v === 'number') {
          nums++; sum += n; if (n < min) min = n; if (n > max) max = n
        }
      }
    }
    return {
      cells: (area.bottom - area.top + 1) * (area.right - area.left + 1),
      rows: area.bottom - area.top + 1, cols: area.right - area.left + 1,
      count, nums, sum, avg: nums ? sum / nums : null,
      min: nums ? min : null, max: nums ? max : null,
    }
  }, [area, viewRows, columns])

  // ── Keyboard ───────────────────────────────────────────────────────────────
  const onKeyDown = (e) => {
    if (!nRows || !nCols) return
    const mod = e.ctrlKey || e.metaKey
    const cur = sel || { r1: 0, c1: 0, r2: 0, c2: 0 }
    const step = (dr, dc) => { e.preventDefault(); setFocus(cur.r2 + dr, cur.c2 + dc, e.shiftKey) }
    switch (e.key) {
      case 'ArrowUp':    return step(-1, 0)
      case 'ArrowDown':  return step(1, 0)
      case 'ArrowLeft':  return step(0, -1)
      case 'ArrowRight': return step(0, 1)
      case 'PageUp':     return step(-10, 0)
      case 'PageDown':   return step(10, 0)
      case 'Home':       e.preventDefault(); return setFocus(mod ? 0 : cur.r2, 0, e.shiftKey)
      case 'End':        e.preventDefault(); return setFocus(mod ? nRows - 1 : cur.r2, nCols - 1, e.shiftKey)
      case 'Escape':     return setSel(null)
      case ' ':
        // Spreadsheet convention: Shift+Space takes the row, Ctrl+Space the column.
        if (e.shiftKey && !mod) { e.preventDefault(); return setSel({ r1: cur.r2, c1: 0, r2: cur.r2, c2: nCols - 1 }) }
        if (mod && !e.shiftKey) { e.preventDefault(); return setSel({ r1: 0, c1: cur.c2, r2: nRows - 1, c2: cur.c2 }) }
        return
      default: break
    }
    if (mod && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); return selectAll() }
    if (mod && (e.key === 'c' || e.key === 'C')) { e.preventDefault(); return doCopy() }
  }

  const barBtn = (on) => ({
    fontSize: 'var(--fs-tiny, 11px)', padding: '2px 10px', borderRadius: 6,
    border: '1px solid var(--border-default)', cursor: 'pointer', flexShrink: 0,
    backgroundColor: on ? 'var(--success-bg)' : 'var(--surface)',
    color: on ? 'var(--success-text)' : 'var(--text-primary)',
  })

  // ── Cell styling ───────────────────────────────────────────────────────────
  const inSel = (r, c) => area && r >= area.top && r <= area.bottom && c >= area.left && c <= area.right
  const isFocus = (r, c) => sel && r === sel.r2 && c === sel.c2

  const headBase = {
    position: 'sticky', top: 0, zIndex: 3,
    backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)',
    fontWeight: 500, fontSize: 'var(--fs-micro, 10px)', letterSpacing: '.03em',
    textAlign: 'left', padding: '6px 8px', whiteSpace: 'nowrap',
    // Without this the header text runs on past its column and paints over the
    // next one — and because a frozen header sits at a higher z-index, a long
    // label like "Run number" simply hid the column beside it. It also made
    // dragging a column narrower look like it did nothing.
    overflow: 'hidden',
    borderBottom: '1px solid var(--border-default)',
    borderRight: '1px solid var(--border-subtle)',
    userSelect: 'none',
  }

  return (
    <div style={{ border: '1px solid var(--border-default)', borderRadius: 10, overflow: 'hidden', backgroundColor: 'var(--surface)', ...style }}>
      <div
        ref={scrollRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        style={{ overflow: 'auto', maxHeight: height, outline: 'none', position: 'relative' }}
      >
        <table ref={tableRef} style={{ borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed',
                        fontSize: 'var(--fs-small, 12px)', fontVariantNumeric: 'tabular-nums' }}>
          <colgroup>
            <col style={{ width: GUTTER_W }} />
            {columns.map((c) => <col key={c.key} style={{ width: widthOf(c) }} />)}
          </colgroup>
          <thead>
            <tr>
              {/* corner — selects the whole sheet */}
              <th onClick={selectAll} title={L.hint}
                  style={{ ...headBase, left: 0, zIndex: 5, width: GUTTER_W, textAlign: 'center', cursor: 'pointer' }} />
              {columns.map((c, ci) => {
                const sorted = sort?.key === c.key
                const frozen = ci < frozenCount
                const active = area && ci >= area.left && ci <= area.right
                return (
                  <th key={c.key}
                      onClick={() => cycleSort(c)}
                      // The label is ellipsized once the column is narrow, so the
                      // tooltip is the only place the full name still exists.
                      title={`${c.label}${c.unit ? ` (${c.unit})` : ''}`}
                      style={{
                        ...headBase,
                        cursor: c.sortable === false ? 'default' : 'pointer',
                        position: 'sticky', top: 0,
                        left: frozen ? frozenLeft[ci] : undefined,
                        zIndex: frozen ? 5 : 3,
                        backgroundColor: active ? 'var(--info-bg)' : 'var(--surface-2)',
                        color: active || sorted ? 'var(--text-primary)' : 'var(--text-secondary)',
                        textAlign: c.align ?? 'left',
                      }}>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 0 }}>
                      {/* minWidth:0 — a flex item defaults to min-width:auto, which
                          is its text width, so without this the label refuses to
                          shrink and pushes the whole header past its column. */}
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
                      {c.unit ? <span style={{ flexShrink: 0, color: 'var(--text-muted)', textTransform: 'none' }}>{c.unit}</span> : null}
                      <span style={{ flexShrink: 0, marginLeft: 'auto', paddingLeft: 2,
                                     color: sorted ? 'var(--text-link)' : 'var(--border-strong)' }}>
                        {sorted ? (sort.dir === 1 ? '▲' : '▼') : '↕'}
                      </span>
                    </span>
                    {/* resize grip — its own mousedown, so it never sorts.
                        Double-click fits the column to what is in it. */}
                    <span onMouseDown={(e) => startResize(e, c)}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => { e.stopPropagation(); autoFit(c) }}
                          title={L.autofit}
                          style={{ position: 'absolute', top: 0, right: 0, width: 7, height: '100%',
                                   cursor: 'col-resize', borderRight: '2px solid transparent' }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderRightColor = 'var(--text-link)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderRightColor = 'transparent' }} />
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {nRows === 0 && (
              <tr><td colSpan={nCols + 1} style={{ padding: 22, textAlign: 'center', color: 'var(--text-muted)' }}>
                {emptyText ?? L.empty}
              </td></tr>
            )}
            {viewRows.map((row, ri) => {
              const striped = zebra && ri % 2 === 1
              const rowBg = striped ? 'var(--surface-2)' : 'var(--surface)'
              const rowActive = area && ri >= area.top && ri <= area.bottom
              return (
                <tr key={rowKey(row, ri)}>
                  {/* row gutter — selects the row */}
                  <td onMouseDown={(e) => { e.preventDefault(); scrollRef.current?.focus()
                        setSel(e.shiftKey && sel ? { ...sel, r2: ri, c2: nCols - 1 }
                                                 : { r1: ri, c1: 0, r2: ri, c2: nCols - 1 }) }}
                      style={{ position: 'sticky', left: 0, zIndex: 2, width: GUTTER_W,
                               backgroundColor: rowActive ? 'var(--info-bg)' : 'var(--surface-2)',
                               color: 'var(--text-muted)', textAlign: 'center', cursor: 'pointer',
                               fontSize: 'var(--fs-micro, 10px)', padding: '4px 6px', userSelect: 'none',
                               borderBottom: '1px solid var(--border-subtle)',
                               borderRight: '1px solid var(--border-default)' }}>
                    {ri + 1}
                  </td>
                  {columns.map((c, ci) => {
                    const raw = row[c.key]
                    const selected = inSel(ri, ci)
                    const focus = isFocus(ri, ci)
                    const frozen = ci < frozenCount
                    const numeric = typeof raw === 'number'
                    return (
                      <td key={c.key}
                          ref={focus ? focusCellRef : undefined}
                          onMouseDown={(e) => {
                            if (e.button !== 0) return
                            e.preventDefault()               // no text-drag; we own the drag
                            scrollRef.current?.focus()
                            dragging.current = true
                            setFocus(ri, ci, e.shiftKey)
                          }}
                          onMouseEnter={() => { if (dragging.current) setFocus(ri, ci, true) }}
                          style={{
                            padding: '4px 8px',
                            textAlign: c.align ?? (numeric ? 'right' : 'left'),
                            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                            color: raw == null || raw === '' ? 'var(--text-muted)' : 'var(--text-primary)',
                            backgroundColor: selected ? 'var(--info-bg)' : frozen ? rowBg : rowBg,
                            position: frozen ? 'sticky' : undefined,
                            left: frozen ? frozenLeft[ci] : undefined,
                            zIndex: frozen ? 1 : undefined,
                            borderBottom: '1px solid var(--border-subtle)',
                            borderRight: frozen && ci === frozenCount - 1
                              ? '1px solid var(--border-default)' : '1px solid var(--border-subtle)',
                            // The focus ring is drawn inset so it never shifts the
                            // grid by a pixel the way a real border would.
                            boxShadow: focus ? 'inset 0 0 0 2px var(--text-link)' : undefined,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            cursor: 'cell', userSelect: 'none',
                          }}>
                        {c.format ? c.format(raw, row) : formatSheetValue(raw, digits)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* status bar — the spreadsheet's bottom-right readout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                    padding: '5px 10px', borderTop: '1px solid var(--border-default)',
                    backgroundColor: 'var(--surface-2)', fontSize: 'var(--fs-tiny, 11px)',
                    color: 'var(--text-secondary)', minHeight: 26 }}>
        {stats ? (
          <>
            <span style={{ fontFamily: 'var(--font-mono, monospace)' }}>
              {stats.rows}×{stats.cols} {L.selected}
            </span>
            <span>{L.count} <b style={{ color: 'var(--text-primary)' }}>{stats.count}</b></span>
            {stats.nums > 0 && (
              <>
                <span>{L.sum} <b style={{ color: 'var(--text-primary)' }}>{formatSheetValue(stats.sum, digits)}</b></span>
                <span>{L.avg} <b style={{ color: 'var(--text-primary)' }}>{formatSheetValue(stats.avg, digits)}</b></span>
                <span>{L.min} <b style={{ color: 'var(--text-primary)' }}>{formatSheetValue(stats.min, digits)}</b></span>
                <span>{L.max} <b style={{ color: 'var(--text-primary)' }}>{formatSheetValue(stats.max, digits)}</b></span>
              </>
            )}
            <span style={{ flex: 1 }} />
            <button type="button" onClick={doCopy} style={barBtn(copied)}>
              {copied ? L.copied : L.copy}
            </button>
          </>
        ) : (
          <>
            <span style={{ color: 'var(--text-muted)' }}>{L.hint}</span>
            <span style={{ flex: 1 }} />
          </>
        )}
        {/* Double-clicking a column edge fits that one; nobody finds that on
            their own, so the same thing for every column gets a real button. */}
        <button type="button" onClick={fitAll} style={barBtn(false)}>{L.fitAll}</button>
      </div>
    </div>
  )
}
