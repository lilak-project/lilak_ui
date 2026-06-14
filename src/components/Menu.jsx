/**
 * Menu — lightweight dropdown. Click the trigger to open a panel of grouped,
 * selectable items. Used for compact settings (theme, language) in a top bar.
 *
 *   <Menu
 *     trigger={<Button variant="ghost">⚙</Button>}
 *     align="right"
 *     sections={[
 *       { label: 'Theme', items: themes.map(t => ({ id:t.id, label:t.label, active:t.id===theme, onSelect:()=>setTheme(t.id) })) },
 *       { label: 'Language', items: langs.map(l => ({ id:l, label:l.toUpperCase(), active:l===lang, onSelect:()=>setLang(l) })) },
 *     ]}
 *   />
 */
import { useEffect, useRef, useState } from 'react'
import Icon from '../icons.jsx'

export default function Menu({ trigger, sections = [], align = 'right', width = 200, open: openProp, onOpenChange }) {
  const controlled = openProp != null
  const [openState, setOpenState] = useState(false)
  const open = controlled ? openProp : openState
  const setOpen = (v) => { const next = typeof v === 'function' ? v(open) : v; controlled ? onOpenChange?.(next) : setOpenState(next) }
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    function onEsc(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc) }
  }, [open])

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <span onClick={() => setOpen((o) => !o)}>{trigger}</span>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align]: 0,
            zIndex: 60,
            width,
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md, 8px)',
            boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
            padding: 4,
            fontFamily: 'var(--font-sans)',
          }}
        >
          {sections.map((sec, si) => (
            <div key={si} style={{ marginTop: si ? 4 : 0, paddingTop: si ? 4 : 0, borderTop: si ? '1px solid var(--border-subtle)' : 'none' }}>
              {sec.label && (
                <div style={{ fontSize: 'var(--fs-micro, 10px)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '4px 8px 2px' }}>
                  {sec.label}
                </div>
              )}
              {sec.items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => { it.onSelect?.(); if (!it.keepOpen) setOpen(false) }}
                  disabled={it.disabled}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                    background: it.active ? 'var(--info-bg)' : 'transparent',
                    border: 'none', borderRadius: 6, padding: '5px 8px',
                    fontSize: 'var(--fs-small, 12px)', textAlign: 'left',
                    cursor: it.disabled ? 'not-allowed' : 'pointer', opacity: it.disabled ? 0.4 : 1,
                    color: it.danger ? 'var(--danger-text)' : it.active ? 'var(--info-text)' : 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => { if (!it.active) e.currentTarget.style.background = 'var(--surface-2)' }}
                  onMouseLeave={(e) => { if (!it.active) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ width: 14, display: 'inline-flex', justifyContent: 'center' }}>{it.active ? <Icon name="check" size={13} weight="bold" /> : ''}</span>
                  <span style={{ flex: 1 }}>{it.label}</span>
                  {it.hint && <span style={{ fontSize: 'var(--fs-tiny, 11px)', color: 'var(--text-muted)' }}>{it.hint}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
