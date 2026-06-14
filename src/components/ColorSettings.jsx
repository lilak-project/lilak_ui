/**
 * ColorSettings — manage color presets and edit the active theme's tokens live.
 *
 *  • Pick a preset (built-in bright/dark/lowcontrast + your saved customs).
 *  • Edit any token's color → applies live (CSS variable override).
 *  • Save the current edits as a new named preset, or reset.
 *
 *   <ColorSettings labels={{...}} onChange={() => {}} />
 */
import { useState } from 'react'
import ColorPicker from './ColorPicker.jsx'
import Icon from '../icons.jsx'
import { TOKEN_GROUPS, TOKENS } from '../theme/tokens.js'
import {
  listPresets, getActivePreset, applyPreset, saveCustomPreset, deleteCustomPreset,
  setTokenOverride, clearOverrides,
} from '../theme/presets.js'

function readVar(name) {
  if (typeof document === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()
}

export default function ColorSettings({ labels = {}, onChange }) {
  const L = {
    presets: 'Presets', edit: 'Edit colors', save: 'Save as preset', reset: 'Reset',
    name: 'Preset name', del: 'Delete', namePH: 'My palette', ...labels,
  }
  const [presets, setPresets] = useState(listPresets())
  const [active, setActive] = useState(getActivePreset())
  const [overrides, setOverrides] = useState({})       // token → value (this session)
  const [newName, setNewName] = useState('')
  const [, force] = useState(0)

  const refresh = () => { setPresets(listPresets()); onChange?.() }

  function pick(id) {
    applyPreset(id)
    setActive(id)
    setOverrides({})
    force((n) => n + 1)
    onChange?.()
  }

  function edit(name, value) {
    setTokenOverride(name, value)
    setOverrides((o) => ({ ...o, [name]: value }))
  }

  function reset() {
    clearOverrides()
    applyPreset(active)
    setOverrides({})
    force((n) => n + 1)
    onChange?.()
  }

  function save() {
    const base = presets.find((p) => p.id === active)?.base || 'bright'
    const id = saveCustomPreset(newName.trim() || L.namePH, base, overrides)
    setNewName('')
    setActive(id)
    refresh()
  }

  function remove(id) {
    deleteCustomPreset(id)
    if (active === id) pick('bright')
    else refresh()
  }

  const chip = (on) => ({
    border: '1px solid var(--border-default)', borderRadius: 7, padding: '4px 12px', fontSize: 'var(--fs-small, 12px)', cursor: 'pointer',
    background: on ? 'var(--info-bg)' : 'var(--surface)', color: on ? 'var(--info-text)' : 'var(--text-primary)',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  })
  const sectionTitle = { fontSize: 'var(--fs-tiny, 11px)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '14px 0 6px' }

  return (
    <div>
      {/* preset row */}
      <div style={sectionTitle}>{L.presets}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {presets.map((p) => (
          <span key={p.id} style={chip(p.id === active)} onClick={() => pick(p.id)}>
            {p.label}
            {!p.builtin && (
              <button onClick={(e) => { e.stopPropagation(); remove(p.id) }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger-text)', display: 'inline-flex' }} title={L.del}><Icon name="close" size={12} /></button>
            )}
          </span>
        ))}
      </div>

      {/* save current edits as a preset */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={L.namePH}
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: 6, padding: '5px 8px', fontSize: 'var(--fs-small, 12px)', color: 'var(--text-primary)', outline: 'none', width: 160 }} />
        <button onClick={save} disabled={Object.keys(overrides).length === 0}
          style={{ border: '1px solid var(--btn-primary-bg)', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', borderRadius: 6, fontSize: 'var(--fs-small, 12px)', fontWeight: 500, padding: '5px 12px', cursor: 'pointer', opacity: Object.keys(overrides).length ? 1 : 0.5 }}>
          {L.save}
        </button>
        <button onClick={reset} disabled={Object.keys(overrides).length === 0}
          style={{ border: '1px solid var(--border-default)', background: 'var(--surface)', color: 'var(--text-secondary)', borderRadius: 6, fontSize: 'var(--fs-small, 12px)', padding: '5px 12px', cursor: 'pointer', opacity: Object.keys(overrides).length ? 1 : 0.5 }}>
          {L.reset}
        </button>
      </div>

      {/* token editor grouped by category */}
      <div style={sectionTitle}>{L.edit}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {TOKEN_GROUPS.map((group) => (
          <div key={group.id} style={{ background: 'var(--surface)', border: '1px solid var(--border-default)', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 'var(--fs-tiny, 11px)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{group.label}</div>
            {Object.entries(group.tokens).map(([name, def]) => {
              const current = overrides[name] ?? readVar(name)
              const editable = /^#|^rgb/.test(current)   // only solid colors get a swatch picker
              return (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
                  {editable
                    ? <ColorPicker value={/^#/.test(current) ? current : '#000000'} onChange={(v) => edit(name, v)} title={def.label || name} />
                    : <span style={{ width: 20, height: 20, borderRadius: 5, border: '1px dashed var(--border-default)', flexShrink: 0 }} />}
                  <span style={{ fontSize: 'var(--fs-tiny, 11px)', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={def.usage || name}>
                    {def.label || name}
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
