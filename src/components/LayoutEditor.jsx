/**
 * LayoutEditor — edit a service's tab/menu layout config (the data behind <Rail>
 * and the tab strip). Add / hide / remove / reorder tabs; per tab, add / remove /
 * reorder rail menu items and dividers. Structure only — the panel behind each id
 * is code, so ids are shown (and editable) but not "created" here.
 *
 *   <LayoutEditor value={cfg} onChange={setCfg} onSave={save} onReset={reset} dirty saving />
 *
 * Controlled: `value` = { tabs:[...] }, `onChange(next)`. `onSave`/`onReset` render
 * the toolbar buttons when provided. Same component in the service Settings tab and
 * the portal Manage UI.
 */
import { useState } from 'react'

import Button from './Button.jsx'
import Input from './Input.jsx'
import RealIcon from '../icons.jsx'

const move = (arr, i, d) => {
  const j = i + d
  if (j < 0 || j >= arr.length) return arr
  const next = arr.slice()
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}
const removeAt = (arr, i) => arr.filter((_, k) => k !== i)
const updateAt = (arr, i, patch) => arr.map((x, k) => (k === i ? { ...x, ...patch } : x))

const isItem = (x) => x && x.type !== 'divider'
const slug = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item'

const row = { display: 'flex', alignItems: 'center', gap: 6 }
const iconField = { width: 92 }

function ReorderBtns({ i, n, onMove }) {
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column' }}>
      <button type="button" title="위로" disabled={i === 0} onClick={() => onMove(-1)}
        style={{ border: 0, background: 'transparent', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? 'var(--text-muted)' : 'var(--text-secondary)', lineHeight: 1, padding: 0, opacity: i === 0 ? 0.4 : 1 }}>▲</button>
      <button type="button" title="아래로" disabled={i === n - 1} onClick={() => onMove(1)}
        style={{ border: 0, background: 'transparent', cursor: i === n - 1 ? 'default' : 'pointer', color: i === n - 1 ? 'var(--text-muted)' : 'var(--text-secondary)', lineHeight: 1, padding: 0, opacity: i === n - 1 ? 0.4 : 1 }}>▼</button>
    </span>
  )
}

function MenuEditor({ menu = [], onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 22, marginTop: 6 }}>
      {menu.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-small, 12px)' }}>메뉴 항목이 없습니다 (단일 패널 탭).</div>}
      {menu.map((it, i) => (
        <div key={i} style={row}>
          <ReorderBtns i={i} n={menu.length} onMove={(d) => onChange(move(menu, i, d))} />
          {isItem(it) ? (
            <>
              <RealIcon name={it.icon || 'dot'} size={16} />
              <Input size="sm" value={it.label || ''} placeholder="라벨"
                onChange={(e) => onChange(updateAt(menu, i, { label: e.target.value }))} />
              <Input size="sm" style={iconField} value={it.icon || ''} placeholder="아이콘"
                onChange={(e) => onChange(updateAt(menu, i, { icon: e.target.value }))} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro,10px)', color: 'var(--text-muted)' }}>#{it.id}</span>
            </>
          ) : (
            <span style={{ flex: 1, borderTop: '1px dashed var(--border-default)', color: 'var(--text-muted)', fontSize: 'var(--fs-micro,10px)' }}>구분선</span>
          )}
          <Button size="sm" variant="ghost" type="button" onClick={() => onChange(removeAt(menu, i))}>✕</Button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6 }}>
        <Button size="sm" variant="secondary" type="button"
          onClick={() => onChange([...menu, { type: 'item', id: slug('item' + (menu.length + 1)), label: 'Item', icon: 'dot' }])}>+ 항목</Button>
        <Button size="sm" variant="ghost" type="button" onClick={() => onChange([...menu, { type: 'divider' }])}>+ 구분선</Button>
      </div>
    </div>
  )
}

export default function LayoutEditor({ value, onChange, onSave, onReset, dirty = false, saving = false }) {
  const tabs = (value && Array.isArray(value.tabs)) ? value.tabs : []
  const [openId, setOpenId] = useState(null)
  const setTabs = (next) => onChange?.({ ...value, tabs: next })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong>탭 / 메뉴 구성</strong>
        <span style={{ flex: 1 }} />
        {onReset && <Button size="sm" variant="ghost" type="button" onClick={onReset}>기본값으로</Button>}
        {onSave && <Button size="sm" type="button" disabled={!dirty || saving} onClick={onSave}>{saving ? '저장 중…' : '저장'}</Button>}
      </div>

      {tabs.map((tb, i) => {
        const open = openId === tb.id
        return (
          <div key={tb.id || i} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg,10px)', padding: 8, opacity: tb.hidden ? 0.55 : 1 }}>
            <div style={row}>
              <ReorderBtns i={i} n={tabs.length} onMove={(d) => setTabs(move(tabs, i, d))} />
              <RealIcon name={tb.icon || 'dot'} size={18} />
              <Input size="sm" value={tb.label || ''} placeholder="탭 이름"
                onChange={(e) => setTabs(updateAt(tabs, i, { label: e.target.value }))} />
              <Input size="sm" style={iconField} value={tb.icon || ''} placeholder="아이콘"
                onChange={(e) => setTabs(updateAt(tabs, i, { icon: e.target.value }))} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro,10px)', color: 'var(--text-muted)' }}>#{tb.id}</span>
              <span style={{ flex: 1 }} />
              <Button size="sm" variant="ghost" type="button" title={tb.hidden ? '표시' : '숨기기'}
                onClick={() => setTabs(updateAt(tabs, i, { hidden: !tb.hidden }))}>{tb.hidden ? '숨김' : '표시'}</Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => setOpenId(open ? null : tb.id)}>{open ? '메뉴 ▲' : '메뉴 ▼'}</Button>
              <Button size="sm" variant="ghost" type="button" onClick={() => setTabs(removeAt(tabs, i))}>✕</Button>
            </div>
            {open && <MenuEditor menu={tb.menu || []} onChange={(m) => setTabs(updateAt(tabs, i, { menu: m }))} />}
          </div>
        )
      })}

      <div>
        <Button size="sm" variant="secondary" type="button"
          onClick={() => { const id = slug('tab' + (tabs.length + 1)); setTabs([...tabs, { id, label: 'New tab', icon: 'dot', menu: [] }]) }}>+ 탭 추가</Button>
      </div>
    </div>
  )
}
