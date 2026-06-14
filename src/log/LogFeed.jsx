/**
 * LogFeed — the log tab: a format-driven composer above a keyboard-navigable
 * feed of LogEntryCards. This is the drop-in piece for building the real log
 * tab on top of elog data.
 *
 * Keyboard (when `active`):
 *   ↓ / j   next entry      ↑ / k   prev entry      space  expand/collapse
 *
 *   <LogFeed
 *     active={tab === 'log'}
 *     entries={entries}
 *     format={null}
 *     authorName={name}
 *     onCreate={(entry) => setEntries([entry, ...entries])}
 *     viewMode="normal"            // 'brief' | 'normal' | 'rich'
 *     labels={{...}}
 *   />
 */
import { useEffect, useRef, useState } from 'react'
import LogEntryCard from './LogEntryCard.jsx'
import LogComposer from './LogComposer.jsx'

export default function LogFeed({
  entries = [], formats = null, format = null, onFormatChange, authorName = 'anonymous',
  onCreate, onUpload, active = true, viewMode = 'normal', labels = {}, composerLabels = {},
}) {
  const [sel, setSel] = useState(0)
  const [open, setOpen] = useState(() => new Set())
  const rowsRef = useRef([])

  useEffect(() => { if (sel >= entries.length) setSel(Math.max(0, entries.length - 1)) }, [entries.length, sel])

  useEffect(() => {
    if (!active) return
    function onKey(e) {
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(entries.length - 1, s + 1)) }
      else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)) }
      else if (e.key === ' ') {
        e.preventDefault()
        const id = entries[sel]?.id
        if (id == null) return
        setOpen((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, entries, sel])

  useEffect(() => { rowsRef.current[sel]?.scrollIntoView({ block: 'nearest' }) }, [sel])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <LogComposer
        formats={formats} format={format} onFormatChange={onFormatChange}
        authorName={authorName} labels={composerLabels} onUpload={onUpload}
        onSubmit={(entry) => { onCreate?.(entry); setSel(0) }} />
      {entries.length === 0 && (
        <div style={{ padding: 18, textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--fs-body, 13px)' }}>
          {labels.empty ?? 'No entries'}
        </div>
      )}
      {entries.map((e, i) => (
        <div key={e.id} ref={(el) => (rowsRef.current[i] = el)}>
          <LogEntryCard
            entry={e}
            viewMode={viewMode}
            focused={i === sel}
            expanded={open.has(e.id)}
            onClick={() => setSel(i)}
          />
        </div>
      ))}
    </div>
  )
}
