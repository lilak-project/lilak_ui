/**
 * LoginForm — username + password login, ported from lilak_elog's Login.
 * Calls the `login` function from useIdentity (which is wired to a real auth
 * adapter when IdentityProvider is given `auth`). Kit-token styled.
 *
 *   <LoginForm onSuccess={() => setLoginOpen(false)}
 *              labels={{ title:'로그인', username:'아이디', password:'비밀번호', submit:'로그인' }} />
 *
 * In name-only mode (no auth adapter), there is nothing to log into — render
 * the name editor instead (see the demo's settings panel).
 */
import { useState } from 'react'
import { useIdentity } from '../identity.jsx'
import Icon from '../icons.jsx'

const inputStyle = {
  width: '100%', background: 'var(--input-bg)', border: '1px solid var(--input-border)',
  borderRadius: 8, padding: '8px 10px', fontSize: 'var(--fs-body, 13px)', color: 'var(--text-primary)', outline: 'none',
}

function EyeIcon({ off }) {
  return <Icon name={off ? 'eye-off' : 'eye'} size={16} />
}

export default function LoginForm({ onSuccess, labels = {} }) {
  const { login } = useIdentity()
  const L = { title: 'Log in', username: 'Username', password: 'Password', submit: 'Log in', error: 'Login failed', noauth: 'No login backend configured.', ...labels }
  const [form, setForm] = useState({ username: '', password: '' })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e?.preventDefault?.()
    if (!login) { setError(L.noauth); return }
    setLoading(true); setError(null)
    try {
      await login(form.username, form.password)
      onSuccess?.()
    } catch {
      setError(L.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'var(--font-sans)' }}>
      <div style={{ fontSize: 'var(--fs-medium, 14px)', fontWeight: 600, color: 'var(--text-primary)' }}>{L.title}</div>
      <input autoFocus value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder={L.username} style={inputStyle} />
      <div style={{ position: 'relative' }}>
        <input type={show ? 'text' : 'password'} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder={L.password} style={{ ...inputStyle, paddingRight: 36 }} />
        <button type="button" tabIndex={-1} onClick={() => setShow((s) => !s)}
          style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex' }}>
          <EyeIcon off={show} />
        </button>
      </div>
      {error && <div style={{ fontSize: 'var(--fs-small, 12px)', color: 'var(--danger-text)' }}>{error}</div>}
      <button type="submit" disabled={loading}
        style={{ border: '1px solid var(--btn-primary-bg)', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', borderRadius: 8, padding: '8px 0', fontSize: 'var(--fs-body, 13px)', fontWeight: 500, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
        {L.submit}
      </button>
    </form>
  )
}
