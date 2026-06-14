/**
 * TopPanel — a panel that drops down from under the top bar, as if the bar
 * itself expanded. Slides open with an animation to a given height (default
 * ~2/3 of the viewport), dims the page below, and closes on Esc / backdrop.
 *
 *   <TopPanel open={open} onClose={() => setOpen(false)} topOffset={46} height="66vh">
 *     …system info / logs…
 *   </TopPanel>
 */
import { useEffect } from 'react'

export default function TopPanel({ open, onClose, topOffset = 46, height = '66vh', children }) {
  useEffect(() => {
    if (!open) return
    function onEsc(e) { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [open, onClose])

  return (
    <>
      {/* backdrop below the panel */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, top: topOffset, zIndex: 24,
          backgroundColor: 'var(--overlay)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity .24s ease',
        }}
      />
      {/* the drop-down panel, clipped so its content slides in from the top */}
      <div
        style={{
          position: 'fixed', left: 0, right: 0, top: topOffset, zIndex: 25,
          height,
          maxHeight: open ? height : 0,
          overflow: 'hidden',
          backgroundColor: 'var(--nav-bg)',
          borderBottom: open ? '1px solid var(--nav-border)' : 'none',
          boxShadow: open ? '0 10px 24px rgba(0,0,0,0.25)' : 'none',
          transition: 'max-height .28s cubic-bezier(.4,0,.2,1)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div style={{ height, overflowY: 'auto', padding: '14px 18px' }}>
          {children}
        </div>
      </div>
    </>
  )
}
