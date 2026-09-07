/**
 * copyText — put a string on the clipboard, wherever the page is served from.
 *
 * `navigator.clipboard` exists only in a secure context (https, or localhost).
 * The portal is opened over plain http from a LAN or VPN address most of the
 * time, where it is `undefined` and a copy button silently does nothing. The
 * fallback is the old execCommand path on a hidden textarea, which still works
 * in every browser on http. Returns true when something was copied.
 */
export async function copyText(text) {
  const value = String(text ?? '')
  if (!value) return false
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = value
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus(); ta.select(); ta.setSelectionRange(0, value.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
