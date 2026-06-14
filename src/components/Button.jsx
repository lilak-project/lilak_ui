/**
 * Button — the kit's one button look: a soft neutral pill that tints to its
 * semantic colour on hover. The `variant` only chooses the hover tint; every
 * button rests the same (surface-2 + secondary text) so the UI stays calm.
 *
 *   <Button>Save</Button>                      primary (blue tint)
 *   <Button variant="secondary">Cancel</Button>
 *   <Button variant="danger">Delete</Button>   red tint
 *   <Button variant="ghost" icon><Icon/></Button>
 *
 * variant: primary | secondary | danger | dangerSoft | ghost | info | warning | success
 * size:    sm (compact, default) | md
 */

// Hover tint per variant. The resting look is the same for all (the neutral pill).
const TINTS = {
  primary:    { bg: 'var(--info-bg)',    fg: 'var(--info-text)' },
  secondary:  { bg: 'var(--surface-3)',  fg: 'var(--text-primary)' },
  danger:     { bg: 'var(--danger-bg)',  fg: 'var(--danger-text)' },
  dangerSoft: { bg: 'var(--danger-bg)',  fg: 'var(--danger-text)' },
  ghost:      { bg: 'var(--surface-2)',  fg: 'var(--text-primary)' },
  info:       { bg: 'var(--info-bg)',    fg: 'var(--info-text)' },
  warning:    { bg: 'var(--warning-bg)', fg: 'var(--warning-text)' },
  success:    { bg: 'var(--success-bg)', fg: 'var(--success-text)' },
}

// Font sizes track the host app's type scale (`--fs-*`).
const SIZES = {
  sm: { fontSize: 'var(--fs-small, 12px)', padding: '5px 10px', borderRadius: 8 },
  md: { fontSize: 'var(--fs-body, 13px)', padding: '7px 13px', borderRadius: 8 },
}

const REST_FG = 'var(--text-secondary)'

export default function Button({
  variant = 'primary',
  size = 'sm',
  icon = false,
  disabled = false,
  style,
  children,
  ...rest
}) {
  const tint = TINTS[variant] ?? TINTS.primary
  // Ghost rests transparent; everything else rests as the soft pill.
  const restBg = variant === 'ghost' ? 'transparent' : 'var(--surface-2)'
  const dims = SIZES[size] ?? SIZES.sm
  const merged = {
    ...dims,
    backgroundColor: restBg,
    color: REST_FG,
    border: 'none',
    fontWeight: 500,
    lineHeight: 1.2,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    transition: 'background-color .12s, color .12s',
    ...(icon ? { padding: size === 'sm' ? 6 : 8, gap: 0 } : {}),
    ...style,
    // disabled wins last: greyed + not interactive (no hover).
    ...(disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
  }
  const interactions = disabled ? {} : {
    onMouseEnter: (e) => { e.currentTarget.style.backgroundColor = tint.bg; e.currentTarget.style.color = tint.fg },
    onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = (style && style.backgroundColor) || restBg; e.currentTarget.style.color = (style && style.color) || REST_FG },
  }
  return (
    <button disabled={disabled} style={merged} {...interactions} {...rest}>
      {children}
    </button>
  )
}
