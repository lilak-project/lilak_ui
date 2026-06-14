/**
 * Chip / ChipGroup — small selectable pills for filter bars and tag pickers.
 * Replaces the hand-rolled Tailwind toggle buttons in elog's Home filter panel.
 *
 *   <Chip selected onClick={…}>#auto</Chip>
 *   <ChipGroup label="Source" value={src} onChange={setSrc} toggle
 *     options={[{ value:'', label:'All' }, { value:'human', label:'Human' }]} />
 *
 * ChipGroup is single-select. `toggle` lets clicking the active non-empty chip
 * clear it (passes '' to onChange); `round` makes full pills (tag style).
 */

export function Chip({ selected = false, round = false, onClick, style, children, ...rest }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 'var(--fs-small, 12px)', lineHeight: 1.4, cursor: 'pointer', whiteSpace: 'nowrap',
    padding: round ? '2px 9px' : '4px 10px',
    borderRadius: round ? 999 : 8,
    transition: 'background-color .12s, color .12s, border-color .12s',
  }
  const skin = selected
    ? { backgroundColor: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: '1px solid var(--btn-primary-bg)' }
    : { backgroundColor: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...base, ...skin, ...style }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = 'var(--surface-2)' }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.backgroundColor = 'var(--surface)' }}
      {...rest}
    >
      {children}
    </button>
  )
}

const norm = (o) => (typeof o === 'string' ? { value: o, label: o } : o)

export function ChipGroup({
  label, options = [], value, onChange,
  toggle = false, round = false, renderLabel, style, ...rest
}) {
  return (
    <div style={style} {...rest}>
      {label && (
        <p style={{
          fontSize: 'var(--fs-micro, 10px)', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.04em', color: 'var(--text-muted)', margin: '0 0 6px',
        }}>{label}</p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {options.map((opt) => {
          const o = norm(opt)
          const selected = value === o.value
          return (
            <Chip
              key={o.value}
              selected={selected}
              round={round}
              onClick={() => onChange?.(toggle && selected && o.value !== '' ? '' : o.value)}
            >
              {renderLabel ? renderLabel(o) : o.label}
            </Chip>
          )
        })}
      </div>
    </div>
  )
}

export default Chip
