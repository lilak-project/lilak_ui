/**
 * SubTabs — the one in-page tab strip used everywhere a tab has sub-views
 * (Data: Dashboard/Sheet · Files: Gallery/Files · Schedule: Month/H/V). Thin
 * underline style, sits flush under the top bar.
 *
 *   <SubTabs tabs={[['graph','Dashboard'],['sheet','Sheet']]} active={sub} onChange={setSub} />
 *   <SubTabs tabs={[{id,label,icon}]} active={id} onChange={fn} />
 */
import Icon from '../icons.jsx'

export default function SubTabs({ tabs = [], active, onChange, right, style }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 2,
      borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'var(--border-default)',
      ...style,
    }}>
      {tabs.map((t) => {
        const id = t.id ?? t[0]
        const label = t.label ?? t[1]
        const icon = t.icon
        const on = id === active
        return (
          <button
            key={id}
            onClick={() => onChange?.(id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', marginBottom: -1, cursor: 'pointer',
              background: 'none', border: 'none', outline: 'none',
              borderBottomWidth: 2, borderBottomStyle: 'solid',
              fontSize: 'var(--fs-small, 12px)', fontWeight: 500, fontFamily: 'var(--font-sans)',
              color: on ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottomColor: on ? 'var(--text-primary)' : 'transparent',
              transition: 'color .12s, border-color .12s',
            }}
            onMouseEnter={(e) => { if (!on) e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={(e) => { if (!on) e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            {icon && <Icon name={icon} size={14} weight={on ? 'fill' : 'regular'} />}
            {label}
          </button>
        )
      })}
      {right && <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center' }}>{right}</span>}
    </div>
  )
}
