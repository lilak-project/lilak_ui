/**
 * CrudTable — a list/table with built-in Add / Edit / Delete, over kit DataTable
 * + CrudForm. The app supplies the columns, the form field schema, and the CRUD
 * callbacks; the kit handles the table, the add/edit form, the delete confirm,
 * and an auto-appended actions column.
 *
 *   <CrudTable
 *     title="API tokens"
 *     columns={[{ key:'name', header:'Name' }, { key:'source_name', header:'Source', mono:true }]}
 *     rows={tokens} rowKey={(r)=>r.id} loading={loading}
 *     formFields={[{ key:'name', label:'Name', required:true }, { key:'source_name', label:'Source' }]}
 *     onCreate={(v)=>api.post('/tokens', v)}
 *     onUpdate={(row,v)=>api.put(`/tokens/${row.id}`, v)}   // omit → no edit
 *     onDelete={(row)=>api.delete(`/tokens/${row.id}`)}     // omit → no delete
 *     canEdit={(row)=>!row.builtin} canDelete={(row)=>row.is_active}
 *     labels={{ add:'New token', confirmDelete:(r)=>`Delete ${r.name}?`, edit:'Edit', delete:'Delete' }}
 *   />
 *
 * Callbacks may be async; the form/delete await them then refresh state in your
 * handler (CrudTable just closes the form). Pass `error`/`busy` to surface form
 * state. Provide your own `extraActions(row)` for per-row custom buttons.
 */
import { useState } from 'react'
import DataTable from '../components/DataTable.jsx'
import Button from '../components/Button.jsx'
import Icon from '../icons.jsx'
import CrudForm from './CrudForm.jsx'

export default function CrudTable({
  title,
  columns = [],
  rows = [],
  rowKey = (r) => r.id,
  formFields,
  formColumns = 2,
  onCreate, onUpdate, onDelete,
  canEdit = () => !!onUpdate,
  canDelete = () => !!onDelete,
  extraActions,
  headerActions,
  loading = false,
  busy = false,
  error,
  labels = {},
  density = 'comfortable',
  zebra = true,
}) {
  const L = { add: 'Add', edit: 'Edit', delete: 'Delete', empty: 'no rows', loading: 'Loading…',
    newTitle: 'New', editTitle: 'Edit', ...labels }
  // mode: null | 'create' | <row being edited>
  const [mode, setMode] = useState(null)
  const editing = mode && mode !== 'create' ? mode : null
  const formOpen = mode != null && formFields

  const iconBtn = (name, color, onClick, title) => (
    <button onClick={(e) => { e.stopPropagation(); onClick() }} title={title}
      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color, padding: 4, borderRadius: 6, display: 'inline-flex' }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-3)'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
      <Icon name={name} size={15} />
    </button>
  )

  const cols = [...columns]
  if (onUpdate || onDelete || extraActions) {
    cols.push({
      key: '__actions', header: '', align: 'right', fit: true,
      render: (row) => (
        <span style={{ display: 'inline-flex', gap: 4, justifyContent: 'flex-end' }}>
          {extraActions?.(row)}
          {onUpdate && canEdit(row) && formFields && iconBtn('edit', 'var(--text-secondary)', () => setMode(row), L.edit)}
          {onDelete && canDelete(row) && iconBtn('trash', 'var(--danger-text)', () => handleDelete(row), L.delete)}
        </span>
      ),
    })
  }

  async function handleSubmit(values) {
    try {
      if (mode === 'create') await onCreate?.(values)
      else await onUpdate?.(editing, values)
      setMode(null)
    } catch {
      // keep the form open on failure; the app surfaces the message via `error`
    }
  }
  async function handleDelete(row) {
    if (L.confirmDelete && typeof window !== 'undefined' && !window.confirm(L.confirmDelete(row))) return
    await onDelete?.(row)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: 'var(--font-sans)' }}>
      {(title || onCreate || headerActions) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {title && <span style={{ fontSize: 'var(--fs-medium, 14px)', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>}
          <div style={{ flex: 1 }} />
          {headerActions}
          {onCreate && formFields && (
            <Button variant="primary" size="sm" onClick={() => setMode('create')} icon>
              <Icon name="plus" size={14} /> {L.add}
            </Button>
          )}
        </div>
      )}

      {formOpen && (
        <CrudForm
          key={editing ? rowKey(editing) : '__new'}
          fields={formFields}
          initial={editing}
          columns={formColumns}
          title={editing ? L.editTitle : L.newTitle}
          submitLabel={editing ? L.edit : L.add}
          busy={busy}
          error={error}
          onSubmit={handleSubmit}
          onCancel={() => setMode(null)}
        />
      )}

      <div style={{ border: '1px solid var(--border-default)', borderRadius: 10, overflow: 'hidden' }}>
        <DataTable
          columns={cols}
          rows={loading ? [] : rows}
          rowKey={rowKey}
          density={density}
          zebra={zebra}
          emptyText={loading ? L.loading : L.empty}
        />
      </div>
    </div>
  )
}
