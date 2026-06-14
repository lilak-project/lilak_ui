/**
 * Drawer — a panel that drops down from under the top bar (as if the bar itself
 * expanded). Generalizes the old TopPanel: any height up to 3/4 of the viewport,
 * an optional header (title + close), and enough structure to REPLACE popup
 * modals (host forms/content, not just status). Dims the page below; closes on
 * Esc / backdrop.
 *
 *   <Drawer open={open} onClose={close} title="System" height="half">…</Drawer>
 *   <Drawer open={open} onClose={close} height="3/4" title={t('manage_tasks')}>
 *     <SomeForm/>
 *   </Drawer>
 *
 * height: 'half' (50vh) | 'two-thirds' (66vh) | '3/4' (75vh) | any CSS length.
 * Capped at 75vh per design.
 */
import { useEffect } from 'react'
import Icon from '../icons.jsx'

const PRESETS = { half: '50vh', 'two-thirds': '66vh', '3/4': '75vh', full: '75vh' }
const MAX = '75vh'

export default function Drawer({
  open,
  onClose,
  topOffset = 46,
  height = 'two-thirds',
  title,
  right,            // extra header controls (left of the close button)
  padded = true,
  children,
}) {
  useEffect(() => {
    if (!open) return
    function onEsc(e) { if (e.key === 'Escape') { e.stopPropagation(); onClose?.() } }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [open, onClose])

  const h = PRESETS[height] || height

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, top: topOffset, zIndex: 34,
          backgroundColor: 'var(--overlay)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .24s ease',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', left: 0, right: 0, top: topOffset, zIndex: 35,
          height: h, maxHeight: open ? MAX : 0,
          overflow: 'hidden',
          // The drawer reads as the top bar dropping down: same nav-* colors.
          backgroundColor: 'var(--nav-bg)',
          color: 'var(--nav-text)',
          borderBottom: open ? '1px solid var(--nav-border)' : 'none',
          boxShadow: open ? '0 14px 30px rgba(0,0,0,0.28)' : 'none',
          transition: 'max-height .28s cubic-bezier(.4,0,.2,1)',
          fontFamily: 'var(--font-sans)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {(title || right) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 18px', flexShrink: 0,
            borderBottom: '1px solid var(--nav-border)',
            backgroundColor: 'var(--nav-bg)',
          }}>
            {title && <span style={{ fontSize: 'var(--fs-medium, 14px)', fontWeight: 600, color: 'var(--nav-text)' }}>{title}</span>}
            <div style={{ flex: 1 }} />
            {right}
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--nav-text-muted)', fontSize: 'var(--fs-xlarge, 18px)', lineHeight: 1, padding: '2px 6px', borderRadius: 6,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--nav-accent)'; e.currentTarget.style.color = 'var(--nav-text)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--nav-text-muted)' }}
            ><Icon name="close" size={16} /></button>
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: padded ? '16px 18px 36px' : 0 }}>
          {children}
        </div>
      </div>
    </>
  )
}
