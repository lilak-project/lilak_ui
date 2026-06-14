/**
 * CrudForm — a schema-driven form. Give it a list of field specs and it renders
 * labeled inputs in a grid with Save / Cancel. Used standalone or by CrudTable.
 *
 *   <CrudForm
 *     fields={[
 *       { key: 'name', label: 'Name', required: true, placeholder: 'e.g. DAQ' },
 *       { key: 'role', label: 'Role', type: 'select', options: ['user','manager'] },
 *       { key: 'active', label: 'Active', type: 'checkbox' },
 *       { key: 'note', label: 'Note', type: 'textarea', full: true },
 *       { key: 'color', label: 'Color', type: 'color' },
 *       { key: 'extra', label: 'Custom', render: (val,set,row)=><X/> },
 *     ]}
 *     initial={editRow}            // null/undefined → create mode (blank)
 *     onSubmit={(values)=>…} onCancel={()=>…}
 *     title="New token" submitLabel="Create" busy={saving} error={err}
 *   />
 *
 * field.type: text(default) | number | email | password | textarea | select |
 *             checkbox | color | custom (use field.render). `full` spans the row.
 */
import { useState } from 'react'
import Button from '../components/Button.jsx'
import ColorPicker from '../components/ColorPicker.jsx'
import Icon from '../icons.jsx'

const fieldStyle = {
  width: '100%', background: 'var(--input-bg)', borderWidth: 1, borderStyle: 'solid',
  borderColor: 'var(--input-border)', borderRadius: 7, padding: '6px 9px', fontSize: 'var(--fs-body, 13px)',
  outline: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
}

/** Password input with an eye toggle (same look as the rest of the fields). */
function PasswordInput({ value, onChange, placeholder, required, disabled }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input type={show ? 'text' : 'password'} value={value} onChange={onChange}
        placeholder={placeholder} required={required} disabled={disabled}
        style={{ ...fieldStyle, paddingRight: 34, opacity: disabled ? 0.6 : 1 }} />
      <button type="button" tabIndex={-1} onClick={() => setShow((s) => !s)}
        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex' }}>
        <Icon name={show ? 'eye-off' : 'eye'} size={15} />
      </button>
    </div>
  )
}

function seed(fields, initial) {
  const v = {}
  for (const f of fields) {
    const init = initial ? initial[f.key] : undefined
    v[f.key] = init !== undefined && init !== null ? init
      : f.default !== undefined ? f.default
      : f.type === 'checkbox' ? false : ''
  }
  return v
}

export default function CrudForm({
  fields = [], initial = null, onSubmit, onCancel,
  title, submitLabel, cancelLabel = 'Cancel', busy = false, error, columns = 2,
}) {
  const [values, setValues] = useState(() => seed(fields, initial))
  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }))
  const editing = !!initial

  function submit(e) {
    e?.preventDefault()
    if (busy) return
    onSubmit?.(values)
  }

  function renderInput(f) {
    const v = values[f.key]
    const disabled = !!(f.disabled || (f.disabledOnEdit && editing))
    const required = !!(f.required || (f.requiredOnCreate && !editing))
    const dis = disabled ? { opacity: 0.6 } : null
    if (f.render) return f.render(v, (nv) => set(f.key, nv), values)
    switch (f.type) {
      case 'textarea':
        return <textarea value={v} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} rows={f.rows || 3}
          disabled={disabled} style={{ ...fieldStyle, resize: 'vertical', ...dis }} />
      case 'select':
        return (
          <select value={v} onChange={(e) => set(f.key, e.target.value)} disabled={disabled} style={{ ...fieldStyle, ...dis }}>
            {!required && <option value="">{f.placeholder || '—'}</option>}
            {(f.options || []).map((o) => {
              const val = typeof o === 'object' ? o.value : o
              const lbl = typeof o === 'object' ? o.label : o
              return <option key={val} value={val}>{lbl}</option>
            })}
          </select>
        )
      case 'checkbox':
        return (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-body, 13px)', color: 'var(--text-primary)' }}>
            <input type="checkbox" checked={!!v} onChange={(e) => set(f.key, e.target.checked)} disabled={disabled} />
            {f.checkboxLabel || ''}
          </label>
        )
      case 'color':
        return <ColorPicker value={v || '#000000'} onChange={(nv) => set(f.key, nv)} size={24} />
      case 'password':
        return <PasswordInput value={v} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} required={required} disabled={disabled} />
      default:
        return <input type={f.type || 'text'} value={v} onChange={(e) => set(f.key, e.target.value)}
          placeholder={f.placeholder} required={required} disabled={disabled} style={{ ...fieldStyle, ...dis }} />
    }
  }

  return (
    <form onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.stopPropagation(); onCancel?.() }
        else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(e) }
      }}
      style={{
      border: '1px solid var(--border-default)', borderRadius: 10, background: 'var(--surface)',
      padding: 16, fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {title && <div style={{ fontSize: 'var(--fs-medium, 14px)', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>}
      {error && <div style={{ fontSize: 'var(--fs-small, 12px)', padding: '6px 10px', borderRadius: 7, backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 12 }}>
        {fields.map((f) => (
          <div key={f.key} style={{ gridColumn: f.full || f.type === 'textarea' ? '1 / -1' : undefined }}>
            <div style={{ fontSize: 'var(--fs-tiny, 11px)', color: 'var(--text-muted)', marginBottom: 3 }}>{f.label}{f.required ? ' *' : ''}</div>
            {renderInput(f)}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {onCancel && <Button variant="ghost" size="sm" type="button" onClick={onCancel}>{cancelLabel}</Button>}
        <Button variant="primary" size="sm" type="submit" disabled={busy}>
          {busy ? '…' : (submitLabel || (editing ? 'Save' : 'Create'))}
        </Button>
      </div>
    </form>
  )
}
