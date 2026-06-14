/**
 * Callout — a bordered, tinted, optionally collapsible banner. Replaces elog's
 * hand-rolled "pinned notices" panel and any inline alert box.
 *
 *   <Callout tone="warning" title="Notices" count={3} collapsible
 *     collapsed={c} onToggleCollapse={() => setC(v => !v)}
 *     labels={{ expand:'펼치기', collapse:'접기' }}>
 *     {items.map(renderItem)}
 *   </Callout>
 *
 * tone: warning | info | success | danger | neutral. `divided` adds hairline
 * separators between direct children (list style).
 */
import Icon from '../icons.jsx'

const TONES = {
  neutral: { bg: 'var(--surface-2)',  border: 'var(--border-default)', text: 'var(--text-secondary)' },
  info:    { bg: 'var(--info-bg)',     border: 'var(--info-text)',      text: 'var(--info-text)' },
  success: { bg: 'var(--success-bg)',  border: 'var(--success-text)',   text: 'var(--success-text)' },
  warning: { bg: 'var(--warning-bg)',  border: 'var(--warning-text)',   text: 'var(--warning-text)' },
  danger:  { bg: 'var(--danger-bg)',   border: 'var(--danger-text)',    text: 'var(--danger-text)' },
}

export default function Callout({
  tone = 'neutral', title, count, icon,
  collapsible = false, collapsed = false, onToggleCollapse,
  labels = {}, divided = false, right, style, children, ...rest
}) {
  const c = TONES[tone] || TONES.neutral
  const showBody = !(collapsible && collapsed)

  const Header = (
    <>
      {icon && <Icon name={icon} size={13} weight="fill" />}
      <span>{title}{count != null ? ` (${count})` : ''}</span>
      <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        {right}
        {collapsible && (
          <span style={{ opacity: 0.7, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            {collapsed ? labels.expand : labels.collapse}
            <Icon name={collapsed ? 'caret-down' : 'caret-up'} size={12} />
          </span>
        )}
      </span>
    </>
  )

  return (
    <div
      style={{
        border: `1px solid ${c.border}`, borderRadius: 12, overflow: 'hidden',
        backgroundColor: c.bg, ...style,
      }}
      {...rest}
    >
      {title != null && (collapsible ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            height: 32, padding: '0 12px', cursor: 'pointer',
            background: 'transparent', border: 'none',
            fontSize: 'var(--fs-small, 12px)', fontWeight: 600, color: c.text, fontFamily: 'inherit',
          }}
        >{Header}</button>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 32, padding: '0 12px', fontSize: 'var(--fs-small, 12px)', fontWeight: 600, color: c.text,
        }}>{Header}</div>
      ))}
      {showBody && children != null && (
        <div className={divided ? 'lk-callout-divided' : undefined} style={divided ? { '--lk-divide': c.border } : undefined}>
          {divided
            ? [].concat(children).filter(Boolean).map((child, i) => (
                <div key={i} style={i ? { borderTop: `1px solid ${c.border}` } : undefined}>{child}</div>
              ))
            : children}
        </div>
      )}
    </div>
  )
}
