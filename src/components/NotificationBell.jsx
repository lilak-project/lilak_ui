/**
 * NotificationBell — a bell icon button with an unread-count badge. Pure /
 * prop-driven; the host supplies `count` and an `onClick` (data fetching and the
 * notifications panel live in app glue). A plain alarm bell, not a pulse.
 *
 *   <NotificationBell count={unread} onClick={openPanel} tone="nav" />
 *
 * tone: 'nav' (sits on the dark top bar) | 'surface'.
 */
import Icon from '../icons.jsx'

export default function NotificationBell({ count = 0, onClick, tone = 'nav', title = 'Notifications' }) {
  const color = tone === 'nav' ? 'var(--nav-text)' : 'var(--text-secondary)'
  const muted = tone === 'nav' ? 'var(--nav-text-muted)' : 'var(--text-muted)'
  const hoverBg = tone === 'nav' ? 'var(--nav-accent)' : 'var(--surface-2)'
  const has = count > 0
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 8,
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: has ? color : muted, transition: 'background-color .12s, color .12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = hoverBg; e.currentTarget.style.color = color }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = has ? color : muted }}
    >
      <Icon name={has ? 'bell-active' : 'bell'} size={17} weight={has ? 'fill' : 'regular'} />
      {has && (
        <span style={{
          position: 'absolute', top: -1, right: -1, minWidth: 14, height: 14, padding: '0 3px',
          borderRadius: 999, backgroundColor: 'var(--danger-text, #dc2626)', color: '#fff',
          fontSize: 'var(--fs-micro, 10px)', fontWeight: 700, lineHeight: '14px', textAlign: 'center',
          fontFamily: 'var(--font-mono)',
        }}>{count > 99 ? '99+' : count}</span>
      )}
    </button>
  )
}
