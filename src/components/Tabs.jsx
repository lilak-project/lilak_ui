/**
 * Tabs — underline tab bar. Compact, theme-aware.
 *
 *   <Tabs tabs={[{id:'run',label:'Run'},{id:'par',label:'Parameters'}]}
 *         active={tab} onChange={setTab} />
 */
export default function Tabs({ tabs = [], active, onChange, style, ...rest }) {
  return (
    <nav style={{ display: 'flex', gap: 2, ...style }} {...rest}>
      {tabs.map((t) => {
        const on = t.id === active
        return (
          <button
            key={t.id}
            onClick={() => onChange?.(t.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: `1.5px solid ${on ? 'var(--dock-border-focus)' : 'transparent'}`,
              padding: '6px 12px',
              marginBottom: -1,
              fontSize: 'var(--fs-small, 12px)',
              fontWeight: on ? 500 : 400,
              color: on ? 'var(--dock-text-primary)' : 'var(--dock-text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color .12s, border-color .12s',
            }}
          >
            {t.label}
          </button>
        )
      })}
    </nav>
  )
}
