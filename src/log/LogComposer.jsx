/**
 * LogComposer — compose a log entry, driven by a format (elog model).
 *
 * Built-in fields (via getFields): title, run (+run_type), beam, target, level,
 * tags, body (markdown, with preview), attachments. Custom fields: text and
 * number_entry (mean ± error via NumberEntryField). A format can be chosen with
 * the FormatPicker; pass the available `formats` to enable the picker button.
 *
 *   <LogComposer
 *     formats={formats}             // optional, enables format picker
 *     format={format} onFormatChange={setFormat}
 *     authorName={name}
 *     onSubmit={(entry) => addEntry(entry)}
 *     onUpload={async (entryId, files) => {…}}   // optional real upload hook
 *     labels={{...}}
 *   />
 *
 * Produces an elog-shaped entry:
 *   { title, body, level, tags:[{name}], run_number, run_type, beam, target,
 *     author_name, created_at, source:'human', format_id,
 *     format_fields_json:{ key: value|{raw,variant,value,error} },
 *     attachments:[{name}] }
 */
import { useEffect, useState } from 'react'
import { getFields, normalizeBuiltinId, RUN_TYPES, computeNumberEntry } from './formatUtils.js'
import NumberEntryField from './NumberEntryField.jsx'
import Markdown from './Markdown.jsx'
import FormatPicker from './FormatPicker.jsx'
import Icon from '../icons.jsx'

const LEVELS = ['info', 'warning', 'error', 'critical']

/** Build the editable draft from an existing entry (edit mode) or blanks. */
function buildDraft(initial) {
  return {
    title: initial?.title || '',
    run_number: initial?.run_number != null ? String(initial.run_number) : '',
    run_type: initial?.run_type || 'IDLE',
    beam: initial?.beam || '',
    target: initial?.target || '',
    tags: Array.isArray(initial?.tags) ? initial.tags.map((t) => t.name || t).join(', ') : (initial?.tags || ''),
    body: initial?.body || '',
    level: initial?.level || 'info',
  }
}

const field = {
  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
  borderRadius: 6, padding: '5px 8px', fontSize: 'var(--fs-small, 12px)', outline: 'none',
  color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
}
const labelCls = { fontSize: 'var(--fs-tiny, 11px)', color: 'var(--text-muted)', marginBottom: 3 }

export default function LogComposer({
  formats = null, format = null, onFormatChange,
  authorName = 'anonymous', onSubmit, onUpload, labels = {},
  initial = null,          // existing entry → edit mode (pre-fills fields)
  editKey = null,          // stable id of the thing being edited; reset on change
  onCancel,                // show a Cancel button when provided
}) {
  const editing = editKey != null || initial != null
  const L = {
    title: 'Title', run: 'Run #', beam: 'Beam', target: 'Target',
    tags: 'tags (comma-separated)', body: 'Body (markdown)…',
    add: editing ? 'Save' : 'Add log', cancel: 'Cancel',
    format: 'Format', standard: 'Standard', write: 'Write', preview: 'Preview',
    attachments: 'Attachments', drop: 'drop files or click', ...labels,
  }
  const fields = getFields(format)
  const has = (id) => fields.some((f) => f.field_type === 'builtin' && normalizeBuiltinId(f.builtin_id) === id)
  const customFields = fields.filter((f) => f.field_type !== 'builtin')

  const [draft, setDraft] = useState(() => buildDraft(initial))
  const [custom, setCustom] = useState(() => initial?.custom || initial?.format_fields_json || {})
  const [files, setFiles] = useState([])          // [{name, file}]
  const [showPreview, setShowPreview] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))

  // Re-seed the form only when the edited target changes (not on every render).
  useEffect(() => {
    setDraft(buildDraft(initial))
    setCustom(initial?.custom || initial?.format_fields_json || {})
    setFiles([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editKey])

  function submit() {
    if (!draft.title.trim() && !draft.body.trim()) return
    const format_fields_json = {}
    for (const f of customFields) {
      const val = custom[f.key]
      if (f.field_type === 'number_entry') {
        const variant = val?.variant || 'single'
        const raw = val?.raw || {}
        format_fields_json[f.key] = { raw, variant, ...computeNumberEntry(raw, variant) }
      } else {
        format_fields_json[f.key] = val ?? ''
      }
    }
    const entry = {
      id: initial?.id ?? Date.now(),
      title: draft.title.trim(),
      body: draft.body.trim(),
      level: draft.level,
      tags: draft.tags.split(',').map((s) => s.trim()).filter(Boolean).map((name) => ({ name })),
      run_number: draft.run_number.trim(),
      run_number_type: 'single',
      run_type: draft.run_type,
      beam: draft.beam.trim(),
      target: draft.target.trim(),
      author_name: authorName,
      created_at: new Date().toISOString(),
      source: 'human',
      format_id: format?.id ?? null,
      format_fields_json,
      attachments: files.map((f) => ({ name: f.name })),
      attachment_count: files.length,
    }
    onSubmit?.(entry)
    if (onUpload && files.length) onUpload(entry.id, files.map((f) => f.file).filter(Boolean))
    // In edit mode the parent decides what happens next (close, refetch …); only
    // a fresh "new log" composer clears itself after submitting.
    if (!editing) {
      setDraft({ title: '', run_number: '', run_type: draft.run_type, beam: '', target: '', tags: '', body: '', level: 'info' })
      setCustom({}); setFiles([])
    }
  }

  const onEnter = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit() } }
  const addFiles = (list) => setFiles((prev) => [...prev, ...Array.from(list).map((file) => ({ name: file.name, file }))])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, background: 'var(--surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg, 10px)' }} onKeyDown={onEnter}>

      {/* format picker bar */}
      {formats && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-small, 12px)' }}>
          <span style={{ color: 'var(--text-muted)' }}>{L.format}:</span>
          <button onClick={() => setPickerOpen(true)} style={{ ...field, width: 'auto', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-sans)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {format?.name ?? L.standard} <Icon name="caret-down" size={12} />
          </button>
        </div>
      )}

      {/* run row */}
      {has('run') && (
        <div style={{ display: 'flex', gap: 6 }}>
          <select value={draft.run_type} onChange={(e) => set('run_type', e.target.value)} style={{ ...field, width: 130, fontFamily: 'var(--font-mono)' }}>
            {RUN_TYPES.map((rt) => <option key={rt.id} value={rt.id}>{rt.id} · {rt.labelEn}</option>)}
          </select>
          <input value={draft.run_number} onChange={(e) => set('run_number', e.target.value)} placeholder={L.run} style={{ ...field, width: 110, fontFamily: 'var(--font-mono)' }} />
          {has('beam') && <input value={draft.beam} onChange={(e) => set('beam', e.target.value)} placeholder={L.beam} style={{ ...field, flex: 1, fontFamily: 'var(--font-mono)' }} />}
          {has('target') && <input value={draft.target} onChange={(e) => set('target', e.target.value)} placeholder={L.target} style={{ ...field, flex: 1, fontFamily: 'var(--font-mono)' }} />}
        </div>
      )}

      {/* title + level */}
      <div style={{ display: 'flex', gap: 6 }}>
        {has('title') && <input value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder={L.title} style={{ ...field, flex: 1 }} />}
        <select value={draft.level} onChange={(e) => set('level', e.target.value)} style={{ ...field, width: 110 }}>
          {LEVELS.map((lv) => <option key={lv} value={lv}>{lv}</option>)}
        </select>
      </div>

      {/* custom fields */}
      {customFields.map((f) => (
        <div key={f.key}>
          <div style={labelCls}>{f.label}{f.required ? ' *' : ''}</div>
          {f.field_type === 'number_entry' ? (
            <NumberEntryField
              variant={custom[f.key]?.variant || f.number_variant || 'single'}
              value={custom[f.key]?.raw}
              onChange={(raw) => setCustom((c) => ({ ...c, [f.key]: { raw, variant: c[f.key]?.variant || f.number_variant || 'single' } }))}
            />
          ) : (
            <input value={custom[f.key] ?? ''} onChange={(e) => setCustom((c) => ({ ...c, [f.key]: e.target.value }))} style={{ ...field, width: '100%' }} />
          )}
        </div>
      ))}

      {/* tags */}
      {has('tags') && <input value={draft.tags} onChange={(e) => set('tags', e.target.value)} placeholder={L.tags} style={{ ...field, fontFamily: 'var(--font-mono)' }} />}

      {/* body with write/preview toggle */}
      {has('body') && (
        <div>
          <div style={{ display: 'flex', gap: 2, marginBottom: 4 }}>
            {[['write', L.write], ['preview', L.preview]].map(([id, lbl]) => (
              <button key={id} onClick={() => setShowPreview(id === 'preview')}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--fs-small, 12px)', padding: '2px 8px',
                  borderBottom: `2px solid ${(showPreview === (id === 'preview')) ? 'var(--border-focus)' : 'transparent'}`,
                  color: (showPreview === (id === 'preview')) ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {lbl}
              </button>
            ))}
          </div>
          {showPreview ? (
            <div style={{ ...field, minHeight: 56, fontFamily: 'var(--font-sans)' }}>
              {draft.body.trim() ? <Markdown>{draft.body}</Markdown> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
            </div>
          ) : (
            <textarea value={draft.body} onChange={(e) => set('body', e.target.value)} placeholder={L.body} rows={3}
              style={{ ...field, width: '100%', resize: 'vertical', fontFamily: 'var(--font-mono)' }} />
          )}
        </div>
      )}

      {/* attachments */}
      {has('attachments') && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files) }}
          style={{ border: '1px dashed var(--border-strong)', borderRadius: 8, padding: 8, fontSize: 'var(--fs-small, 12px)' }}>
          <label style={{ cursor: 'pointer', color: 'var(--text-link)' }}>
            {L.drop}
            <input type="file" multiple style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files)} />
          </label>
          {files.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {files.map((f, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-tiny, 11px)', fontFamily: 'var(--font-mono)', background: 'var(--surface-2)', borderRadius: 6, padding: '2px 8px' }}>
                  {f.name}
                  <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger-text)', display: 'inline-flex' }}><Icon name="close" size={12} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        {onCancel && (
          <button onClick={onCancel} style={{ minWidth: 70, border: '1px solid var(--border-default)', background: 'var(--surface)', color: 'var(--text-secondary)', borderRadius: 6, fontSize: 'var(--fs-small, 12px)', padding: '6px 14px', cursor: 'pointer' }}>
            {L.cancel}
          </button>
        )}
        <button onClick={submit} style={{ minWidth: 80, border: '1px solid var(--btn-primary-bg)', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', borderRadius: 6, fontSize: 'var(--fs-small, 12px)', fontWeight: 500, padding: '6px 16px', cursor: 'pointer' }}>
          {L.add}
        </button>
      </div>

      {pickerOpen && formats && (
        <FormatPicker formats={formats} standardLabel={L.standard}
          onPick={(f) => { onFormatChange?.(f); setPickerOpen(false) }} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  )
}
