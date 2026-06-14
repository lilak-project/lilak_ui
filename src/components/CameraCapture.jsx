/**
 * CameraCapture — a modal that opens the device webcam via getUserMedia, shows a
 * live preview, and snaps a still to a File (image/jpeg) handed back through
 * `onCapture(file)`. For desktops, where `<input capture>` can't reach the
 * webcam; mobile hosts can keep using the native capture input.
 *
 *   <CameraCapture open={open} onClose={() => setOpen(false)}
 *                  onCapture={(file) => addFile(file)} title="Camera" />
 *
 * Requires a secure context (https or localhost) — getUserMedia is blocked over
 * plain HTTP. On error (blocked / no camera / insecure) it shows a message.
 */
import { useEffect, useRef, useState } from 'react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import Icon from '../icons.jsx'

export default function CameraCapture({ open, onClose, onCapture, title = 'Camera', facingMode = 'environment' }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError(null); setReady(false)
    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : null
    if (!md?.getUserMedia) {
      setError('이 브라우저/연결에서는 카메라를 쓸 수 없습니다. (HTTPS 또는 localhost 필요)')
      return
    }
    md.getUserMedia({ video: { facingMode }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play?.().catch(() => {})
        }
        setReady(true)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e?.name === 'NotAllowedError' ? '카메라 접근이 거부되었습니다.' : '카메라를 열 수 없습니다.')
      })
    return () => { cancelled = true; stop() }
  }, [open, facingMode])

  function snap() {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d').drawImage(v, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
      onCapture?.(file)
      handleClose()
    }, 'image/jpeg', 0.92)
  }

  function handleClose() { stop(); onClose?.() }

  if (!open) return null
  return (
    <Modal
      title={title}
      onClose={handleClose}
      width={520}
      footer={(
        <>
          <Button variant="ghost" onClick={handleClose}>닫기</Button>
          <Button variant="primary" onClick={snap} disabled={!ready || !!error}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="camera" size={14} />촬영</span>
          </Button>
        </>
      )}
    >
      {error ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--danger-text)', fontSize: 'var(--fs-body, 13px)' }}>{error}</div>
      ) : (
        <div style={{ position: 'relative', backgroundColor: '#000', borderRadius: 8, overflow: 'hidden' }}>
          <video ref={videoRef} playsInline muted style={{ width: '100%', display: 'block', maxHeight: '60vh', objectFit: 'contain' }} />
          {!ready && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 'var(--fs-small, 12px)' }}>
              카메라 여는 중…
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
