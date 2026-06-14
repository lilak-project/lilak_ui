/**
 * FormatPicker — pick a log format, grouped (standard / default / general /
 * per-system / module). Faithful port of lilak_elog's FormatPicker, kit-styled.
 * Keyboard: ↑↓ / j k navigate, Enter/Space pick, Esc close.
 *
 *   <FormatPicker formats={formats} onPick={(fmt|null) => …} onClose={…} />
 */
import { useEffect, useState } from 'react'
import Icon from '../icons.jsx'

function groupFormats(formats, stdItem) {
  const defaultFmts = formats.filter((f) => f.is_default)
  const moduleFmts = formats.filter((f) => !f.is_default && f.created_by?.startsWith('<module:'))
  const systemGroups = {}
  const generalFmts = []
  for (const f of formats) {
    if (f.is_default || f.created_by?.startsWith('<module:')) continue
    if (f.system_name) (systemGroups[f.system_name] ??= []).push(f)
    else generalFmts.push(f)
  }
  const groups = [{ key: 'standard', label: null, fmts: [stdItem] }]
  if (defaultFmts.length) groups.push({ key: 'default', label: 'Default', fmts: defaultFmts })
  if (generalFmts.length) groups.push({ key: 'general', label: 'General', fmts: generalFmts })
  for (const [name, fmts] of Object.entries(systemGroups)) groups.push({ key: `sys:${name}`, label: name, sublabel: 'system', fmts })
  if (moduleFmts.length) groups.push({ key: 'module', label: 'Module', fmts: moduleFmts })
  return groups
}

export default function FormatPicker({ formats = [], onPick, onClose, standardLabel = 'Standard', title = 'Pick a format' }) {
  const stdItem = { id: '__std__', name: standardLabel, fields: [], is_default: false, _isStandard: true }
  const groups = groupFormats(formats, stdItem)
  const flat = groups.flatMap((g) => g.fmts)
  const [focused, setFocused] = useState(0)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.(); return }
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); setFocused((i) => Math.min(flat.length - 1, i + 1)) }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); setFocused((i) => Math.max(0, i - 1)) }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const it = flat[focused]
        if (it) onPick?.(it._isStandard ? null : it)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flat, focused, onPick, onClose])

  let gi = 0
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'var(--overlay)' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, maxHeight: '85vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 16, fontFamily: 'var(--font-sans)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 'var(--fs-body, 13px)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {title} <span style={{ fontSize: 'var(--fs-tiny, 11px)', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>↑↓ / jk · Enter</span>
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex' }}><Icon name="close" size={14} /></button>
        </div>
        {groups.map((g) => (
          <div key={g.key} style={{ marginBottom: 8 }}>
            {g.label && (
              <div style={{ fontSize: 'var(--fs-micro, 10px)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '4px 2px' }}>
                {g.label}{g.sublabel && <span style={{ marginLeft: 6, opacity: 0.7 }}>· {g.sublabel}</span>}
              </div>
            )}
            {g.fmts.map((f) => {
              const idx = gi++
              const on = idx === focused
              return (
                <button key={f.id ?? f.name} onMouseEnter={() => setFocused(idx)}
                  onClick={() => onPick?.(f._isStandard ? null : f)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: on ? 'var(--info-bg)' : 'transparent', color: on ? 'var(--info-text)' : 'var(--text-primary)', fontSize: 'var(--fs-body, 13px)',
                  }}>
                  {f.name}
                  {f.fields?.length > 0 && <span style={{ marginLeft: 8, fontSize: 'var(--fs-tiny, 11px)', color: 'var(--text-muted)' }}>{f.fields.length} fields</span>}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
