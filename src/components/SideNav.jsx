/**
 * SideNav — a vertical section nav (settings-style left rail). Replaces elog's
 * hand-rolled Tailwind `<aside>` in SettingsPage. Pair it with content in a Row:
 *
 *   <Row align="stretch" gap={24}>
 *     <SideNav title={t('tab_settings')} sections={sections}
 *       active={section} onSelect={openSettings} />
 *     <div style={{ flex: 1, minWidth: 0 }}>{content}</div>
 *   </Row>
 *
 * sections: [{ id, label, icon? }]. `groups` (optional) renders dividers — pass
 * sections with a `group` key and consecutive groups get a gap.
 */
import Icon from '../icons.jsx'

export default function SideNav({
  title, sections = [], active, onSelect, width = 176, style, ...rest
}) {
  return (
    <aside
      style={{
        width, flexShrink: 0, paddingRight: 8, marginRight: 24,
        borderRight: '1px solid var(--border-subtle)', ...style,
      }}
      {...rest}
    >
      {title && (
        <p style={{
          fontSize: 'var(--fs-micro, 10px)', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.05em', color: 'var(--text-muted)',
          padding: '0 8px', margin: '0 0 8px',
        }}>{title}</p>
      )}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sections.map((s, i) => {
          const on = active === s.id
          const gapTop = i > 0 && s.group && s.group !== sections[i - 1].group
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect?.(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', height: 32, padding: '0 12px',
                marginTop: gapTop ? 8 : 0,
                borderRadius: 8, border: 'none', cursor: 'pointer',
                textAlign: 'left', fontSize: 'var(--fs-small, 12px)', fontFamily: 'inherit',
                transition: 'background-color .12s, color .12s',
                backgroundColor: on ? 'var(--info-bg)' : 'transparent',
                color: on ? 'var(--info-text)' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => { if (!on) e.currentTarget.style.backgroundColor = 'var(--surface-2)' }}
              onMouseLeave={(e) => { if (!on) e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              {s.icon && <Icon name={s.icon} size={15} weight={on ? 'fill' : 'regular'} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
