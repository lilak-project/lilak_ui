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

import RailNav from './RailNav.jsx'

function isItem(x) { return x && x.type !== 'divider' && x.id != null }

export default function Rail({ items = [], panels = {}, active, onSelect, footer, gap = 12 }) {
  const firstId = items.find(isItem)?.id
  const [innerId, setInnerId] = useState(firstId)
  const controlled = active !== undefined
  const cur = controlled ? active : innerId
  const select = (id) => { if (!controlled) setInnerId(id); onSelect?.(id) }

  // The rail chrome is the shared RailNav (each item carries its own `on`); this
  // component only adds the single-active panel column beside it.
  const navItems = items.map((it) => (isItem(it) ? { ...it, on: it.id === cur } : it))

  return (
    <div style={{ display: 'flex', gap, height: '100%', boxSizing: 'border-box' }}>
      <RailNav items={navItems} onSelect={select} footer={footer} />
      <div style={{ flex: '1 1 auto', minWidth: 0, height: '100%', overflow: 'auto' }}>
        {panels[cur] ?? null}
      </div>
    </div>
  )
}
