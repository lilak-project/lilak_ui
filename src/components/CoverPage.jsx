import Icon from '../icons.jsx'
import { Container } from '../layout/index.jsx'

/**
 * CoverPage — a bright, centered "landing / cover" page shell.
 *
 * A full-height surface with a header (leading icon/logo, title, subtitle, and a
 * right-aligned actions slot) over a narrow centered column. The whole subtree is
 * re-scoped to a chosen theme (default `bright`) via a nested `data-theme`, so an
 * app's dark/low theme — or logging out — never flips the cover. Drop the page
 * body in as children (a toolbar, a list of <CoverCard/>, etc.).
 *
 *   <CoverPage icon="lilak" title="Projects" subtitle="…" actions={<LoginButton/>}>
 *     …toolbar…
 *     {items.map(p => <CoverCard key={p.id} … />)}
 *   </CoverPage>
 *
 * Props
 *   icon       icon name (string) OR a node rendered as the leading mark
 *   iconSize   leading icon size (px, default 36)
 *   title      heading text/node
 *   subtitle   sub-heading text/node (optional)
 *   actions    right-aligned header slot (auth controls, etc.) (optional)
 *   note       a small muted line under the header (e.g. a permissions hint)
 *   max        content column max width (px, default 760)
 *   theme      data-theme to re-scope this subtree to (default 'bright')
 *   center     stack the header centered — mark alone on its own line, title and
 *              subtitle underneath — instead of the default leading-icon row.
 *              For landing/sign-in screens with no header actions.
 */
export default function CoverPage({
  icon, iconSize = 36, title, subtitle, actions, note, subheader, headerPad = '40px 0 8px',
  max = 760, theme = 'bright', fill = false, center = false, style, children, ...rest
}) {
  // fill: pin the page to the viewport and scroll the BODY internally (header
  // stays put). A stable scrollbar gutter means switching between short and tall
  // screens never shifts the layout horizontally.
  const rootStyle = fill
    ? { height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--app-bg, var(--surface-2))', ...style }
    : { minHeight: '100vh', backgroundColor: 'var(--app-bg, var(--surface-2))', paddingBottom: 64, ...style }
  return (
    <div data-theme={theme} style={rootStyle} {...rest}>
      <Container max={max} style={fill ? { display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 } : undefined}>
        <header style={{
          display: 'flex', flexShrink: 0, padding: headerPad,
          ...(center
            ? { flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }
            : { alignItems: 'flex-start', gap: 12 }),
        }}>
          {icon != null && (
            typeof icon === 'string'
              ? <Icon name={icon} size={iconSize} style={{ height: iconSize, width: 'auto' }} />
              : icon
          )}
          {(title != null || subtitle != null) && (
            <div style={center ? { minWidth: 0 } : { flex: 1, minWidth: 0 }}>
              {title != null && (
                <h1 style={{ margin: 0, fontSize: 'var(--fs-title, 22px)', color: 'var(--text-emphasis)', letterSpacing: '0.01em' }}>
                  {title}
                </h1>
              )}
              {subtitle && (
                <p style={{ margin: '2px 0 0', fontSize: 'var(--fs-small, 12px)', color: 'var(--text-muted)' }}>
                  {subtitle}
                </p>
              )}
            </div>
          )}
          {actions && (
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div>
          )}
        </header>

        {note && (
          <div style={{ margin: '8px 0', fontSize: 'var(--fs-small, 12px)', color: 'var(--text-muted)', flexShrink: 0 }}>
            {note}
          </div>
        )}

        {/* subheader stays in the FIXED region (above the scroll body) — e.g. a nav/tab bar. */}
        {subheader != null && <div style={{ flexShrink: 0 }}>{subheader}</div>}

        {fill
          ? <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarGutter: 'stable', paddingTop: 12, paddingBottom: 32 }}>{children}</div>
          : children}
      </Container>
    </div>
  )
}

/**
 * CoverCard — a single row in a cover-page list: leading icon, a title with an
 * optional badge, a status line (coloured dot + text), and a trailing actions
 * slot. Generic over its data — the consumer supplies already-localized strings.
 *
 *   <CoverCard
 *     icon="gauge" title="lilak_log" active
 *     badge={<Pill>current</Pill>}
 *     statusOn statusText="running · 8011"
 *     actions={<><Button>Enter</Button><Button>Stop</Button></>} />
 *
 * Props
 *   icon        icon name (string) OR a node
 *   iconColor   leading icon colour (default --text-primary)
 *   title       name text/node (mono 600 by default; set mono={false} to disable)
 *   badge       optional node beside the title (e.g. a "current" pill)
 *   statusOn    bool → status dot colour (success vs muted)
 *   statusText  status line text/node (renders the dot+text row when present)
 *   actions     trailing buttons node
 *   active      bool → focus/selected border highlight
 */
export function CoverCard({
  icon, iconColor = 'var(--text-primary)', title, badge,
  statusOn = false, statusText, actions, active = false,
  mono = true, style, ...rest
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
        border: '1px solid', borderRadius: 10, backgroundColor: 'var(--surface)',
        borderColor: active ? 'var(--border-focus, var(--btn-primary-bg))' : 'var(--border-default)',
        ...style,
      }}
      {...rest}
    >
      {icon != null && (
        typeof icon === 'string'
          ? <Icon name={icon} size={22} weight="regular" color={iconColor} style={{ flexShrink: 0 }} />
          : icon
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: mono ? 'var(--font-mono)' : 'inherit',
            fontSize: 'var(--fs-body, 13px)', color: 'var(--text-primary)', fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{title}</span>
          {badge}
        </div>
        {statusText != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, fontSize: 'var(--fs-micro, 10px)', color: 'var(--text-muted)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: statusOn ? 'var(--success-text)' : 'var(--text-muted)' }} />
            {statusText}
          </div>
        )}
      </div>
      {actions}
    </div>
  )
}
