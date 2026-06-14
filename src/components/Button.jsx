/**
 * Button — soft, flat buttons. Two looks share one shape:
 *  • Semantic/action variants (primary, info, success, warning, danger) rest
 *    with a LIGHT tint of their colour and fill solid on hover — so the
 *    important actions (create / edit / delete / …) read by colour at a glance.
 *  • Neutral variants (secondary, ghost) rest as a calm grey pill and only
 *    darken slightly on hover.
 *
 *   <Button>Save</Button>                      primary  (blue tint)
 *   <Button variant="success">New</Button>     green tint
 *   <Button variant="danger">Delete</Button>   red tint
 *   <Button variant="secondary">Cancel</Button> grey
 *   <Button variant="ghost" icon><Icon/></Button>
 *
 * variant: primary | secondary | danger | dangerSoft | ghost | info | warning | success
 * size:    sm (compact, default) | md
 */

const SOLID_TEXT = 'var(--btn-primary-text, #fff)'

// Tinted (semantic/action) variants: light bg + text at rest, solid on hover.
const TINTED = {
  primary:    { bg: 'var(--info-bg)',    fg: 'var(--info-text)',    onBg: 'var(--info-text)' },
  info:       { bg: 'var(--info-bg)',    fg: 'var(--info-text)',    onBg: 'var(--info-text)' },
  success:    { bg: 'var(--success-bg)', fg: 'var(--success-text)', onBg: 'var(--success-text)' },
  warning:    { bg: 'var(--warning-bg)', fg: 'var(--warning-text)', onBg: 'var(--warning-text)' },
  danger:     { bg: 'var(--danger-bg)',  fg: 'var(--danger-text)',  onBg: 'var(--danger-text)' },
  dangerSoft: { bg: 'var(--danger-bg)',  fg: 'var(--danger-text)',  onBg: 'var(--danger-text)' },
}

const SIZES = {
  sm: { fontSize: 'var(--fs-small, 12px)', padding: '5px 10px', borderRadius: 8 },
  md: { fontSize: 'var(--fs-body, 13px)', padding: '7px 13px', borderRadius: 8 },
}

// rest / hover colour pair for a variant.
function palette(variant) {
  const t = TINTED[variant]
  if (t) return { restBg: t.bg, restFg: t.fg, hovBg: t.onBg, hovFg: SOLID_TEXT }
  // neutral: secondary (grey pill) / ghost (transparent) — only darken on hover.
  const restBg = variant === 'ghost' ? 'transparent' : 'var(--surface-2)'
  return { restBg, restFg: 'var(--text-secondary)', hovBg: 'var(--surface-3)', hovFg: 'var(--text-primary)' }
}

export default function Button({
  variant = 'primary',
  size = 'sm',
  icon = false,
  disabled = false,
  style,
  children,
  ...rest
}) {
  const { restBg, restFg, hovBg, hovFg } = palette(variant)
  const dims = SIZES[size] ?? SIZES.sm
  const merged = {
    ...dims,
    backgroundColor: restBg,
    color: restFg,
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
    onMouseEnter: (e) => { e.currentTarget.style.backgroundColor = hovBg; e.currentTarget.style.color = hovFg },
    onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = (style && style.backgroundColor) || restBg; e.currentTarget.style.color = (style && style.color) || restFg },
  }
  return (
    <button disabled={disabled} style={merged} {...interactions} {...rest}>
      {children}
    </button>
  )
}
