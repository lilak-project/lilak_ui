/**
 * Rail — the unified in-tab "menu bar": a left vertical icon rail (items + dividers)
 * plus the active item's panel. One shared design so every service's tab looks the
 * same, driven by a config array instead of a hand-rolled rail per tab/service.
 *
 *   <Rail
 *     items={[
 *       { id: 'detector', label: 'Detector', icon: 'atom' },
 *       { type: 'divider' },
 *       { id: 'style', label: 'Style', icon: 'palette' },
 *     ]}
 *     panels={{ detector: <DetectorEditor/>, style: <StylePanel/> }}
 *   />
 *
 * `items` describe STRUCTURE (order, labels, icons, dividers); `panels` map each
 * item id → the code that renders its content. Controlled via `active`/`onSelect`,
 * or self-managed when those are omitted. `footer` adds extra buttons below the rail.
 */
import { useState } from 'react'

import Icon from '../icons.jsx'

const railStyle = {
  display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 6px',
  width: 68, flex: '0 0 auto', boxSizing: 'border-box',
  background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-lg, 12px)', alignSelf: 'flex-start',
}
const btnBase = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
  border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
  padding: '8px 2px', borderRadius: 10, font: 'inherit',
  fontSize: 'var(--fs-micro, 10px)', lineHeight: 1.15, textAlign: 'center', width: '100%',
}
const sepStyle = { height: 1, alignSelf: 'stretch', margin: '5px 8px', background: 'var(--border-subtle)' }

function isItem(x) { return x && x.type !== 'divider' && x.id != null }

export default function Rail({ items = [], panels = {}, active, onSelect, footer, gap = 12 }) {
  const firstId = items.find(isItem)?.id
  const [innerId, setInnerId] = useState(firstId)
  const controlled = active !== undefined
  const cur = controlled ? active : innerId
  const select = (id) => { if (!controlled) setInnerId(id); onSelect?.(id) }

  return (
    <div style={{ display: 'flex', gap, height: '100%', boxSizing: 'border-box' }}>
      <nav style={railStyle} aria-label="menu">
        {items.map((it, i) => {
          if (!isItem(it)) return <div key={`s${i}`} style={sepStyle} aria-hidden="true" />
          const on = it.id === cur
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => select(it.id)}
              title={it.label}
              aria-current={on ? 'true' : undefined}
              style={{
                ...btnBase,
                ...(on ? { background: 'var(--info-bg)', color: 'var(--info-text)' } : {}),
              }}
              onMouseEnter={(e) => { if (!on) { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
              onMouseLeave={(e) => { if (!on) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
            >
              {it.icon && <Icon name={it.icon} size={18} weight={on ? 'fill' : 'regular'} />}
              {it.label && <span>{it.label}</span>}
            </button>
          )
        })}
        {footer}
      </nav>
      <div style={{ flex: '1 1 auto', minWidth: 0, height: '100%', overflow: 'auto' }}>
        {panels[cur] ?? null}
      </div>
    </div>
  )
}
