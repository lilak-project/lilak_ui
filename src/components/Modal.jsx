/**
 * Modal — centered dialog over a scrim. Normal-flow faux-viewport so it works
 * inside constrained/embedded layouts.
 *
 *   {open && (
 *     <Modal title="Open file" onClose={() => setOpen(false)} onSubmit={save}>…</Modal>
 *   )}
 *
 * Keyboard (kit-wide popup convention): Esc cancels (onClose); Cmd/Ctrl+Enter
 * applies (onSubmit, if given). Both ignore composing IME input.
 */
import { useEffect } from 'react'
import { modalFrame, modalHeader, modalOverlay } from '../theme/uiStyles.js'
import Button from './Button.jsx'
import Icon from '../icons.jsx'

export default function Modal({ title, onClose, onSubmit, width = 540, children, footer }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.() }
      else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent?.isComposing) { e.preventDefault(); onSubmit?.() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onSubmit])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...modalOverlay,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: modalFrame.backgroundColor,
          color: modalFrame.color,
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: 'var(--border-default)',
          borderRadius: 'var(--radius-lg, 10px)',
          width,
          maxWidth: '92vw',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {(title || onClose) && (
          <div style={{
            backgroundColor: modalHeader.backgroundColor,
            color: modalHeader.color,
            display: 'flex', alignItems: 'center', padding: '8px 12px',
            borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'var(--border-subtle)',
          }}>
            <span style={{ fontSize: 'var(--fs-body, 13px)', fontWeight: 500 }}>{title}</span>
            <div style={{ marginLeft: 'auto' }}>
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="close" icon><Icon name="close" size={15} /></Button>
            </div>
          </div>
        )}
        <div style={{ padding: 12, overflow: 'auto' }}>{children}</div>
        {footer && (
          <div style={{
            backgroundColor: modalHeader.backgroundColor,
            color: modalHeader.color,
            display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '8px 12px',
            borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'var(--border-subtle)',
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
