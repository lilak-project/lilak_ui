/**
 * Input — compact theme-aware text field. Focus ring uses border-focus token.
 *
 *   <Input value={v} onChange={…} placeholder="…" />
 *   <Input mono size="md" />
 */
import { forwardRef } from 'react'
import { inputBase } from '../theme/uiStyles.js'

const SIZES = {
  sm: { fontSize: 'var(--fs-small, 12px)', padding: '4px 8px', borderRadius: 6 },
  md: { fontSize: 'var(--fs-body, 13px)', padding: '6px 10px', borderRadius: 7 },
}

const Input = forwardRef(function Input({ size = 'sm', mono = false, style, ...rest }, ref) {
  const dims = SIZES[size] ?? SIZES.sm
  const base = {
    ...inputBase,
    ...dims,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--input-border)',
    outline: 'none',
    width: '100%',
    fontFamily: mono ? 'var(--font-mono, ui-monospace, monospace)' : 'inherit',
    transition: 'border-color .12s, box-shadow .12s',
    ...style,
  }
  return (
    <input
      ref={ref}
      style={base}
      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--selection-bg)' }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; e.currentTarget.style.boxShadow = 'none' }}
      {...rest}
    />
  )
})

export default Input
