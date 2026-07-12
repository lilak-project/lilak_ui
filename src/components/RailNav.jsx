/**
 * RailNav — the ONE shared "left menu bar" (vertical icon dock) used across every
 * tab of every service. Before this, each tab hand-rolled its own rail (nptoy's
 * `.simrail`/`.filesrail`, the community dock, the old Rail's nav) so they drifted
 * apart. This is the single source of truth: same chrome, same active look, driven
 * by an `items` array.
 *
 *   <RailNav
 *     items={[
 *       { id: 'detector', label: 'Detector', icon: 'atom', on: active === 'detector' },
 *       { type: 'divider' },
 *       { id: 'run', label: 'run', Icon: Lightning, tone: 'run', disabled: !idle },
 *     ]}
 *     onSelect={(id) => setActive(id)}
 *   />
 *
 * Each item carries its OWN `on` (active) flag, so the parent owns selection — this
 * supports single-select, click-to-toggle, AND multiple-open-at-once (geometry)
 * without the component caring which. `onSelect(id)` fires on click unless the item
 * has its own `onClick`.
 *
 * Item fields:
 *   id, label            required for real items (label doubles as the tooltip)
 *   short                compact text under the icon (falls back to label)
 *   icon | Icon          a kit semantic icon NAME (string) OR a Phosphor icon
 *                        COMPONENT (nptoy passes components) — either works
 *   on                   active (filled) state — parent-controlled
 *   disabled             dimmed + non-interactive
 *   badge                small corner badge (number/string), hidden when falsy
 *   tone                 'start' | 'stop' | 'run' → coloured ACTION button
 *                        (outlined text, not filled) for session controls
 *   dup, changed, needfill   outline decorations (setup's file/editor states)
 *   onClick              per-item handler (else onSelect(id))
 *   weight               icon weight override (default fill when on, else regular)
 * or { type: 'divider' }
 *
 * `float` positions the rail absolutely (over a 3D canvas, as geometry/simulation
 * do); default is in-flow. `footer` renders extra nodes below the items.
 */
import Icon from '../icons.jsx'

const TONE = { start: '#16a34a', stop: '#dc2626', run: 'var(--btn-primary-bg)' }

function isItem(x) { return x && x.type !== 'divider' && x.id != null }

export default function RailNav({ items = [], onSelect, footer, float = false, width = 60, gap = 4, style }) {
  const wrap = {
    boxSizing: 'border-box', width, flex: '0 0 auto', alignSelf: 'flex-start',
    display: 'flex', flexDirection: 'column', gap, padding: 6,
    border: '1px solid var(--border-default)', borderRadius: 12,
    background: 'var(--surface-2)', boxShadow: '0 1px 3px rgba(0,0,0,.06)',
    ...(float ? { position: 'absolute', top: 12, left: 12, zIndex: 5 } : {}),
    ...style,
  }

  const btnBase = {
    position: 'relative', width: '100%', boxSizing: 'border-box',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    padding: '8px 2px', border: '1px solid transparent', borderRadius: 10,
    background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
    font: 'inherit', transition: 'background .12s, color .12s',
  }

  // Resting (non-hover) colours for one item, given its state.
  const rest = (it) => {
    if (it.disabled) return { background: 'transparent', color: 'var(--text-muted)' }
    if (it.tone) return { background: 'transparent', color: TONE[it.tone] || 'var(--text-secondary)' }
    if (it.on) return { background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)' }
    return { background: 'transparent', color: 'var(--text-secondary)' }
  }
  // Outline / border decorations (setup file + editor states).
  const deco = (it) => {
    const d = {}
    if (it.dup) d.border = it.on ? '1.5px solid var(--btn-primary-bg)' : '1.5px solid var(--border-default)'
    if (it.needfill) { d.outline = '1.5px dashed var(--btn-primary-bg)'; d.outlineOffset = '-3px' }
    if (it.changed) { d.outline = '2px solid var(--btn-primary-bg)'; d.outlineOffset = '-3px' }
    return d
  }

  return (
    <nav style={wrap} aria-label="menu">
      {items.map((it, i) => {
        if (!isItem(it)) return <div key={`s${i}`} aria-hidden="true" style={{ height: 1, alignSelf: 'stretch', margin: '5px 8px', background: 'var(--border-subtle)', opacity: 0.9 }} />
        const IC = it.Icon
        const w = it.weight || (it.on ? 'fill' : 'regular')
        const resting = rest(it)
        return (
          <button
            key={it.id}
            type="button"
            title={it.title || it.label}
            disabled={it.disabled}
            aria-current={it.on ? 'true' : undefined}
            onClick={it.disabled ? undefined : (it.onClick || (() => onSelect?.(it.id)))}
            onMouseEnter={(e) => { if (!it.disabled && !it.on) { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = it.tone ? (TONE[it.tone] || 'var(--text-primary)') : 'var(--text-primary)' } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = resting.background; e.currentTarget.style.color = resting.color }}
            style={{
              ...btnBase, ...resting, ...deco(it),
              ...(it.disabled ? { opacity: 0.38, cursor: 'not-allowed' } : {}),
            }}
          >
            {IC ? <IC size={20} weight={w} /> : it.icon ? <Icon name={it.icon} size={20} weight={w} /> : null}
            <span style={{ fontSize: 9.5, letterSpacing: '0.02em', lineHeight: 1.15, textAlign: 'center' }}>{it.short || it.label}</span>
            {it.badge ? (
              <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontSize: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{it.badge}</span>
            ) : null}
          </button>
        )
      })}
      {footer}
    </nav>
  )
}
