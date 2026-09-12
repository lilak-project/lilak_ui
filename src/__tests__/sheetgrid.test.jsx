/**
 * SheetGrid behaviour — the parts a render check cannot see.
 *
 * The grid's whole reason to exist is what happens after a click: a rectangle of
 * cells, statistics over it, a sort that reorders without disturbing the caller's
 * array, and a TSV block on the clipboard. Those are driven through real DOM
 * events here, because every one of them broke silently in a static render.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import React from 'react'
import SheetGrid from '../data/SheetGrid.jsx'

const COLUMNS = [
  { key: 'run', label: 'Run', frozen: true },
  { key: 'p', label: 'Pressure', unit: 'mbar' },
  { key: 'n', label: 'Counts' },
]
const ROWS = [
  { run: 3, p: 2.0e-5, n: 10 },
  { run: 1, p: 4.0e-5, n: 30 },
  { run: 2, p: null,   n: 20 },
]

let container, root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  // jsdom implements neither; the grid calls both on selection.
  Element.prototype.scrollIntoView = vi.fn()
  document.execCommand = vi.fn(() => true)
  // jsdom has no 2D canvas and logs a "Not implemented" note for every probe;
  // the grid already treats a missing context as "cannot measure".
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null)
})
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks() })

const render = (props) => act(() => root.render(<SheetGrid columns={COLUMNS} rows={ROWS} {...props} />))
const bodyRows = () => [...container.querySelectorAll('tbody tr')]
/** data cell (r, c) — column 0 in the DOM is the row-number gutter. */
const cell = (r, c) => bodyRows()[r].children[c + 1]
const statusText = () => container.lastElementChild.textContent
const headers = () => [...container.querySelectorAll('thead th')].slice(1)

const mouseDown = (el, init = {}) =>
  act(() => { el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, ...init })) })
const mouseEnter = (el) =>
  act(() => { el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })) })
const key = (k, init = {}) =>
  act(() => { container.querySelector('[tabindex]').dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init })) })

describe('SheetGrid', () => {
  it('shows the hint until something is selected', () => {
    render()
    expect(statusText()).toContain('click')
  })

  it('reports statistics over a dragged rectangle', () => {
    render()
    mouseDown(cell(0, 2))                 // Counts of the first row
    mouseEnter(cell(2, 2))                // drag down the column
    const s = statusText()
    expect(s).toContain('3×1')
    expect(s).toContain('60')             // sum 10+30+20
    expect(s).toContain('20')             // avg, and also the min/max pair
  })

  it('counts a blank cell as unselectable data, not as zero', () => {
    render()
    mouseDown(cell(0, 1))                 // Pressure column: 2e-5, 4e-5, (blank)
    mouseEnter(cell(2, 1))
    const s = statusText()
    expect(s).toContain('3×1')
    expect(s).toMatch(/count[^0-9]*2/)    // the blank is not counted
    expect(s).toContain('6.000e-5')       // sum of the two real readings
  })

  it('extends with shift-click and with shift-arrow', () => {
    render()
    mouseDown(cell(0, 0))
    mouseDown(cell(1, 1), { shiftKey: true })
    expect(statusText()).toContain('2×2')
    key('ArrowDown', { shiftKey: true })
    expect(statusText()).toContain('3×2')
  })

  it('selects the row from the gutter and the column with Ctrl+Space', () => {
    render()
    mouseDown(bodyRows()[1].children[0])           // gutter of row 2
    expect(statusText()).toContain('1×3')
    mouseDown(cell(0, 1))
    key(' ', { ctrlKey: true })
    expect(statusText()).toContain('3×1')
  })

  it('sorts through asc → desc → original without mutating the caller rows', () => {
    const rows = [...ROWS]
    render({ rows })
    const runCol = headers()[0]
    const runs = () => bodyRows().map((tr) => tr.children[1].textContent)

    expect(runs()).toEqual(['3', '1', '2'])
    act(() => runCol.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(runs()).toEqual(['1', '2', '3'])
    act(() => runCol.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(runs()).toEqual(['3', '2', '1'])
    act(() => runCol.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(runs()).toEqual(['3', '1', '2'])
    expect(rows).toEqual(ROWS)                     // caller's array untouched
  })

  it('sorts blanks last in both directions', () => {
    render()
    const pCol = headers()[1]
    const press = () => bodyRows().map((tr) => tr.children[2].textContent)
    act(() => pCol.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(press()[2]).toBe('')
    act(() => pCol.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(press()[2]).toBe('')
  })

  it('copies the selected block as TSV', async () => {
    render()
    mouseDown(cell(0, 0))
    mouseDown(cell(1, 2), { shiftKey: true })
    let copied = ''
    document.execCommand = vi.fn(() => {
      copied = document.querySelector('textarea')?.value ?? ''
      return true
    })
    const btn = container.querySelector('button')
    await act(async () => { btn.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect(copied).toBe('3\t2.000e-5\t10\n1\t4.000e-5\t30')
  })

  // A header that does not clip paints over the column beside it — and because
  // a frozen header sits higher in the stack, that hid the next column outright.
  it('keeps every header inside its own column', () => {
    render()
    for (const th of headers()) {
      expect(th.style.overflow).toBe('hidden')
      const label = th.querySelector('span > span')
      expect(label.style.minWidth).toBe('0px')          // or it refuses to shrink
      expect(label.style.textOverflow).toBe('ellipsis')
    }
  })

  it('drops the selection when the rows underneath change', () => {
    render()
    mouseDown(cell(0, 0))
    expect(statusText()).toContain('1×1')
    render({ rows: ROWS.slice(0, 2) })
    expect(statusText()).toContain('click')
  })
})
