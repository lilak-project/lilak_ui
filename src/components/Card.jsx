/**
 * Card — surface panel with optional header. Compact padding by default.
 *
 *   <Card>…</Card>
 *   <Card title="stark/config_conv.mac" actions={<Button>Run</Button>}>…</Card>
 *   <Card pad={false}>…</Card>   // no body padding (for flush tables)
 */
export default function Card({ title, actions, pad = true, bodyStyle, style, children, ...rest }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg, 10px)',
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      {(title || actions) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 12px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface)',
          }}
        >
          {title && (
            <span style={{ fontSize: 'var(--fs-small, 12px)', fontFamily: 'var(--font-mono, ui-monospace, monospace)', color: 'var(--text-primary)' }}>
              {title}
            </span>
          )}
          {actions && <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>{actions}</div>}
        </div>
      )}
      <div style={{ padding: pad ? '10px 12px' : 0, ...bodyStyle }}>{children}</div>
    </div>
  )
}
