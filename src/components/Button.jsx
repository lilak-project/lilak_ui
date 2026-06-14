/**
 * Button — semantic, theme-aware, compact by default.
 *
 *   <Button>Save</Button>                     primary
 *   <Button variant="secondary">Cancel</Button>
 *   <Button variant="danger" size="sm">Delete</Button>
 *   <Button variant="ghost" icon><Icon/></Button>
 *
 * variant: primary | secondary | danger | dangerSoft | ghost | info | warning | success
 * size:    sm (compact, default) | md
 */
import {
  btnPrimary, btnPrimaryHover, btnSecondary, btnSecondaryHover,
  btnDanger, btnDangerHover, btnDangerSoft, btnDangerSoftHover,
  btnGhost, btnGhostHover, btnInfo, btnInfoHover,
  btnWarning, btnWarningHover, btnSuccess, btnSuccessHover, hoverify,
} from '../theme/uiStyles.js'

const VARIANTS = {
  primary:    [btnPrimary, btnPrimaryHover],
  secondary:  [btnSecondary, btnSecondaryHover],
  danger:     [btnDanger, btnDangerHover],
  dangerSoft: [btnDangerSoft, btnDangerSoftHover],
  ghost:      [btnGhost, btnGhostHover],
  info:       [btnInfo, btnInfoHover],
  warning:    [btnWarning, btnWarningHover],
  success:    [btnSuccess, btnSuccessHover],
}

// Font sizes track the host app's type scale (`--fs-*`) so every button is
// managed from one place; the fallback keeps the kit usable standalone.
const SIZES = {
  sm: { fontSize: 'var(--fs-small, 12px)', padding: '4px 10px', borderRadius: 6 },
  md: { fontSize: 'var(--fs-body, 13px)', padding: '6px 14px', borderRadius: 7 },
}

export default function Button({
  variant = 'primary',
  size = 'sm',
  icon = false,
  style,
  children,
  ...rest
}) {
  const [base, hover] = VARIANTS[variant] ?? VARIANTS.primary
  const dims = SIZES[size] ?? SIZES.sm
  const merged = {
    ...base,
    ...dims,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: base.borderColor ?? 'transparent',
    fontWeight: 500,
    lineHeight: 1.2,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background-color .12s, color .12s, border-color .12s',
    ...(icon ? { padding: size === 'sm' ? 5 : 7, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } : {}),
    ...style,
  }
  return (
    <button style={merged} {...hoverify(merged, { ...merged, ...hover })} {...rest}>
      {children}
    </button>
  )
}
