import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { applyTheme, setTheme, loadFonts, Community, Button } from '../src/index.js'

applyTheme(); setTheme('bright'); loadFonts()

// ── in-memory mock backend (stands in for a service's /api/community/*) ──
let seq = 100
const now = () => new Date().toISOString()
const store = {
  meKey: 'u_me', meName: '정우', meColor: '#0d9488', meShape: 'flask',
  messages: [
    { id: 1, author_key: 'u_soo', author_name: 'soori', author_color: '#6366f1', author_shape: 'atom', body: '다들 안녕하세요 👋 채팅 테스트 중', kind: 'msg', attachments: [], created_at: now() },
    { id: 2, author_key: 'u_soo', author_name: 'soori', author_color: '#6366f1', author_shape: 'atom', body: '이미지도 붙여볼게요', kind: 'msg', attachments: [{ id: 'a1', name: 'plot.png', type: 'image/png', size: 84000, url: 'https://picsum.photos/seed/lilak/300/180' }], created_at: now() },
    { id: 3, author_key: 'u_me', author_name: '정우', author_color: '#0d9488', author_shape: 'flask', body: '@soori 좋네요! `#253` 런 관련해서 질문 있어요', kind: 'msg', reply_to_id: 2, reply_to_author: 'soori', reply_to_body: '이미지도 붙여볼게요', attachments: [], created_at: now() },
    { id: 4, author_key: 'u_dq', author_name: 'DummyDAQ', author_color: '#f59e0b', author_shape: 'robot', body: 'AsAd 2 pedestal 드리프트 확인 부탁드립니다', kind: 'question', done: false, attachments: [], created_at: now() },
    { id: 5, author_key: 'u_anon', author_name: '이순신', author_color: undefined, author_shape: 'moon', anon: true, real_name: 'kim', body: '익명으로 남기는 한마디', kind: 'msg', attachments: [], created_at: now() },
  ],
  online: [
    { key: 'u_me', name: '정우', color: '#0d9488', shape: 'flask' },
    { key: 'u_soo', name: 'soori', color: '#6366f1', shape: 'atom' },
    { key: 'u_dq', name: 'DummyDAQ', color: '#f59e0b', shape: 'robot' },
  ],
  users: [{ user_key: 'u_soo', name: 'soori', banned: false }, { user_key: 'u_dq', name: 'DummyDAQ', banned: false }],
  polls: [{ id: 'p1', title: '다음 실험 날짜?', options: [{ id: 'o1', text: '월요일', votes: 3 }, { id: 'o2', text: '수요일', votes: 5 }, { id: 'o3', text: '금요일', votes: 1 }], my_vote: 'o2', closed: false, deadline: null, owner: 'u_me' }],
}

const api = {
  async poll() { return { myKey: store.meKey, myRole: 'manager', banned: false, online: store.online, messages: store.messages } },
  async send(p) {
    const m = { id: ++seq, author_key: p.anonymous ? 'u_me_anon' : store.meKey, author_name: p.anonymous ? p.anon_name : store.meName,
      author_color: p.anonymous ? undefined : store.meColor, author_shape: p.anonymous ? p.anon_shape : store.meShape, anon: !!p.anonymous, real_name: p.anonymous ? store.meName : undefined,
      body: p.body, kind: p.kind, done: false, reply_to_id: p.reply_to_id || 0,
      reply_to_author: p.reply_to_id ? (store.messages.find((x) => x.id === p.reply_to_id)?.author_name) : undefined,
      reply_to_body: p.reply_to_id ? (store.messages.find((x) => x.id === p.reply_to_id)?.body) : undefined,
      attachments: p.attachments || [], created_at: now() }
    store.messages.push(m); return m
  },
  async upload(fd) { const f = fd.get('file'); return { id: 'a' + (++seq), name: f.name, type: f.type, size: f.size, url: URL.createObjectURL(f) } },
  async blobURL(url) { return url },
  async del(id) { store.messages = store.messages.filter((m) => m.id !== id) },
  async clearAll() { store.messages = [] },
  async users() { return store.users },
  async ban(k, n, b) { const u = store.users.find((x) => x.user_key === k); if (u) u.banned = b },
  async questions() { return store.messages.filter((m) => m.kind === 'question' && !m.done) },
  async completed() { return store.messages.filter((m) => m.kind === 'question' && m.done) },
  async complete(id) { const m = store.messages.find((x) => x.id === id); if (m) m.done = true },
  async anonIdentity() { return { name: '이순신', shape: 'moon' } },
  async polls() { return store.polls },
  async createPoll({ title, options, deadline }) { store.polls.push({ id: 'p' + (++seq), title, options: options.map((t, i) => ({ id: 'o' + i, text: t, votes: 0 })), my_vote: null, closed: false, deadline, owner: store.meKey }) },
  async vote(pid, oid) { const p = store.polls.find((x) => x.id === pid); if (p) { if (p.my_vote) { const prev = p.options.find((o) => o.id === p.my_vote); if (prev) prev.votes-- } const o = p.options.find((o) => o.id === oid); if (o) o.votes++; p.my_vote = oid } },
  async closePoll(pid) { const p = store.polls.find((x) => x.id === pid); if (p) p.closed = true },
}

// ── real backend adapter (scripts/templates/community.py) — ?real to use it ──
const BASE = 'http://localhost:8188'
async function j(method, path, body) {
  const res = await fetch(BASE + path, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
  if (res.status === 204) return null
  if (!res.ok) throw new Error(res.status + ' ' + await res.text())
  return res.json()
}
const realApi = {
  poll: () => j('GET', '/api/community/messages'),
  send: (p) => j('POST', '/api/community/messages', p),
  upload: async (fd) => (await fetch(BASE + '/api/community/upload', { method: 'POST', body: fd })).json(),
  blobURL: (url) => Promise.resolve(/^https?:/.test(url) ? url : BASE + url),
  del: (id) => j('DELETE', '/api/community/messages/' + id),
  clearAll: () => j('POST', '/api/community/clear'),
  users: () => j('GET', '/api/community/users').then((d) => d.users),
  ban: (k, n, b) => j('POST', '/api/community/ban', { user_key: k, name: n, banned: b }),
  questions: () => j('GET', '/api/community/questions').then((d) => d.questions),
  completed: () => j('GET', '/api/community/completed').then((d) => d.questions),
  complete: (id) => j('POST', '/api/community/complete/' + id),
  anonIdentity: () => j('GET', '/api/community/anon-identity'),
  polls: () => j('GET', '/api/community/polls').then((d) => d.polls),
  createPoll: (p) => j('POST', '/api/community/polls', p),
  vote: (pid, oid) => j('POST', '/api/community/polls/' + pid + '/vote', { option_id: oid }),
  closePoll: (pid) => j('POST', '/api/community/polls/' + pid + '/close'),
}
const USE_REAL = new URLSearchParams(location.search).has('real')
const activeApi = USE_REAL ? realApi : api

function Harness() {
  const [role, setRole] = useState('manager')
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', padding: 16, boxSizing: 'border-box', gap: 10, background: 'var(--app-bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <strong>Community demo</strong>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{USE_REAL ? 'REAL backend (community.py · SQLite)' : 'mock backend'} · features all on</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Button size="sm" variant={role === 'manager' ? 'primary' : 'secondary'} onClick={() => setRole('manager')}>manager</Button>
          <Button size="sm" variant={role === 'user' ? 'primary' : 'secondary'} onClick={() => setRole('user')}>user</Button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Community api={activeApi} role={role} onOpenFiles={() => alert('→ files 탭으로 이동 (서비스가 제공)')}
          features={{ attachments: true, questions: true, anon: true, polls: true, mentions: true, moderation: true }} />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<React.StrictMode><Harness /></React.StrictMode>)
