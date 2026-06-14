/**
 * Badge — small status pill. tone: neutral | info | success | warning | danger
 *
 *   <Badge tone="success">running</Badge>
 *   <Badge tone="neutral" mono>run 253</Badge>
 *   <Badge tone="success" dot>live</Badge>
 */
const TONES = {
  neutral: { backgroundColor: 'var(--surface-2)',  color: 'var(--text-secondary)' },
  info:    { backgroundColor: 'var(--info-bg)',     color: 'var(--info-text)' },
  success: { backgroundColor: 'var(--success-bg)',  color: 'var(--success-text)' },
  warning: { backgroundColor: 'var(--warning-bg)',  color: 'var(--warning-text)' },
  danger:  { backgroundColor: 'var(--danger-bg)',   color: 'var(--danger-text)' },
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
