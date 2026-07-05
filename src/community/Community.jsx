/**
 * Community — a reusable, backend-agnostic chat surface for LILAK services.
 *
 * Design follows lilak_elog (left-aligned rows: profile + author + time + bubble,
 * replies, inline images, @mentions) but uses a DEDICATED input box (not the
 * collapsible command bar) so any service can drop it into a tab.
 *
 * Everything talks to the host through one `api` adapter + `features`/`role`, so
 * a service just wires its endpoints:
 *
 *   <Community
 *     api={communityApi}
 *     role={role}                              // 'manager' unlocks moderation/polls
 *     features={{ attachments:true, questions:true, anon:true, polls:true, mentions:true }}
 *     onOpenFiles={() => goToTab('files')}     // 첨부파일 관리 → the service's Files tab
 *     labels={{ ... }}                         // optional i18n overrides
 *   />
 *
 * api (all optional except poll/send):
 *   poll()          -> { me, myKey, myRole, banned, online:[{key,name,color,shape}], messages:[msg] }
 *   send(payload)   -> msg           payload: { body, kind, reply_to_id, attachments, anonymous }
 *   upload(file)    -> att           att: { id, name, type, size, url }
 *   blobURL(url)    -> objectURL     (token-auth fetch → for <img> and downloads)
 *   del(id)                          moderation: delete a message
 *   clearAll()                       moderation: wipe the room
 *   users()         -> [{ user_key, name, banned }]
 *   ban(user_key, name, banned)
 *   questions()     -> [msg]         open questions
 *   completed()     -> [msg]         resolved questions
 *   complete(id)                     mark a question done  (manager)
 *   anonIdentity()  -> { name, shape }   assigned on entry (kept per login)
 *   polls()         -> [poll]        poll: { id, title, options:[{id,text,votes}], my_vote, closed, deadline, owner }
 *   createPoll({ title, options, deadline })
 *   vote(pollId, optionId)
 *   closePoll(pollId)
 *
 * msg: { id, author_key, author_name, author_color, author_shape, anon, real_name,
 *        body, kind:'msg'|'question', done, reply_to_id, reply_to_author, reply_to_body,
 *        attachments:[att], created_at }
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../icons.jsx'
import Avatar from '../components/Avatar.jsx'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const POLL_MS = 3000

const DEFAULT_LABELS = {
  chat: '커뮤니티 채팅', questions: '질문 목록', completed: '완료 목록',
  online: (n) => `${n}명 접속 중`, empty: '아직 메시지가 없습니다. 첫 메시지를 남겨보세요.',
  emptyQ: '등록된 질문이 없습니다.', emptyDone: '완료된 질문이 없습니다.',
  placeholder: '메시지 입력…  (Enter 전송 · Shift+Enter 줄바꿈)',
  send: '전송', reply: '답글', del: '삭제', done: '완료', me: '나', back: '← 채팅으로',
  attach: '첨부파일', attachManage: '첨부파일 관리', chatManage: '채팅창 관리',
  question: '질문', questionList: '질문 목록', completedList: '완료 목록',
  anonOn: '익명으로 전환', anonOff: '익명 끄기', poll: '설문 / 투표',
  clearAll: '채팅 전체 삭제', confirmClear: '정말 전체 삭제?', ban: '이용제한', unban: '해제',
  banned: '커뮤니티 이용이 제한된 계정입니다.', drop: '📎 파일을 여기에 놓으세요',
  pollTitle: '투표 제목', pollOption: '항목', addOption: '항목 추가', createPoll: '투표 만들기',
  vote: '투표', closePoll: '완료', pollClosed: '종료됨', deadline: '마감',
  anonHint: '익명으로 작성 중 (관리자만 실명 확인)', revealWho: '누구인지 보기 (관리자)',
}

const isImg = (t, name) => /^image\//.test(t || '') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name || '')
const fmtSize = (n) => (n > 1e6 ? (n / 1e6).toFixed(1) + 'MB' : n > 1e3 ? Math.round(n / 1e3) + 'KB' : (n || 0) + 'B')
const timeLabel = (iso) => { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

// #123 / @user → light markdown emphasis; keep line breaks.
function mdPrep(text) {
  return String(text || '')
    .replace(/(^|[^\w/])@([A-Za-z0-9_가-힣]+)/g, (_, p, n) => `${p}**@${n}**`)
    .replace(/\n/g, '  \n')
}

/* ── one attachment: inline image (blob-fetched so the token travels) or a file chip ── */
function Attachment({ att, blobURL }) {
  const [src, setSrc] = useState('')
  const image = isImg(att.type, att.name)
  useEffect(() => {
    if (!image) return
    let url = ''
    const p = blobURL ? blobURL(att.url) : Promise.resolve(att.url)
    p.then((u) => { url = u; setSrc(u) }).catch(() => {})
    return () => { if (url && url.startsWith('blob:')) URL.revokeObjectURL(url) }
  }, [att.url, image])

  async function download() {
    try {
      const url = blobURL ? await blobURL(att.url) : att.url
      const a = document.createElement('a'); a.href = url; a.download = att.name || 'file'
      document.body.appendChild(a); a.click(); a.remove()
      if (url.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch {}
  }

  if (image) {
    return src
      ? <img src={src} alt={att.name} onClick={download} title={att.name}
          style={{ maxWidth: 240, maxHeight: 200, borderRadius: 8, cursor: 'pointer', display: 'block', border: '1px solid var(--border-subtle)' }} />
      : <div style={{ ...chipS, opacity: 0.6 }}>🖼 {att.name}</div>
  }
  return (
    <button onClick={download} title={`${att.name} · ${fmtSize(att.size)}`} style={chipBtnS}>
      <Icon name="download" size={14} /> <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
      <em style={{ color: 'var(--text-muted)', fontStyle: 'normal', fontSize: 'var(--fs-micro,10px)' }}>{fmtSize(att.size)}</em>
    </button>
  )
}

const chipS = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 8, background: 'var(--surface-3)', fontSize: 'var(--fs-small,12px)' }
const chipBtnS = { ...chipS, border: '1px solid var(--border-default)', cursor: 'pointer', color: 'var(--text-primary)' }

/* ── a chat row: avatar + author/time + bubble(s). Everyone left-aligned. ── */
function MessageRow({ m, meKey, grouped, isManager, blobURL, onReply, onDelete, onComplete, revealed, onReveal, labels }) {
  const isQ = m.kind === 'question'
  const mine = m.author_key === meKey
  return (
    <div style={{ display: 'flex', gap: 8, padding: '2px 4px', alignItems: 'flex-start' }}>
      <div style={{ width: 30, flexShrink: 0 }}>
        {!grouped && <Avatar outline={m.anon} icon={m.author_shape} color={m.anon ? undefined : m.author_color} seed={m.author_key} size={30} title={m.author_name} />}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        {!grouped && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
            <span style={{ fontWeight: 600, fontSize: 'var(--fs-small,12px)', color: 'var(--text-primary)' }}>{mine ? labels.me : m.author_name}</span>
            {m.anon && m.real_name && isManager && (revealed
              ? <em title="숨기기" onClick={onReveal} style={{ cursor: 'pointer', fontStyle: 'normal', fontSize: 'var(--fs-micro,10px)', color: 'var(--info-text)', background: 'var(--info-bg)', padding: '0 5px', borderRadius: 6 }}>{m.real_name}</em>
              : <button title={labels.revealWho} onClick={onReveal} style={{ border: 'none', background: 'var(--surface-3)', borderRadius: 6, cursor: 'pointer', fontSize: 'var(--fs-micro,10px)', color: 'var(--text-muted)', padding: '0 5px' }}>?</button>)}
            <em style={{ fontStyle: 'normal', fontSize: 'var(--fs-micro,10px)', color: 'var(--text-muted)' }}>{timeLabel(m.created_at)}</em>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, group: 'row' }}
          onMouseEnter={(e) => { const a = e.currentTarget.querySelector('.cm-actions'); if (a) a.style.opacity = 1 }}
          onMouseLeave={(e) => { const a = e.currentTarget.querySelector('.cm-actions'); if (a) a.style.opacity = 0 }}>
          <div style={{
            maxWidth: 560, borderRadius: 10, padding: '7px 11px',
            background: isQ ? 'var(--warning-bg)' : 'var(--surface-2)',
            border: isQ ? '1px solid var(--warning-text)' : '1px solid var(--border-subtle)',
            fontSize: 'var(--fs-body,13px)', color: 'var(--text-primary)',
          }}>
            {isQ && <span style={{ display: 'inline-block', fontSize: 'var(--fs-micro,10px)', fontWeight: 700, color: 'var(--warning-text)', marginBottom: 3 }}>질문{m.done ? ' · 완료' : ''}</span>}
            {m.reply_to_id ? (
              <div style={{ borderLeft: '2px solid var(--border-strong)', paddingLeft: 6, margin: '0 0 4px', fontSize: 'var(--fs-small,12px)', color: 'var(--text-secondary)' }}>
                <b>{m.reply_to_author}</b> {String(m.reply_to_body || '').slice(0, 60)}
              </div>
            ) : null}
            {m.body && <div style={{ lineHeight: 1.5, wordBreak: 'break-word' }} className="cm-md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{mdPrep(m.body)}</ReactMarkdown></div>}
            {(m.attachments || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: m.body ? 6 : 0 }}>
                {m.attachments.map((a, k) => <Attachment att={a} key={k} blobURL={blobURL} />)}
              </div>
            )}
          </div>
          <div className="cm-actions" style={{ display: 'flex', gap: 2, opacity: 0, transition: 'opacity .1s', flexShrink: 0, paddingTop: 4 }}>
            {onReply && <button title={labels.reply} onClick={() => onReply(m)} style={actS}><Icon name="reply" size={13} /></button>}
            {isManager && isQ && !m.done && onComplete && <button title={labels.done} onClick={() => onComplete(m)} style={actS}><Icon name="check" size={13} /></button>}
            {isManager && onDelete && <button title={labels.del} onClick={() => onDelete(m)} style={{ ...actS, color: 'var(--danger-text)' }}><Icon name="trash" size={13} /></button>}
          </div>
        </div>
      </div>
    </div>
  )
}
const actS = { border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: 3, borderRadius: 6, display: 'inline-flex' }

/* ── active poll card (docks to the right of the chat) ── */
function PollCard({ poll, isManager, onVote, onClose, labels }) {
  const total = poll.options.reduce((s, o) => s + (o.votes || 0), 0)
  const closed = poll.closed
  return (
    <div style={{ border: '1px solid var(--border-default)', borderRadius: 12, background: 'var(--surface)', padding: 12, boxShadow: '0 1px 2px rgba(0,0,0,.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Icon name="chart" size={15} color="var(--btn-primary-bg)" />
        <span style={{ fontWeight: 600, fontSize: 'var(--fs-small,12px)', flex: 1, minWidth: 0 }}>{poll.title}</span>
        {closed && <span style={{ fontSize: 'var(--fs-micro,10px)', color: 'var(--text-muted)' }}>{labels.pollClosed}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {poll.options.map((o) => {
          const pct = total ? Math.round((o.votes || 0) / total * 100) : 0
          const voted = poll.my_vote === o.id
          return (
            <button key={o.id} disabled={closed} onClick={() => onVote(poll.id, o.id)}
              style={{ position: 'relative', textAlign: 'left', border: `1px solid ${voted ? 'var(--btn-primary-bg)' : 'var(--border-default)'}`, borderRadius: 8, padding: '5px 9px', background: 'var(--surface-2)', cursor: closed ? 'default' : 'pointer', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: 'var(--info-bg)', zIndex: 0 }} />
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-small,12px)' }}>
                <span>{voted ? '● ' : ''}{o.text}</span>
                <span style={{ color: 'var(--text-muted)' }}>{o.votes || 0} · {pct}%</span>
              </div>
            </button>
          )
        })}
      </div>
      {poll.deadline && <div style={{ fontSize: 'var(--fs-micro,10px)', color: 'var(--text-muted)', marginTop: 6 }}>{labels.deadline}: {new Date(poll.deadline).toLocaleString()}</div>}
      {isManager && !closed && onClose && (
        <button onClick={() => onClose(poll.id)} style={{ marginTop: 8, width: '100%', border: '1px solid var(--border-default)', borderRadius: 8, padding: '5px 0', background: 'transparent', cursor: 'pointer', fontSize: 'var(--fs-small,12px)', color: 'var(--text-secondary)' }}>{labels.closePoll}</button>
      )}
    </div>
  )
}

export default function Community({ api, role = 'user', features = {}, labels: labelsProp, onOpenFiles }) {
  const L = { ...DEFAULT_LABELS, ...(labelsProp || {}) }
  const F = { attachments: true, questions: true, anon: true, polls: true, mentions: true, moderation: true, ...features }
  const isManager = role === 'manager'

  const [messages, setMessages] = useState([])
  const [online, setOnline] = useState([])
  const [meKey, setMeKey] = useState('')
  const [banned, setBanned] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState([])
  const [reply, setReply] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [drag, setDrag] = useState(false)
  const [view, setView] = useState('chat')       // chat | questions | completed
  const [list2, setList2] = useState([])          // questions/completed list
  const [qMode, setQMode] = useState(false)       // next send goes up as a question
  const [plusOpen, setPlusOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [users, setUsers] = useState([])
  const [confirmClear, setConfirmClear] = useState(false)
  const [anon, setAnon] = useState(null)          // { name, shape, on }
  const [revealed, setRevealed] = useState(() => new Set())
  const [polls, setPolls] = useState([])
  const [pollForm, setPollForm] = useState(null)  // { title, options:[] } | null
  const [mention, setMention] = useState(null)    // { q, idx } | null  — @autocomplete
  const [admin, setAdmin] = useState(null)         // 'names' | 'bots' | null (in manage drawer)
  const [names, setNames] = useState(null)         // { surnames, given }
  const [bots, setBots] = useState([])

  const anonOn = !!anon?.on
  const logRef = useRef(null); const inputRef = useRef(null); const stick = useRef(true); const sending = useRef(false)

  // ── poll the room ──
  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const d = await api.poll()
        if (!alive) return
        setMeKey(d.myKey || d.me || ''); setBanned(!!d.banned)
        setOnline(d.online || []); setMessages(d.messages || []); setError('')
        if (F.polls && api.polls) { try { setPolls(await api.polls()) } catch {} }
      } catch (e) { if (alive) setError(String(e.message || e)) }
    }
    tick(); const t = setInterval(tick, POLL_MS)
    return () => { alive = false; clearInterval(t) }
  }, [])

  // assign an anon identity on mount (kept until this component unmounts / login changes)
  useEffect(() => { if (F.anon && api.anonIdentity) api.anonIdentity().then((a) => setAnon((cur) => cur || { ...a, on: false })).catch(() => {}) }, [])

  useEffect(() => { const el = logRef.current; if (el && stick.current && view === 'chat') el.scrollTop = el.scrollHeight }, [messages, view])

  const activeList = view === 'chat' ? messages : list2
  async function loadList(which) {
    try { setList2(which === 'completed' ? await api.completed() : await api.questions()) } catch (e) { setError(String(e.message || e)) }
  }
  function goView(v) { setView(v); setPlusOpen(false); if (v !== 'chat') loadList(v) }

  async function uploadFiles(files) {
    if (!api.upload) return
    const arr = Array.from(files || []).slice(0, 6); if (!arr.length) return
    setUploading(true)
    try { for (const f of arr) { const fd = new FormData(); fd.append('file', f); const att = await api.upload(fd); setPending((p) => [...p, att]) } }
    catch (e) { setError(String(e.message || e)) } finally { setUploading(false) }
  }

  async function doSend() {
    const body = text.trim()
    if ((!body && !pending.length) || sending.current || banned) return
    sending.current = true
    const payload = { body, kind: qMode ? 'question' : 'msg', reply_to_id: reply?.id || 0, attachments: pending,
      anonymous: anonOn, anon_name: anonOn ? anon.name : '', anon_shape: anonOn ? anon.shape : '' }
    setText(''); setPending([]); setReply(null); setQMode(false)
    try {
      const m = await api.send(payload); stick.current = true
      setMessages((p) => (p.some((x) => x.id === m.id) ? p : [...p, m]))
      if (view !== 'chat') loadList(view)
    } catch (e) { setError(String(e.message || e)); setText(body) }
    finally { sending.current = false }
  }

  function toggleAnon() {
    setAnon((cur) => { const next = cur ? { ...cur, on: !cur.on } : { on: true }; return next }); setPlusOpen(false)
  }
  async function deleteMsg(m) { try { await api.del(m.id); setMessages((p) => p.filter((x) => x.id !== m.id)); setList2((p) => p.filter((x) => x.id !== m.id)) } catch (e) { setError(String(e.message || e)) } }
  async function completeQ(m) { try { await api.complete(m.id); loadList(view) } catch (e) { setError(String(e.message || e)) } }
  async function clearAll() {
    if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); return }
    setConfirmClear(false); try { await api.clearAll(); setMessages([]) } catch (e) { setError(String(e.message || e)) }
  }
  async function openManage() { const n = !manageOpen; setManageOpen(n); setPlusOpen(false); if (n && api.users) { try { setUsers(await api.users()) } catch {} } }
  async function toggleBan(u) { try { await api.ban(u.user_key, u.name, !u.banned); setUsers((p) => p.map((x) => x.user_key === u.user_key ? { ...x, banned: !x.banned } : x)) } catch (e) { setError(String(e.message || e)) } }
  async function vote(pid, oid) { try { await api.vote(pid, oid); setPolls(await api.polls()) } catch (e) { setError(String(e.message || e)) } }
  async function closePoll(pid) { try { await api.closePoll(pid); setPolls(await api.polls()) } catch (e) { setError(String(e.message || e)) } }
  async function submitPoll() {
    const opts = (pollForm.options || []).map((s) => s.trim()).filter(Boolean)
    if (!pollForm.title.trim() || !opts.length) return
    try { await api.createPoll({ title: pollForm.title.trim(), options: opts, deadline: pollForm.deadline || null }); setPollForm(null); setPolls(await api.polls()) }
    catch (e) { setError(String(e.message || e)) }
  }

  // ── @mention autocomplete ──
  const mentionUsers = useMemo(() => {
    if (!mention) return []
    const q = (mention.q || '').toLowerCase()
    const seen = new Set()
    return (online || []).filter((u) => u.name && !seen.has(u.name) && seen.add(u.name) && u.name.toLowerCase().includes(q)).slice(0, 6)
  }, [mention, online])
  function onTextChange(e) {
    const v = e.target.value; setText(v)
    const upto = v.slice(0, e.target.selectionStart)
    const m = /(^|\s)@([A-Za-z0-9_가-힣]*)$/.exec(upto)
    setMention(m ? { q: m[2], idx: 0 } : null)
  }
  function applyMention(name) {
    setText((v) => v.replace(/(^|\s)@([A-Za-z0-9_가-힣]*)$/, (all, pre) => `${pre}@${name} `))
    setMention(null); inputRef.current?.focus()
  }

  // ── manager: anon-name pool + bots (in the chat-manage drawer) ──
  async function openAdmin(which) {
    setAdmin(which)
    try {
      if (which === 'names' && api.anonNames) setNames(await api.anonNames())
      if (which === 'bots' && api.bots) setBots(await api.bots())
    } catch (e) { setError(String(e.message || e)) }
  }
  async function saveNames() { try { setNames(await api.saveAnonNames(names)); setAdmin(null) } catch (e) { setError(String(e.message || e)) } }
  async function saveBot(b) { try { await api.saveBot(b); setBots(await api.bots()) } catch (e) { setError(String(e.message || e)) } }
  async function delBot(name) { try { await api.delBot(name); setBots(await api.bots()) } catch (e) { setError(String(e.message || e)) } }

  // ── the + menu items (filtered by features + role) ──
  const menu = [
    F.attachments && { id: 'attach', label: L.attach, icon: 'attach', on: () => { setPlusOpen(false); document.getElementById('cm-file')?.click() } },
    F.attachments && isManager && onOpenFiles && { id: 'attachManage', label: L.attachManage, icon: 'browse', on: () => { setPlusOpen(false); onOpenFiles() } },
    F.moderation && isManager && { id: 'chatManage', label: L.chatManage, icon: 'more', on: openManage },
    F.questions && { id: 'question', label: L.question, icon: 'chats', active: qMode, on: () => { setQMode((v) => !v); setPlusOpen(false); inputRef.current?.focus() } },
    F.questions && { id: 'qlist', label: L.questionList, icon: 'menu', on: () => goView('questions') },
    F.questions && { id: 'done', label: L.completedList, icon: 'check', on: () => goView('completed') },
    F.anon && { id: 'anon', label: anonOn ? L.anonOff : L.anonOn, icon: 'eye', active: anonOn, on: toggleAnon },
    F.polls && isManager && { id: 'poll', label: L.poll, icon: 'chart', on: () => { setPollForm({ title: '', options: ['', ''], deadline: '' }); setPlusOpen(false) } },
  ].filter(Boolean)

  const activePolls = polls.filter((p) => !p.closed)

  return (
    <div style={{ display: 'flex', gap: 12, height: '100%', minHeight: 0, fontFamily: 'var(--font-sans)' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-default)', borderRadius: 12, background: 'var(--surface)', overflow: 'hidden' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-2)' }}>
          <Icon name="community" size={17} />
          <span style={{ fontWeight: 600, fontSize: 'var(--fs-medium,14px)', flex: 1 }}>
            {view === 'questions' ? L.questions : view === 'completed' ? L.completed : L.chat}
          </span>
          {view !== 'chat'
            ? <button onClick={() => setView('chat')} style={ghostBtnS}>{L.back}</button>
            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 'var(--fs-tiny,11px)', color: 'var(--text-muted)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success-text)' }} />{L.online(online.length)}
              </span>}
        </div>

        {/* message list (also the drop zone) */}
        <div ref={logRef} onScroll={() => { const el = logRef.current; if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60 }}
          onDragOver={view === 'chat' && !banned ? (e) => { e.preventDefault(); setDrag(true) } : undefined}
          onDragLeave={(e) => { if (e.currentTarget === e.target) setDrag(false) }}
          onDrop={view === 'chat' && !banned ? (e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer?.files?.length) uploadFiles(e.dataTransfer.files) } : undefined}
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 10, position: 'relative', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {drag && <div style={{ position: 'absolute', inset: 8, border: '2px dashed var(--btn-primary-bg)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--info-bg)', color: 'var(--info-text)', zIndex: 5, pointerEvents: 'none' }}>{L.drop}</div>}
          {activeList.length === 0 && <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: 'var(--fs-small,12px)' }}>{view === 'completed' ? L.emptyDone : view === 'questions' ? L.emptyQ : L.empty}</div>}
          {activeList.map((m, i) => (
            <MessageRow key={m.id} m={m} meKey={meKey} isManager={isManager} blobURL={api.blobURL}
              grouped={view === 'chat' && i > 0 && activeList[i - 1].author_key === m.author_key && activeList[i - 1].kind !== 'question' && m.kind !== 'question'}
              onReply={view === 'chat' ? (mm) => { setReply(mm); inputRef.current?.focus() } : null}
              onDelete={F.moderation && isManager ? deleteMsg : null}
              onComplete={completeQ}
              revealed={revealed.has(m.id)} onReveal={() => setRevealed((s) => { const n = new Set(s); n.has(m.id) ? n.delete(m.id) : n.add(m.id); return n })}
              labels={L} />
          ))}
        </div>

        {error && <div style={{ padding: '4px 12px', color: 'var(--danger-text)', fontSize: 'var(--fs-small,12px)' }}>⚠ {error}</div>}
        {banned && <div style={{ padding: '8px 12px', color: 'var(--danger-text)', fontSize: 'var(--fs-small,12px)', textAlign: 'center' }}>{L.banned}</div>}

        {/* chat-manage mini drawer (drops just above the input) */}
        {manageOpen && isManager && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-2)', padding: '8px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <strong style={{ fontSize: 'var(--fs-small,12px)' }}>{L.chatManage}</strong>
              <button onClick={clearAll} style={{ marginLeft: 'auto', ...ghostBtnS, color: confirmClear ? 'var(--danger-text)' : 'var(--text-secondary)', borderColor: confirmClear ? 'var(--danger-text)' : 'var(--border-default)' }}>
                {confirmClear ? L.confirmClear : L.clearAll}
              </button>
              <button onClick={() => setManageOpen(false)} style={actS}><Icon name="close" size={14} /></button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {users.length === 0 && <span style={{ fontSize: 'var(--fs-tiny,11px)', color: 'var(--text-muted)' }}>사용자 없음</span>}
              {users.map((u) => (
                <span key={u.user_key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 4px 2px 10px', borderRadius: 999, background: u.banned ? 'var(--danger-bg)' : 'var(--surface-3)', fontSize: 'var(--fs-small,12px)' }}>
                  {u.name}
                  <button onClick={() => toggleBan(u)} style={{ ...actS, fontSize: 'var(--fs-micro,10px)', padding: '2px 6px', background: 'var(--surface)', border: '1px solid var(--border-default)', borderRadius: 999 }}>{u.banned ? L.unban : L.ban}</button>
                </span>
              ))}
            </div>
            {(api.anonNames || api.bots) && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {F.anon && api.anonNames && <button onClick={() => openAdmin(admin === 'names' ? null : 'names')} style={{ ...ghostBtnS, ...(admin === 'names' ? activeGhost : {}) }}>익명 이름 목록</button>}
                {api.bots && <button onClick={() => openAdmin(admin === 'bots' ? null : 'bots')} style={{ ...ghostBtnS, ...(admin === 'bots' ? activeGhost : {}) }}>봇 관리</button>}
              </div>
            )}
            {admin === 'names' && names && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginTop: 8 }}>
                <div><div style={lblS}>성씨 ({names.surnames.length})</div><textarea value={names.surnames.join(' ')} onChange={(e) => setNames((n) => ({ ...n, surnames: e.target.value.split(/[\s,]+/).filter(Boolean) }))} rows={3} style={taS} /></div>
                <div><div style={lblS}>이름 ({names.given.length})</div><textarea value={names.given.join(' ')} onChange={(e) => setNames((n) => ({ ...n, given: e.target.value.split(/[\s,]+/).filter(Boolean) }))} rows={3} style={taS} /></div>
                <div style={{ gridColumn: '1 / -1' }}><button onClick={saveNames} style={primaryBtnS}>저장 · {names.surnames.length}×{names.given.length} 조합</button></div>
              </div>
            )}
            {admin === 'bots' && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {bots.map((b) => (
                  <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-small,12px)' }}>
                    <Avatar icon="robot" color="#8b5cf6" seed={b.name} size={20} /> <b>@{b.name}</b>
                    <span style={{ color: 'var(--text-muted)' }}>{b.provider}{b.model ? ` · ${b.model}` : ''}</span>
                    <button onClick={() => saveBot({ ...b, enabled: !b.enabled })} style={{ ...ghostBtnS, marginLeft: 'auto' }}>{b.enabled ? 'on' : 'off'}</button>
                    <button onClick={() => delBot(b.name)} style={{ ...actS, color: 'var(--danger-text)' }}><Icon name="trash" size={13} /></button>
                  </div>
                ))}
                <BotAdd onSave={saveBot} />
              </div>
            )}
          </div>
        )}

        {/* input bar: [+]  [textarea]  [send] */}
        {!banned && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 10 }}>
            {reply && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-small,12px)', color: 'var(--text-secondary)', marginBottom: 6 }}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>↩ <b>{reply.author_name}</b>: {(reply.body || '첨부').slice(0, 60)}</span>
                <button onClick={() => setReply(null)} style={actS}><Icon name="close" size={13} /></button>
              </div>
            )}
            {pending.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                {pending.map((a, k) => (
                  <span key={k} style={chipS}>{isImg(a.type, a.name) ? '🖼' : '📎'} {a.name}
                    <button onClick={() => setPending((p) => p.filter((_, j) => j !== k))} style={{ ...actS, padding: 0 }}><Icon name="close" size={12} /></button>
                  </span>
                ))}
              </div>
            )}
            {anonOn && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: 'var(--fs-tiny,11px)', color: 'var(--text-muted)' }} title={L.anonHint}>
                <Avatar outline icon={anon.shape} seed={anon.name} size={18} /> {anon.name} · {L.anonHint}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, position: 'relative' }}>
              {/* + button + upward popup menu */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {plusOpen && (
                  <>
                    <div onClick={() => setPlusOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                    <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, zIndex: 41, display: 'flex', flexDirection: 'column', gap: 4, padding: 6, minWidth: 180, background: 'var(--surface)', border: '1px solid var(--border-default)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.18)' }}>
                      {menu.map((it) => (
                        <button key={it.id} onClick={it.on} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 'var(--fs-small,12px)', background: it.active ? 'var(--info-bg)' : 'transparent', color: it.active ? 'var(--info-text)' : 'var(--text-primary)' }}
                          onMouseEnter={(e) => { if (!it.active) e.currentTarget.style.background = 'var(--surface-2)' }}
                          onMouseLeave={(e) => { if (!it.active) e.currentTarget.style.background = 'transparent' }}>
                          <Icon name={it.icon} size={15} weight={it.active ? 'fill' : 'regular'} /> {it.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <button onClick={() => setPlusOpen((v) => !v)} title="추가 기능" style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border-default)', background: plusOpen ? 'var(--surface-3)' : 'var(--surface-2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  <Icon name="plus" size={18} />
                </button>
              </div>
              <input id="cm-file" type="file" multiple hidden onChange={(e) => { uploadFiles(e.target.files); e.target.value = '' }} />
              {/* @mention autocomplete */}
              {F.mentions && mention && mentionUsers.length > 0 && (
                <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 52, zIndex: 41, minWidth: 180, background: 'var(--surface)', border: '1px solid var(--border-default)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.18)', padding: 4 }}>
                  {mentionUsers.map((u, i) => (
                    <button key={u.key} onMouseDown={(e) => { e.preventDefault(); applyMention(u.name) }} onMouseEnter={() => setMention((m) => ({ ...m, idx: i }))}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 8px', borderRadius: 7, border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 'var(--fs-small,12px)', background: i === mention.idx ? 'var(--info-bg)' : 'transparent', color: i === mention.idx ? 'var(--info-text)' : 'var(--text-primary)' }}>
                      <Avatar icon={u.shape} color={u.color} seed={u.key} size={18} /> {u.name}
                    </button>
                  ))}
                </div>
              )}
              <textarea ref={inputRef} rows={1} value={text}
                onChange={onTextChange}
                onPaste={(e) => { const f = Array.from(e.clipboardData?.files || []); if (f.length) { e.preventDefault(); uploadFiles(f) } }}
                onKeyDown={(e) => {
                  if (F.mentions && mention && mentionUsers.length) {
                    if (e.key === 'ArrowDown') { e.preventDefault(); setMention((m) => ({ ...m, idx: (m.idx + 1) % mentionUsers.length })); return }
                    if (e.key === 'ArrowUp') { e.preventDefault(); setMention((m) => ({ ...m, idx: (m.idx - 1 + mentionUsers.length) % mentionUsers.length })); return }
                    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applyMention(mentionUsers[mention.idx].name); return }
                    if (e.key === 'Escape') { e.preventDefault(); setMention(null); return }
                  }
                  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); doSend() }
                }}
                placeholder={qMode ? '질문을 입력하고 전송하세요…' : L.placeholder}
                style={{ flex: 1, resize: 'none', maxHeight: 120, minHeight: 36, padding: '8px 11px', borderRadius: 10, fontFamily: 'inherit', fontSize: 'var(--fs-body,13px)', lineHeight: 1.4, outline: 'none', background: 'var(--input-bg,var(--surface))', color: 'var(--text-primary)',
                  border: qMode ? '2px solid var(--warning-text)' : '1px solid var(--border-default)' }} />
              <button onClick={doSend} disabled={!text.trim() && !pending.length} title={L.send}
                style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: (text.trim() || pending.length) ? 'var(--btn-primary-bg)' : 'var(--surface-3)', color: (text.trim() || pending.length) ? 'var(--btn-primary-text)' : 'var(--text-muted)' }}>
                <Icon name={uploading ? 'spinner' : 'send'} size={17} weight="fill" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* right dock: active polls */}
      {F.polls && (activePolls.length > 0 || pollForm) && (
        <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          {pollForm && (
            <div style={{ border: '1px solid var(--border-default)', borderRadius: 12, background: 'var(--surface)', padding: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--fs-small,12px)', marginBottom: 8 }}>{L.createPoll}</div>
              <input value={pollForm.title} onChange={(e) => setPollForm((f) => ({ ...f, title: e.target.value }))} placeholder={L.pollTitle}
                style={fieldS} />
              {pollForm.options.map((o, i) => (
                <input key={i} value={o} onChange={(e) => setPollForm((f) => ({ ...f, options: f.options.map((x, j) => j === i ? e.target.value : x) }))}
                  placeholder={`${L.pollOption} ${i + 1}`} style={{ ...fieldS, marginTop: 6 }} />
              ))}
              <button onClick={() => setPollForm((f) => ({ ...f, options: [...f.options, ''] }))} style={{ ...ghostBtnS, marginTop: 6, width: '100%' }}>+ {L.addOption}</button>
              <input type="datetime-local" value={pollForm.deadline} onChange={(e) => setPollForm((f) => ({ ...f, deadline: e.target.value }))} style={{ ...fieldS, marginTop: 6 }} />
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button onClick={submitPoll} style={{ flex: 1, border: 'none', borderRadius: 8, padding: '6px 0', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', cursor: 'pointer', fontSize: 'var(--fs-small,12px)' }}>{L.createPoll}</button>
                <button onClick={() => setPollForm(null)} style={ghostBtnS}><Icon name="close" size={14} /></button>
              </div>
            </div>
          )}
          {activePolls.map((p) => <PollCard key={p.id} poll={p} isManager={isManager} onVote={vote} onClose={closePoll} labels={L} />)}
        </div>
      )}
    </div>
  )
}

const ghostBtnS = { border: '1px solid var(--border-default)', background: 'transparent', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 'var(--fs-small,12px)', color: 'var(--text-secondary)' }
const activeGhost = { background: 'var(--info-bg)', color: 'var(--info-text)', borderColor: 'var(--info-text)' }
const fieldS = { width: '100%', boxSizing: 'border-box', padding: '6px 9px', borderRadius: 8, border: '1px solid var(--border-default)', background: 'var(--input-bg,var(--surface))', color: 'var(--text-primary)', fontSize: 'var(--fs-small,12px)', outline: 'none' }
const taS = { ...fieldS, resize: 'vertical', fontFamily: 'inherit' }
const lblS = { fontSize: 'var(--fs-micro,10px)', color: 'var(--text-muted)', marginBottom: 3 }
const primaryBtnS = { border: 'none', borderRadius: 8, padding: '6px 12px', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', cursor: 'pointer', fontSize: 'var(--fs-small,12px)' }

function BotAdd({ onSave }) {
  const [f, setF] = useState({ name: '', provider: 'echo', model: '', api_key: '', system: '' })
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', paddingTop: 6, borderTop: '1px solid var(--border-subtle)' }}>
      <input value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} placeholder="봇 이름 (@)" style={{ ...fieldS, width: 110 }} />
      <select value={f.provider} onChange={(e) => setF((s) => ({ ...s, provider: e.target.value }))} style={{ ...fieldS, width: 110 }}>
        <option value="echo">echo</option><option value="openai">openai</option><option value="anthropic">anthropic</option>
      </select>
      <input value={f.model} onChange={(e) => setF((s) => ({ ...s, model: e.target.value }))} placeholder="model" style={{ ...fieldS, width: 130 }} />
      <input value={f.api_key} onChange={(e) => setF((s) => ({ ...s, api_key: e.target.value }))} placeholder="api key" type="password" style={{ ...fieldS, width: 120 }} />
      <button onClick={() => { if (f.name.trim()) { onSave({ ...f, enabled: 1 }); setF({ name: '', provider: 'echo', model: '', api_key: '', system: '' }) } }} style={primaryBtnS}>추가</button>
    </div>
  )
}
