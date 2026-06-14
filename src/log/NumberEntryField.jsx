/**
 * NumberEntryField — input widget for the `number_entry` field type.
 * Faithful port of lilak_elog's NumberEntryField, kit-token styled.
 *
 *  • single   — one numeric input.  main = value,  error = 0.
 *  • range    — min + max.          main = mid,    error = half-width.
 *  • multiple — N slots.            main = mean,   error = sample stddev.
 *
 * Controlled: the parent owns the raw value object ({single}|{min,max}|{values}).
 */
import { computeNumberEntry } from './formatUtils.js'
import Icon from '../icons.jsx'

const inputStyle = {
  width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)',
  borderRadius: 6, padding: '4px 8px', fontSize: 'var(--fs-small, 12px)', color: 'var(--text-primary)',
  outline: 'none', fontFamily: 'var(--font-mono)',
}

function NumInput({ value, onChange, placeholder }) {
  return (
    <input type="number" step="any" style={inputStyle}
      value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  )
}

function fmt(n) {
  if (n === 0) return '0'
  return parseFloat(Number(n).toPrecision(5)).toString()
}

function ResultPreview({ canonical }) {
  const { value, error } = canonical
  return (
    <div style={{ fontSize: 'var(--fs-tiny, 11px)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
      = <strong style={{ color: 'var(--text-primary)' }}>{fmt(value)}</strong>{error ? <> ± {fmt(error)}</> : null}
    </div>
  )
}

const addBtnStyle = {
  border: '1px solid var(--border-default)', borderRadius: 6, fontSize: 'var(--fs-body, 13px)', fontWeight: 500,
  padding: '0 8px', color: 'var(--text-secondary)', background: 'var(--surface-2)', cursor: 'pointer',
}

export default function NumberEntryField({ variant = 'single', value, onChange, disabled = false, inline = false }) {
  const v = value && typeof value === 'object' ? value : {}
  const canonical = computeNumberEntry(v, variant)

  if (variant === 'range') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <NumInput value={v.min} onChange={(x) => onChange({ ...v, min: x })} placeholder="min" />
        <span style={{ color: 'var(--text-muted)' }}>~</span>
        <NumInput value={v.max} onChange={(x) => onChange({ ...v, max: x })} placeholder="max" />
        <ResultPreview canonical={canonical} />
      </div>
    )
  }

  if (variant === 'multiple') {
    const existing = Array.isArray(v.values) ? v.values : []
    const slots = existing.length ? existing : ['']
    const setSlot = (i, x) => { const n = slots.slice(); n[i] = x; onChange({ ...v, values: n }) }
    const addSlot = () => onChange({ ...v, values: [...slots, ''] })
    const removeSlot = (i) => { const n = slots.filter((_, j) => j !== i); onChange({ ...v, values: n.length ? n : [''] }) }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <ResultPreview canonical={canonical} />
        {slots.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 2, width: 90 }}>
            <NumInput value={s} onChange={(x) => setSlot(i, x)} placeholder={`#${i + 1}`} />
            {slots.length > 1 && !disabled && (
              <button type="button" onClick={() => removeSlot(i)} style={{ color: 'var(--danger-text)', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex' }} title="remove"><Icon name="close" size={12} /></button>
            )}
          </div>
        ))}
        {!disabled && <button type="button" onClick={addSlot} style={addBtnStyle} title="add value">+</button>}
      </div>
    )
  }

  // single
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <NumInput value={v.single ?? v.value} onChange={(x) => onChange({ single: x })} placeholder="value" />
      <ResultPreview canonical={canonical} />
    </div>
  )
}
