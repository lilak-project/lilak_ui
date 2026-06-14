/**
 * ColorPicker — click a swatch to open a popover for picking a color more
 * comfortably (#3): a visual OS picker, a hex field, and copy / paste buttons.
 *
 * Two modes:
 *   single:    <ColorPicker value="#0d9488" onChange={hex => …} />
 *   component: <ColorPicker
 *                parts={{ background:'#…', border:'#…', text:'#…' }}
 *                onPartsChange={p => …} />        // set bg / line / text separately
 *
 * Theme-aware, closes on outside-click / Esc. Used by ColorSettings and any
 * tag / component color editor.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../icons.jsx'

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
function normHex(s) {
  if (!s) return null
  let h = s.trim()
  if (h[0] !== '#') h = '#' + h
  return HEX.test(h) ? h : null
}

function Swatch({ color, size = 20, onClick, title, tri }) {
  const base = {
    width: size, height: size, borderRadius: 5, cursor: 'pointer', flexShrink: 0,
    borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border-default)', padding: 0,
  }
  if (tri) {
    return (
      <button title={title} onClick={onClick} style={{
        ...base, backgroundColor: tri.background || 'transparent',
        borderColor: tri.border || 'var(--border-default)', borderWidth: 2,
        color: tri.text || 'var(--text-primary)', fontSize: 'var(--fs-tiny, 11px)', lineHeight: `${size - 4}px`, fontWeight: 700,
      }}>A</button>
    )
  }
  return <button title={title} onClick={onClick} style={{ ...base, backgroundColor: color || 'transparent' }} />
}

/** One color field row: visual picker + hex input + copy/paste. */
function ColorField({ label, value, onChange }) {
  const hex = normHex(value) || '#000000'
  const [text, setText] = useState(value || '')
  useEffect(() => { setText(value || '') }, [value])

  async function paste() {
    try {
      const t = await navigator.clipboard.readText()
      const h = normHex(t)
      if (h) { setText(h); onChange(h) }
    } catch { /* clipboard blocked */ }
  }
  function copy() { try { navigator.clipboard.writeText(hex) } catch { /* ignore */ } }

  const iconBtn = {
    border: '1px solid var(--border-default)', background: 'var(--surface)', color: 'var(--text-secondary)',
    borderRadius: 5, fontSize: 'var(--fs-tiny, 11px)', padding: '3px 7px', cursor: 'pointer', whiteSpace: 'nowrap',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {label && <span style={{ fontSize: 'var(--fs-tiny, 11px)', color: 'var(--text-muted)', width: 64, flexShrink: 0 }}>{label}</span>}
      <input type="color" value={hex} onChange={(e) => { setText(e.target.value); onChange(e.target.value) }}
        style={{ width: 28, height: 24, padding: 0, border: '1px solid var(--border-default)', borderRadius: 5, background: 'none', cursor: 'pointer' }} />
      <input value={text} onChange={(e) => { setText(e.target.value); const h = normHex(e.target.value); if (h) onChange(h) }}
        spellCheck={false} placeholder="#rrggbb"
        style={{ width: 88, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-small, 12px)', padding: '4px 6px', borderRadius: 5,
          border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-primary)', outline: 'none' }} />
      <button onClick={copy} style={{ ...iconBtn, display: 'inline-flex', alignItems: 'center' }} title="Copy"><Icon name="copy" size={14} /></button>
      <button onClick={paste} style={{ ...iconBtn, display: 'inline-flex', alignItems: 'center' }} title="Paste"><Icon name="paste" size={14} /></button>
    </div>
  )
}

export default function ColorPicker({
  value, onChange,
  parts, onPartsChange,
  labels = { background: 'Background', border: 'Line', text: 'Text' },
  size = 20, title,
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ left: 0, top: 0 })
  const ref = useRef(null)
  const popRef = useRef(null)
  const isParts = !!parts

  // Position the popover under the swatch. Rendered in a portal so it escapes
  // any `overflow:hidden` / stacking-context ancestor (cards, drawers, modals).
  useLayoutEffect(() => {
    if (!open || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({ left: r.left, top: r.bottom + 6 })
  }, [open, size])

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (ref.current?.contains(e.target)) return
      if (popRef.current?.contains(e.target)) return
      setOpen(false)
    }
    function onEsc(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onEsc)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onEsc) }
  }, [open])

  const setPart = (k, v) => onPartsChange?.({ ...parts, [k]: v })

  const popover = open && createPortal(
    <div ref={popRef} style={{
      position: 'fixed', top: pos.top, left: pos.left, zIndex: 70,
      background: 'var(--surface)', border: '1px solid var(--border-default)', borderRadius: 10,
      boxShadow: '0 10px 28px rgba(0,0,0,0.25)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
      fontFamily: 'var(--font-sans)', minWidth: 240,
    }}>
      {isParts ? (
        <>
          <ColorField label={labels.background} value={parts.background} onChange={(v) => setPart('background', v)} />
          <ColorField label={labels.border} value={parts.border} onChange={(v) => setPart('border', v)} />
          <ColorField label={labels.text} value={parts.text} onChange={(v) => setPart('text', v)} />
          <div style={{ marginTop: 2, alignSelf: 'flex-start', padding: '2px 10px', borderRadius: 999, fontSize: 'var(--fs-small, 12px)',
            backgroundColor: parts.background || 'transparent', color: parts.text || 'var(--text-primary)',
            border: `1.5px solid ${parts.border || 'var(--border-default)'}` }}>#preview</div>
        </>
      ) : (
        <ColorField value={value} onChange={onChange} />
      )}
    </div>,
    document.body,
  )

  return (
    <span ref={ref} style={{ display: 'inline-flex' }}>
      {isParts
        ? <Swatch tri={parts} size={size} onClick={() => setOpen((o) => !o)} title={title} />
        : <Swatch color={normHex(value)} size={size} onClick={() => setOpen((o) => !o)} title={title} />}
      {popover}
    </span>
  )
}
