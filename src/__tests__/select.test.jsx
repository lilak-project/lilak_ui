import { describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Select from '../components/Select.jsx'

function Field({ onPick, start = 'b' }) {
  const [v, setV] = useState(start)
  return (
    <Select name="f" value={v} onChange={(e) => { setV(e.target.value); onPick(e.target) }}>
      <optgroup label="G">
        <option value="a">Apple</option>
        <option value="x" disabled>Off</option>
      </optgroup>
      {[1].map((n) => <option key={n} value="b">Ba{n}</option>)}
    </Select>
  )
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const fire = (el, type, init) => act(() => { el.dispatchEvent(new (type === 'keydown' ? KeyboardEvent : MouseEvent)(type, { bubbles: true, cancelable: true, button: 0, ...init })) })
const q = (sel) => document.querySelector(sel)
const trigger = () => q('[role=combobox]')
const list = () => q('[role=listbox]')
const option = (text) => [...document.querySelectorAll('[role=option]')].find((o) => o.textContent === text)
const open = () => fire(trigger(), 'pointerdown')
const key = (k) => fire(trigger(), 'keydown', { key: k })
function render(el) {
  document.body.innerHTML = '<div></div>'
  act(() => { createRoot(document.body.firstChild).render(el) })
}

describe('Select', () => {
  it('shows the value, and a press picks with the shape a <select> hands over', () => {
    const onPick = vi.fn()
    render(<Field onPick={onPick} />)
    expect(trigger().textContent).toContain('Ba1')
    open()
    fire(option('Apple'), 'click')
    expect(onPick).toHaveBeenCalledWith({ value: 'a', name: 'f' })
    expect(list()).toBeNull()
  })

  it('walks past a disabled option with the keyboard, and Esc changes nothing', () => {
    const onPick = vi.fn()
    render(<Field onPick={onPick} />)
    key('ArrowDown')
    key('Escape')
    expect(list()).toBeNull()
    expect(onPick).not.toHaveBeenCalled()
    key('ArrowDown')
    key('ArrowUp')
    key('Enter')
    expect(onPick).toHaveBeenCalledWith({ value: 'a', name: 'f' })
  })

  it('does not fire for the option already chosen, and shuts on a press outside', () => {
    const onPick = vi.fn()
    render(<Field onPick={onPick} />)
    open()
    fire(option('Ba1'), 'click')
    expect(onPick).not.toHaveBeenCalled()
    open()
    fire(document.body, 'pointerdown')
    expect(list()).toBeNull()
  })
})
