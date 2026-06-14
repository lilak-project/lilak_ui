/**
 * Pagination — prev / page-info (click to jump) / next. Prop-driven and i18n-
 * agnostic: pass label strings so the host controls wording/language.
 *
 *   <Pagination page={p} pageSize={20} total={n} onPageChange={setP}
 *     labels={{ prev:t('page_prev'), next:t('page_next'),
 *               info:(p,tp,total)=>t('page_info',p,tp,total) }} />
 */
import { useState } from 'react'

export default function Pagination({ page, pageSize, total, onPageChange, loading, labels = {} }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const [inputVal, setInputVal] = useState('')
  const [editing, setEditing] = useState(false)
  if (totalPages <= 1) return null

  const prev = labels.prev ?? 'Prev'
  const next = labels.next ?? 'Next'
  const info = labels.info ?? ((p, tp, t) => `${p} / ${tp} · ${t}`)

  const btn = (disabled) => ({
    padding: '4px 12px', borderRadius: 8, fontSize: 'var(--fs-body, 13px)',
    borderWidth: 1, borderStyle: 'solid',
    borderColor: disabled ? 'var(--border-subtle)' : 'var(--border-default)',
    backgroundColor: disabled ? 'var(--surface-2)' : 'transparent',
    color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
    cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background-color .12s',
  })

  function goTo(raw) {
    const n = parseInt(raw, 10)
    if (!isNaN(n) && n >= 1 && n <= totalPages && n !== page) onPageChange(n)
    setInputVal('')
  }
  const prevDisabled = loading || page <= 1
  const nextDisabled = loading || page >= totalPages

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, fontFamily: 'var(--font-sans)' }}>
      <button disabled={prevDisabled} onClick={() => onPageChange(page - 1)} style={btn(prevDisabled)}
        onMouseEnter={(e) => { if (!prevDisabled) e.currentTarget.style.backgroundColor = 'var(--surface-2)' }}
        onMouseLeave={(e) => { if (!prevDisabled) e.currentTarget.style.backgroundColor = 'transparent' }}>{prev}</button>

      <div style={{ display: 'flex', alignItems: 'center', fontSize: 'var(--fs-body, 13px)', color: 'var(--text-secondary)' }}>
        {editing ? (
          <input autoFocus type="number" min={1} max={totalPages} value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={() => { goTo(inputVal); setEditing(false) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { goTo(inputVal); setEditing(false) }
              if (e.key === 'Escape') { setInputVal(''); setEditing(false) }
            }}
            style={{ width: 56, textAlign: 'center', borderRadius: 6, padding: '2px 4px', fontSize: 'var(--fs-body, 13px)',
              borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border-focus)',
              backgroundColor: 'var(--surface)', color: 'var(--text-primary)', outline: 'none' }} />
        ) : (
          <button onClick={() => { setInputVal(String(page)); setEditing(true) }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 'var(--fs-body, 13px)', padding: '0 4px' }}>
            {info(page, totalPages, total)}
          </button>
        )}
      </div>

      <button disabled={nextDisabled} onClick={() => onPageChange(page + 1)} style={btn(nextDisabled)}
        onMouseEnter={(e) => { if (!nextDisabled) e.currentTarget.style.backgroundColor = 'var(--surface-2)' }}
        onMouseLeave={(e) => { if (!nextDisabled) e.currentTarget.style.backgroundColor = 'transparent' }}>{next}</button>
    </div>
  )
}
