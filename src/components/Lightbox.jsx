/**
 * Lightbox — fullscreen image viewer with prev/next/close and an optional
 * caption strip. Owns its own keyboard handling while open: ←/→ navigate,
 * Esc/Space close. Renders through a portal so it escapes any clipped parent.
 *
 *   <Lightbox open={fs} src={url} alt={name}
 *     onClose={() => setFs(false)} onPrev={() => nav(-1)} onNext={() => nav(1)}
 *     index={i} count={n} caption={<>…</>} />
 *
 * Omit onPrev/onNext to hide the arrows (single-image view).
 */
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../icons.jsx'

const arrowBtn = (side) => ({
  position: 'absolute', [side]: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: 'rgba(255,255,255,0.7)', display: 'inline-flex', padding: 8,
})

export default function Lightbox({ open, src, alt, onClose, onPrev, onNext, caption, index, count }) {
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape' || e.key === ' ') { e.preventDefault(); onClose?.() }
      else if (e.key === 'ArrowLeft' || e.key === 'h') { e.preventDefault(); onPrev?.() }
      else if (e.key === 'ArrowRight' || e.key === 'l') { e.preventDefault(); onNext?.() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, onPrev, onNext])

  if (!open) return null

  return createPortal(
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {onPrev && (
        <button style={arrowBtn('left')} onClick={(e) => { e.stopPropagation(); onPrev() }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>
          <Icon name="caret-left" size={44} weight="thin" />
        </button>
      )}

      <img src={src} alt={alt} onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '100vh', maxWidth: '100%', objectFit: 'contain', userSelect: 'none' }} />

      {onNext && (
        <button style={arrowBtn('right')} onClick={(e) => { e.stopPropagation(); onNext() }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>
          <Icon name="caret-right" size={44} weight="thin" />
        </button>
      )}

      {caption != null && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '16px 24px', color: '#fff',
          background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', pointerEvents: 'none' }}>
          {caption}
          {(index != null && count != null) && (
            <p style={{ margin: '4px 0 0', fontSize: 'var(--fs-tiny, 11px)', color: 'rgba(255,255,255,0.5)' }}>{index + 1} / {count} · Space: 닫기</p>
          )}
        </div>
      )}

      <button onClick={onClose} aria-label="Close"
        style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'inline-flex' }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>
        <Icon name="close" size={24} />
      </button>
    </div>,
    document.body,
  )
}
