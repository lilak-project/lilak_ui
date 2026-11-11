/**
 * Badge — small status pill. tone: neutral | info | success | warning | danger
 *
 *   <Badge tone="success">running</Badge>
 *   <Badge tone="neutral" mono>run 253</Badge>
 *   <Badge tone="success" dot>live</Badge>
 */
const TONES = {
  neutral: { backgroundColor: 'var(--dock-surface-2)',  color: 'var(--dock-text-secondary)' },
  info:    { backgroundColor: 'var(--dock-info-bg)',     color: 'var(--dock-info-text)' },
  success: { backgroundColor: 'var(--dock-success-bg)',  color: 'var(--dock-success-text)' },
  warning: { backgroundColor: 'var(--dock-warning-bg)',  color: 'var(--dock-warning-text)' },
  danger:  { backgroundColor: 'var(--dock-danger-bg)',   color: 'var(--dock-danger-text)' },
}

export default function Badge({ tone = 'neutral', dot = false, mono = false, style, children, ...rest }) {
  const t = TONES[tone] ?? TONES.neutral
  return (
    <span
      style={{
        ...t,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 'var(--fs-tiny, 11px)',
        lineHeight: 1.4,
        padding: '2px 8px',
        borderRadius: 999,
        fontFamily: mono ? 'var(--font-mono, ui-monospace, monospace)' : 'inherit',
        ...style,
      }}
      {...rest}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor' }} />}
      {children}
    </span>
  )
}
