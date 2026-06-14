/**
 * TopBar — application top bar: brand, tab navigation, right-side slot.
 *
 *   <TopBar
 *     brand="LILAK"
 *     tabs={[{id:'run',label:'Run',icon:'play'},{id:'par',label:'Parameters'}]}
 *     active={tab} onTab={setTab}
 *     right={<><Badge tone="success" dot>running</Badge><ThemeButton/></>}
 *   />
 *
 * Each tab may carry an `icon` (a kit Icon name); it fills when the tab is active.
 * When the bar gets too narrow for the labels to fit on one line, tabs collapse
 * to icons only (a hidden measurer tracks the full width, so there's no flicker).
 * Uses the nav-* tokens (dark bar in every theme), matching the elog look.
 */
import { useLayoutEffect, useRef, useState } from 'react'
import Icon from '../icons.jsx'

const TAB_FONT = 13

export default function TopBar({ brand = 'LILAK', brandIcon, brandSuffix, onBrandClick, brandTitle, tabs = [], active, onTab, right, style }) {
  const rootRef = useRef(null)
  const brandRef = useRef(null)
  const rightRef = useRef(null)
  const measureRef = useRef(null)   // hidden full-label copy → stable "needed" width
  const [compact, setCompact] = useState(false)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const recompute = () => {
      const needed = measureRef.current ? measureRef.current.scrollWidth : 0
      const brandW = brandRef.current ? brandRef.current.offsetWidth : 0
      const rightW = rightRef.current ? rightRef.current.offsetWidth : 0
      // root width minus side padding (32*2), the brand, the right slot, and the gaps
      const available = root.clientWidth - 64 - brandW - rightW - 36
      setCompact(needed > available)
    }
    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(root)
    return () => ro.disconnect()
  }, [tabs.map((t) => t.id + t.label).join('|')])

  function tabButton(t, { iconOnly, measure } = {}) {
    const on = t.id === active
    const showLabel = !iconOnly || !t.icon
    return (
      <button
        key={t.id}
        onClick={measure ? undefined : () => onTab?.(t.id)}
        title={iconOnly ? t.label : undefined}
        tabIndex={measure ? -1 : undefined}
        style={{
          position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 5,
          background: 'transparent', border: 'none', padding: '0 9px',
          outline: 'none', WebkitTapHighlightColor: 'transparent',
          fontSize: TAB_FONT, lineHeight: 1, whiteSpace: 'nowrap',
          // Tabs render in caps; harmless for CJK (no case), uppercases Latin labels.
          textTransform: 'uppercase', letterSpacing: '0.02em',
          fontWeight: on ? 500 : 400,
          color: on ? 'var(--nav-text)' : 'var(--nav-text-muted)',
          cursor: measure ? 'default' : 'pointer', transition: 'color .12s',
        }}
        onMouseEnter={measure ? undefined : (e) => { if (!on) e.currentTarget.style.color = 'var(--nav-text)' }}
        onMouseLeave={measure ? undefined : (e) => { if (!on) e.currentTarget.style.color = 'var(--nav-text-muted)' }}
      >
        <span aria-hidden="true" style={{ position: 'absolute', left: 1, top: -3, width: 4, height: 4, borderRadius: '50%', backgroundColor: 'var(--nav-text)', opacity: on ? 1 : 0, transition: 'opacity .12s' }} />
        {t.icon && <Icon name={t.icon} size={15} weight={on ? 'fill' : 'regular'} />}
        {showLabel && t.label}
      </button>
    )
  }

  return (
    <header
      ref={rootRef}
      style={{
        position: 'sticky', top: 0, zIndex: 30, display: 'flex', alignItems: 'center', gap: 18,
        height: 46, padding: '0 32px', backgroundColor: 'var(--nav-bg)',
        borderBottom: '1px solid var(--nav-border)', fontFamily: 'var(--font-sans)', ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
        <span ref={brandRef} onClick={onBrandClick} title={brandTitle}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 'var(--fs-large, 16px)', lineHeight: 1, color: 'var(--nav-text)', letterSpacing: '0.02em', flexShrink: 0, cursor: onBrandClick ? 'pointer' : 'default' }}>
          {brandIcon}
          {brand}
          {brandSuffix}
        </span>
        <nav style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {tabs.map((t) => tabButton(t, { iconOnly: compact }))}
        </nav>
      </div>

      {/* Hidden measurer: always full labels → "needed" width is stable. */}
      <div ref={measureRef} aria-hidden="true"
        style={{ position: 'absolute', top: 0, left: 0, visibility: 'hidden', pointerEvents: 'none', display: 'flex', gap: 4, alignItems: 'center', whiteSpace: 'nowrap' }}>
        {tabs.map((t) => tabButton(t, { measure: true }))}
      </div>

      <div ref={rightRef} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {right}
      </div>
    </header>
  )
}
