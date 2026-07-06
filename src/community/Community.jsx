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
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  edit: '수정', save: '저장', cancel: '취소', edited: '수정됨',
  attach: '첨부파일', attachManage: '첨부파일 관리', chatManage: '채팅창 관리',
  attachList: '첨부 목록', noAttach: '첨부파일이 없습니다.',
  listMode: '시간순', spatialMode: '광장', spatialHint: '메시지가 광장에 떠오릅니다 · 마우스를 올리면 프로필',
  plazaManage: '광장 관리', plazaLifetime: '말풍선 유지 시간(초, 0=계속)', plazaMax: '최대 말풍선 수',
  plazaPerAccount: '계정당 표시 수', plazaShowNames: '이름 표시', plazaReplay: '다시 재생', banAll: '전체 이용제한', unbanAll: '전체 해제',
  plazaClear: '화면 비우기', plazaDragHint: '프로필을 끌어 옮기기',
  question: '질문', questionList: '질문 목록', completedList: '완료 목록',
  notice: '공지', noticePost: '공지', setNotice: '공지로 설정', unsetNotice: '공지 해제', noticeEmpty: '공지가 없습니다.',
  plazaBubbleSize: '말풍선 크기',
  anonOn: '익명으로 전환', anonOff: '익명 끄기', poll: '설문 / 투표',
  clearAll: '채팅 전체 삭제', confirmClear: '정말 전체 삭제?', ban: '이용제한', unban: '해제',
  banned: '커뮤니티 이용이 제한된 계정입니다.', drop: '📎 파일을 여기에 놓으세요',
  pollTitle: '투표 제목', pollOption: '항목', addOption: '항목 추가', createPoll: '투표 만들기',
  vote: '투표', closePoll: '완료', pollClosed: '종료됨', deadline: '마감',
  viewPoll: '투표 보기', noPoll: '진행 중인 투표가 없습니다.',
  closeAfter: '몇 분 후 종료', minutes: '분 후', orDeadline: '또는 마감 시각',
  pollNamed: '실명', pollAnon: '익명', viewResults: '결과 보기', hideResults: '결과 접기',
  showClosedPolls: '완료된 투표 보기', hideClosedPolls: '완료된 투표 숨기기', noClosedPoll: '완료된 투표가 없습니다.',
  anonHint: '익명으로 작성 중 (관리자만 실명 확인)', revealWho: '누구인지 보기 (관리자)',
}

const pad2 = (n) => String(n).padStart(2, '0')
// local "YYYY-MM-DDTHH:MM:SS" (matches the backend's naive local timestamps)
const localIso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
const isImg = (t, name) => /^image\//.test(t || '') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name || '')
const fmtSize = (n) => (n > 1e6 ? (n / 1e6).toFixed(1) + 'MB' : n > 1e3 ? Math.round(n / 1e3) + 'KB' : (n || 0) + 'B')
const timeLabel = (iso) => { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return '' } }

// react-markdown wraps text in <p> (1em top/bottom margin) — that's the "extra
// whitespace" inside a bubble. Render paragraphs margin-free so the bubble hugs
// the text (nptoy-tight); keep a small gap only between multiple paragraphs.
const CM_MD = {
  p: (props) => <p style={{ margin: 0 }} {...props} />,
  ul: (props) => <ul style={{ margin: '2px 0', paddingLeft: 18 }} {...props} />,
  ol: (props) => <ol style={{ margin: '2px 0', paddingLeft: 18 }} {...props} />,
}

// #123 / @user → light markdown emphasis; keep line breaks.
function mdPrep(text) {
  return String(text || '')
    .replace(/(^|[^\w/])@([A-Za-z0-9_가-힣]+)/g, (_, p, n) => `${p}**@${n}**`)
    .replace(/\n/g, '  \n')
}

/* ── one attachment: inline image (blob-fetched so the token travels) or a file chip ── */
function Attachment({ att, blobURL, imgMax = 240 }) {
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
          style={{ maxWidth: imgMax, maxHeight: 260, width: 'auto', height: 'auto', objectFit: 'contain', borderRadius: 8, cursor: 'pointer', display: 'block', border: '1px solid var(--border-subtle)' }} />
      : <div style={{ ...chipS, opacity: 0.6 }}><Icon name="image" size={14} /> {att.name}</div>
  }
  return (
    <button onClick={download} title={`${att.name} · ${fmtSize(att.size)}`} style={chipBtnS}>
      <span style={{ flexShrink: 0, display: 'inline-flex' }}><Icon name="download" size={14} /></span>
      <span style={{ flex: '0 1 auto', minWidth: 0, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
      <em style={{ flexShrink: 0, color: 'var(--text-muted)', fontStyle: 'normal', fontSize: 'var(--fs-micro,10px)' }}>{fmtSize(att.size)}</em>
    </button>
  )
}

const chipS = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 8, background: 'var(--surface-3)', fontSize: 'var(--fs-small,12px)' }
const chipBtnS = { ...chipS, maxWidth: '100%', minWidth: 0, border: '1px solid var(--border-default)', cursor: 'pointer', color: 'var(--text-primary)' }

/* ── a chat row: avatar + author/time + bubble(s). Everyone left-aligned. ── */
function MessageRow({ m, meKey, grouped, isManager, blobURL, onReply, onEdit, onDelete, onComplete, onNotice, onRowClick, onPollClick, revealed, onReveal, labels }) {
  const isQ = m.kind === 'question'
  const isPoll = m.kind === 'poll'
  const isNotice = !!m.notice
  const mine = m.author_key === meKey
  const bg = isNotice ? 'var(--warning-bg)' : isQ ? 'var(--warning-bg)' : isPoll ? 'var(--info-bg)' : 'var(--surface-2)'
  // every bubble gets a slightly-darker-than-bg outline; my own chat is themed.
  const bd = isNotice ? 'var(--warning-text)' : isQ ? 'var(--warning-text)' : isPoll ? 'var(--info-text)' : mine ? 'var(--btn-primary-bg)' : 'var(--border-default)'
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const canEdit = mine && onEdit && !isPoll
  const canDelete = onDelete && (mine || isManager)
  function saveEdit() { const b = draft.trim(); if (b && b !== m.body) onEdit(m, b); setEditing(false) }
  return (
    <div style={{ display: 'flex', gap: 7, padding: '1px 4px', alignItems: 'flex-start', cursor: onRowClick ? 'pointer' : 'default' }}
      onClick={onRowClick ? () => onRowClick(m) : undefined}>
      <div style={{ width: 26, flexShrink: 0 }}>
        {!grouped && <Avatar outline={m.anon} icon={m.author_shape} color={m.anon ? undefined : m.author_color} seed={m.author_username || m.author_key} size={26} title={m.author_name} />}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        {!grouped && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 1 }}>
            <span style={{ fontWeight: 600, fontSize: 'var(--fs-small,12px)', color: 'var(--text-primary)' }}>{mine ? labels.me : m.author_name}</span>
            {m.anon && m.real_name && isManager && (revealed
              ? <em title="숨기기" onClick={(e) => { e.stopPropagation(); onReveal() }} style={{ cursor: 'pointer', fontStyle: 'normal', fontSize: 'var(--fs-micro,10px)', color: 'var(--info-text)', background: 'var(--info-bg)', padding: '0 5px', borderRadius: 6 }}>{m.real_name}</em>
              : <button title={labels.revealWho} onClick={(e) => { e.stopPropagation(); onReveal() }} style={{ border: 'none', background: 'var(--surface-3)', borderRadius: 6, cursor: 'pointer', fontSize: 'var(--fs-micro,10px)', color: 'var(--text-muted)', padding: '0 5px' }}>?</button>)}
            <em style={{ fontStyle: 'normal', fontSize: 'var(--fs-micro,10px)', color: 'var(--text-muted)' }}>{timeLabel(m.created_at)}</em>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}
          onMouseEnter={(e) => { const a = e.currentTarget.querySelector('.cm-actions'); if (a) a.style.opacity = 1 }}
          onMouseLeave={(e) => { const a = e.currentTarget.querySelector('.cm-actions'); if (a) a.style.opacity = 0 }}>
          <div style={{
            position: 'relative', maxWidth: 440,
            // first bubble of a run gets a small tail toward the profile (elog style)
            borderRadius: grouped ? 12 : '3px 12px 12px 12px',
            padding: '6px 11px', background: bg, border: `1px solid ${bd}`,
            fontSize: 'var(--fs-body,13px)', color: 'var(--text-primary)',
            cursor: isPoll && onPollClick ? 'pointer' : undefined,
          }}
            onClick={isPoll && onPollClick ? (e) => { e.stopPropagation(); onPollClick(m.poll_id) } : undefined}>
            {isNotice && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 'var(--fs-micro,10px)', fontWeight: 700, color: 'var(--warning-text)', marginBottom: 2 }}><Icon name="megaphone" size={11} /> {labels.notice}</span>}
            {isQ && <span style={{ display: 'inline-block', fontSize: 'var(--fs-micro,10px)', fontWeight: 700, color: 'var(--warning-text)', marginBottom: 2 }}>{labels.question}{m.done ? ' · ' + labels.done : ''}</span>}
            {isPoll && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-small,12px)', fontWeight: 600, color: 'var(--info-text)' }}><Icon name="chart" size={14} /> {m.body} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 'var(--fs-micro,10px)' }}>· {labels.viewPoll}</span></span>}
            {m.reply_to_id ? (
              <div style={{ borderLeft: '2px solid var(--border-strong)', paddingLeft: 6, margin: '0 0 3px', fontSize: 'var(--fs-tiny,11px)', color: 'var(--text-secondary)' }}>
                <b>{m.reply_to_author}</b> {String(m.reply_to_body || '').slice(0, 60)}
              </div>
            ) : null}
            {editing ? (
              <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 220 }}>
                <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() } if (e.key === 'Escape') setEditing(false) }}
                  rows={2} style={{ ...fieldS, resize: 'vertical', fontFamily: 'inherit', fontSize: 'var(--fs-body,13px)' }} />
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button onClick={() => setEditing(false)} style={ghostBtnS}>{labels.cancel}</button>
                  <button onClick={saveEdit} style={primaryBtnS}>{labels.save}</button>
                </div>
              </div>
            ) : (
              m.body && !isPoll && <div style={{ lineHeight: 1.4, wordBreak: 'break-word' }}><ReactMarkdown remarkPlugins={[remarkGfm]} components={CM_MD}>{mdPrep(m.body)}</ReactMarkdown>{m.edited && <span style={{ fontSize: 'var(--fs-micro,10px)', color: 'var(--text-muted)', marginLeft: 4 }}>({labels.edited})</span>}</div>
            )}
            {(m.attachments || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: m.body ? 5 : 0 }}>
                {m.attachments.map((a, k) => <Attachment att={a} key={k} blobURL={blobURL} />)}
              </div>
            )}
          </div>
          <div className="cm-actions" style={{ display: 'flex', gap: 2, opacity: 0, transition: 'opacity .1s', flexShrink: 0, paddingTop: 2 }}>
            {onReply && <button title={labels.reply} onClick={(e) => { e.stopPropagation(); onReply(m) }} style={actS}><Icon name="reply" size={13} /></button>}
            {isManager && isQ && !m.done && onComplete && <button title={labels.done} onClick={(e) => { e.stopPropagation(); onComplete(m) }} style={actS}><Icon name="check" size={13} /></button>}
            {isManager && onNotice && !isPoll && <button title={isNotice ? labels.unsetNotice : labels.setNotice} onClick={(e) => { e.stopPropagation(); onNotice(m, !isNotice) }} style={{ ...actS, color: isNotice ? 'var(--warning-text)' : 'var(--text-muted)' }}><Icon name="megaphone" size={13} weight={isNotice ? 'fill' : 'regular'} /></button>}
            {canEdit && <button title={labels.edit} onClick={(e) => { e.stopPropagation(); setDraft(m.body || ''); setEditing(true) }} style={actS}><Icon name="edit" size={13} /></button>}
            {canDelete && <button title={labels.del} onClick={(e) => { e.stopPropagation(); onDelete(m) }} style={{ ...actS, color: 'var(--danger-text)' }}><Icon name="trash" size={13} /></button>}
          </div>
        </div>
      </div>
    </div>
  )
}
const actS = { border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: 3, borderRadius: 6, display: 'inline-flex' }

/* ── active poll card (docks to the right of the chat) ── */
function PollCard({ poll, isManager, onVote, onClose, labels, highlight, fetchResults }) {
  const total = poll.options.reduce((s, o) => s + (o.votes || 0), 0)
  const closed = poll.closed
  const anonPoll = poll.named === false
  const [res, setRes] = useState(null)     // { options:[{id, voters:[...]}] } or null
  async function toggleResults() {
    if (res) { setRes(null); return }
    try { setRes(await fetchResults(poll.id)) } catch { /* ignore */ }
  }
  const votersFor = (oid) => (res && res.options.find((x) => x.id === oid)?.voters) || []
  return (
    <div style={{ border: `1px solid ${highlight ? 'var(--btn-primary-bg)' : 'var(--border-default)'}`, borderRadius: 12, background: 'var(--surface)', padding: 12, boxShadow: highlight ? '0 0 0 2px var(--info-bg)' : '0 1px 2px rgba(0,0,0,.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Icon name="chart" size={15} color="var(--btn-primary-bg)" />
        <span style={{ fontWeight: 600, fontSize: 'var(--fs-small,12px)', flex: 1, minWidth: 0 }}>{poll.title}</span>
        <span style={{ fontSize: 'var(--fs-micro,10px)', padding: '1px 6px', borderRadius: 999, background: 'var(--surface-3)', color: 'var(--text-muted)' }}>{anonPoll ? labels.pollAnon : labels.pollNamed}</span>
        {closed && <span style={{ fontSize: 'var(--fs-micro,10px)', color: 'var(--text-muted)' }}>{labels.pollClosed}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {poll.options.map((o) => {
          const pct = total ? Math.round((o.votes || 0) / total * 100) : 0
          const voted = poll.my_vote === o.id
          const voters = votersFor(o.id)
          return (
            <div key={o.id}>
              <button disabled={closed} onClick={() => onVote(poll.id, o.id)}
                style={{ width: '100%', position: 'relative', textAlign: 'left', border: `1px solid ${voted ? 'var(--btn-primary-bg)' : 'var(--border-default)'}`, borderRadius: 8, padding: '5px 9px', background: 'var(--surface-2)', cursor: closed ? 'default' : 'pointer', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: 'var(--info-bg)', zIndex: 0 }} />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-small,12px)' }}>
                  <span>{voted ? '● ' : ''}{o.text}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{o.votes || 0} · {pct}%</span>
                </div>
              </button>
              {res && voters.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 4px 2px' }}>
                  {voters.map((v) => (
                    <span key={v.key} title={v.real_name ? `실제: ${v.real_name}` : undefined}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-micro,10px)', color: 'var(--text-secondary)', background: 'var(--surface-2)', borderRadius: 999, padding: '1px 7px 1px 2px' }}>
                      <Avatar outline={v.anon} icon={v.shape} color={v.color} seed={v.key} size={14} />
                      {v.name}{v.real_name ? ` (${v.real_name})` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {poll.deadline && <div style={{ fontSize: 'var(--fs-micro,10px)', color: 'var(--text-muted)', marginTop: 6 }}>{labels.deadline}: {new Date(poll.deadline).toLocaleString()}</div>}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {!anonPoll && fetchResults && (
          <button onClick={toggleResults} style={{ flex: 1, border: '1px solid var(--border-default)', borderRadius: 8, padding: '5px 0', background: 'transparent', cursor: 'pointer', fontSize: 'var(--fs-small,12px)', color: 'var(--text-secondary)' }}>{res ? labels.hideResults : labels.viewResults}</button>
        )}
        {isManager && !closed && onClose && (
          <button onClick={() => onClose(poll.id)} style={{ flex: 1, border: '1px solid var(--border-default)', borderRadius: 8, padding: '5px 0', background: 'transparent', cursor: 'pointer', fontSize: 'var(--fs-small,12px)', color: 'var(--text-secondary)' }}>{labels.closePoll}</button>
        )}
      </div>
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
  const [mode, setMode] = useState('list')        // list(시간순) | square(광장)  (display mode)
  const [panel, setPanel] = useState(null)        // right dock: null|poll|questions|completed|files|manage
  const [panelList, setPanelList] = useState([])  // questions/completed rows for the right dock
  const [qMode, setQMode] = useState(false)       // next send goes up as a question
  const [noticeMode, setNoticeMode] = useState(false)  // next send is a 공지 (manager)
  const [plusOpen, setPlusOpen] = useState(false)
  const [users, setUsers] = useState([])
  const [confirmClear, setConfirmClear] = useState(false)
  const [anon, setAnon] = useState(null)          // { name, shape, on }
  const [revealed, setRevealed] = useState(() => new Set())
  const [polls, setPolls] = useState([])
  const [pollForm, setPollForm] = useState(null)  // { title, options:[] } | null
  const [mention, setMention] = useState(null)    // { q, idx } | null  — @autocomplete
  const [admin, setAdmin] = useState(null)         // 'names' | 'bots' | null (in manage drawer)
  const [names, setNames] = useState(null)         // { surnames, given }
  const [nameDraft, setNameDraft] = useState({ surnames: '', given: '' })  // raw text (keeps spaces!)
  const [bots, setBots] = useState([])
  const [plaza, setPlaza] = useState({ lifetime: 30, max: 30, per_account: 3, show_names: true, bubble_scale: 1 })
  const [clearScreen, setClearScreen] = useState(0)   // bump → 광장 clears on-screen bubbles
  const [activePollId, setActivePollId] = useState(null)
  const [showClosed, setShowClosed] = useState(false)  // reveal completed (closed) polls

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

  // load room-wide 광장(plaza) display config
  useEffect(() => { if (api.plazaConfig) api.plazaConfig().then((c) => c && setPlaza(c)).catch(() => {}) }, [])

  // scroll to the newest BEFORE paint so 시간순 opens already at the bottom (no visible jump)
  useLayoutEffect(() => { const el = logRef.current; if (el && stick.current && mode === 'list') el.scrollTop = el.scrollHeight }, [messages, mode])

  // ── entering the community: land the cursor in the chat input, and let a bare
  //    Enter (when not already typing) jump straight to it. ──
  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Enter' || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey || banned) return
      const t = e.target, tag = t && t.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (t && t.isContentEditable)) return
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [banned])

  // ── right dock panels (poll / questions / completed / files / manage) ──
  async function openPanel(p) {
    setPlusOpen(false)
    const next = panel === p ? null : p
    setPanel(next)
    if (next === 'questions' || next === 'completed') {
      try { setPanelList(next === 'completed' ? await api.completed() : await api.questions()) } catch (e) { setError(String(e.message || e)) }
    }
    if (next === 'manage' && api.users) { try { setUsers(await api.users()) } catch {} }
  }
  async function reloadPanel() {
    if (panel === 'questions' || panel === 'completed') {
      try { setPanelList(panel === 'completed' ? await api.completed() : await api.questions()) } catch {}
    }
  }

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
    const payload = { body, kind: qMode ? 'question' : 'msg', notice: noticeMode && isManager, reply_to_id: reply?.id || 0, attachments: pending,
      anonymous: anonOn, anon_name: anonOn ? anon.name : '', anon_shape: anonOn ? anon.shape : '' }
    setText(''); setPending([]); setReply(null); setQMode(false); setNoticeMode(false)
    try {
      const m = await api.send(payload); stick.current = true
      setMessages((p) => (p.some((x) => x.id === m.id) ? p : [...p, m]))
      reloadPanel()
    } catch (e) { setError(String(e.message || e)); setText(body) }
    finally { sending.current = false }
  }

  function toggleAnon() {
    setAnon((cur) => { const next = cur ? { ...cur, on: !cur.on } : { on: true }; return next }); setPlusOpen(false)
  }
  async function deleteMsg(m) { try { await api.del(m.id); setMessages((p) => p.filter((x) => x.id !== m.id)); setPanelList((p) => p.filter((x) => x.id !== m.id)) } catch (e) { setError(String(e.message || e)) } }
  async function editMsg(m, body) { try { const u = await api.edit(m.id, body); setMessages((p) => p.map((x) => x.id === m.id ? { ...x, ...u } : x)); setPanelList((p) => p.map((x) => x.id === m.id ? { ...x, ...u } : x)) } catch (e) { setError(String(e.message || e)) } }
  async function setNotice(m, on) { try { const u = await api.setNotice(m.id, on); setMessages((p) => p.map((x) => x.id === m.id ? { ...x, ...u } : x)) } catch (e) { setError(String(e.message || e)) } }
  async function completeQ(m) { try { await api.complete(m.id); setMessages((p) => p.map((x) => x.id === m.id ? { ...x, done: true } : x)); reloadPanel() } catch (e) { setError(String(e.message || e)) } }
  async function clearAll() {
    if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); return }
    setConfirmClear(false); try { await api.clearAll(); setMessages([]) } catch (e) { setError(String(e.message || e)) }
  }
  async function toggleBan(u) { try { await api.ban(u.user_key, u.name, !u.banned); setUsers((p) => p.map((x) => x.user_key === u.user_key ? { ...x, banned: !x.banned } : x)) } catch (e) { setError(String(e.message || e)) } }
  async function vote(pid, oid) { try { await api.vote(pid, oid, { anonymous: anonOn, anon_name: anonOn ? anon.name : '', anon_shape: anonOn ? anon.shape : '' }); setPolls(await api.polls()) } catch (e) { setError(String(e.message || e)) } }
  async function closePoll(pid) { try { await api.closePoll(pid); setPolls(await api.polls()) } catch (e) { setError(String(e.message || e)) } }
  async function submitPoll() {
    const opts = (pollForm.options || []).map((s) => s.trim()).filter(Boolean)
    if (!pollForm.title.trim() || !opts.length) return
    // "N minutes from now" wins over an explicit deadline; format as local ISO (no TZ)
    let deadline = pollForm.deadline || null
    const mins = Number(pollForm.minutes)
    if (mins > 0) { const d = new Date(Date.now() + mins * 60000); deadline = localIso(d) }
    try {
      const r = await api.createPoll({ title: pollForm.title.trim(), options: opts, deadline, named: pollForm.named !== false })
      setPollForm(null); setPanel('poll')
      if (r && r.id) setActivePollId(r.id)
      setPolls(await api.polls())
    } catch (e) { setError(String(e.message || e)) }
  }

  // ── @mention autocomplete ──
  const mentionUsers = useMemo(() => {
    if (!mention) return []
    const q = (mention.q || '').toLowerCase()
    const seen = new Set()
    return (online || []).filter((u) => u.name && !seen.has(u.name) && seen.add(u.name) && u.name.toLowerCase().includes(q)).slice(0, 6)
  }, [mention, online])
  function onTextChange(e) {
    let v = e.target.value
    // "/질문 " or "/q " at the start toggles question mode (same as the button)
    const qm = /^\/(질문|q)\s/.exec(v)
    if (F.questions && qm) { setQMode(true); v = v.slice(qm[0].length) }
    // "/공식 " → 공지 (manager only)
    const nm = /^\/(공식|공지|notice)\s/.exec(v)
    if (isManager && nm) { setNoticeMode(true); v = v.slice(nm[0].length) }
    setText(v)
    const upto = v.slice(0, e.target.selectionStart != null ? Math.min(e.target.selectionStart, v.length) : v.length)
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
      if (which === 'names' && api.anonNames) { const n = await api.anonNames(); setNames(n); setNameDraft({ surnames: (n.surnames || []).join(' '), given: (n.given || []).join(' ') }) }
      if (which === 'bots' && api.bots) setBots(await api.bots())
    } catch (e) { setError(String(e.message || e)) }
  }
  // parse the raw draft only on save, so spaces stay typable while editing
  const parseNames = (s) => (s || '').split(/[\s,]+/).filter(Boolean)
  async function saveNames() {
    try { const n = await api.saveAnonNames({ surnames: parseNames(nameDraft.surnames), given: parseNames(nameDraft.given) }); setNames(n); setNameDraft({ surnames: (n.surnames || []).join(' '), given: (n.given || []).join(' ') }); setAdmin(null) } catch (e) { setError(String(e.message || e)) }
  }
  async function saveBot(b) { try { await api.saveBot(b); setBots(await api.bots()) } catch (e) { setError(String(e.message || e)) } }
  async function delBot(name) { try { await api.delBot(name); setBots(await api.bots()) } catch (e) { setError(String(e.message || e)) } }
  async function banAll(b) { try { await Promise.all(users.map((u) => api.ban(u.user_key, u.name, b))); setUsers((p) => p.map((u) => ({ ...u, banned: b }))) } catch (e) { setError(String(e.message || e)) } }
  async function savePlaza(patch) { const next = { ...plaza, ...patch }; setPlaza(next); try { if (api.savePlazaConfig) setPlaza(await api.savePlazaConfig(next)) } catch (e) { setError(String(e.message || e)) } }

  // ── the + menu: only compose actions (attach, question-mode, anon).
  //    Lists & management moved to the right dock (see rail below). ──
  const menu = [
    F.attachments && { id: 'attach', label: L.attach, icon: 'attach', on: () => { setPlusOpen(false); document.getElementById('cm-file')?.click() } },
    F.attachments && isManager && onOpenFiles && { id: 'attachManage', label: L.attachManage, icon: 'browse', on: () => { setPlusOpen(false); onOpenFiles() } },
    F.questions && { id: 'question', label: L.question, icon: 'chats', active: qMode, on: () => { setQMode((v) => !v); setPlusOpen(false); inputRef.current?.focus() } },
    isManager && { id: 'notice', label: L.noticePost, icon: 'megaphone', active: noticeMode, on: () => { setNoticeMode((v) => !v); setPlusOpen(false); inputRef.current?.focus() } },
    F.anon && { id: 'anon', label: anonOn ? L.anonOff : L.anonOn, icon: 'eye', active: anonOn, on: toggleAnon },
  ].filter(Boolean)

  // ── the right icon rail: each opens a "커뮤니티 채팅"-style box beside the chat ──
  const rail = [
    F.polls && { id: 'poll', label: L.poll, icon: 'chart', badge: polls.filter((p) => !p.closed).length || null },
    F.questions && { id: 'questions', label: L.questionList, icon: 'question-mark' },
    F.questions && { id: 'completed', label: L.completedList, icon: 'check' },
    F.attachments && { id: 'files', label: L.attachList, icon: 'attach' },
    F.moderation && isManager && { id: 'manage', label: L.chatManage, icon: 'gear' },
    F.moderation && isManager && { id: 'plaza', label: L.plazaManage, icon: 'beer-stein' },
  ].filter(Boolean)

  const activePolls = polls.filter((p) => !p.closed)
  const closedPolls = polls.filter((p) => p.closed)
  const allAttachments = useMemo(() => messages.flatMap((m) => (m.attachments || []).map((a) => ({ att: a, from: m.author_name, at: m.created_at, mid: m.id }))), [messages])
  const notices = messages.filter((m) => m.notice)

  return (
    <div style={{ display: 'flex', gap: 12, height: '100%', minHeight: 0, fontFamily: 'var(--font-sans)' }}>
      <div style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-default)', borderRadius: 12, background: 'var(--surface)', overflow: 'hidden' }}
        onDragOver={!banned && F.attachments ? (e) => { e.preventDefault(); setDrag(true) } : undefined}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDrag(false) }}
        onDrop={!banned && F.attachments ? (e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer?.files?.length) uploadFiles(e.dataTransfer.files) } : undefined}>
        {drag && <div style={{ position: 'absolute', inset: 6, border: '2px dashed var(--btn-primary-bg)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--info-bg)', color: 'var(--info-text)', zIndex: 20, pointerEvents: 'none', fontSize: 'var(--fs-medium,14px)', fontWeight: 600 }}>{L.drop}</div>}
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-2)' }}>
          <Icon name="community" size={17} />
          <span style={{ fontWeight: 600, fontSize: 'var(--fs-medium,14px)', flex: 1 }}>{L.chat}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 'var(--fs-tiny,11px)', color: 'var(--text-muted)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success-text)' }} />{L.online(online.length)}
          </span>
          {/* display-mode toggle: 시간순(list) ↔ 광장/square-view */}
          <div style={{ display: 'inline-flex', border: '1px solid var(--border-default)', borderRadius: 8, overflow: 'hidden' }}>
            {[['list', 'menu', L.listMode], ['square', 'map', L.spatialMode]].map(([mv, ic, lb]) => (
              <button key={mv} onClick={() => setMode(mv)} title={lb}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', border: 'none', cursor: 'pointer', fontSize: 'var(--fs-tiny,11px)',
                  background: mode === mv ? 'var(--btn-primary-bg)' : 'transparent', color: mode === mv ? 'var(--btn-primary-text)' : 'var(--text-secondary)' }}>
                <Icon name={ic} size={13} weight={mode === mv ? 'fill' : 'regular'} /> {lb}
              </button>
            ))}
          </div>
        </div>

        {/* 공지 box — pinned announcements right under the title bar */}
        {notices.length > 0 && (
          <div style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--warning-bg)', padding: '7px 12px', display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 140, overflowY: 'auto' }}>
            {notices.map((m) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 'var(--fs-small,12px)' }}>
                <Icon name="megaphone" size={14} color="var(--warning-text)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1, minWidth: 0, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                  <b style={{ color: 'var(--warning-text)' }}>{m.author_name}</b> · <span>{m.body}</span>
                </div>
                {isManager && <button onClick={() => setNotice(m, false)} title={L.unsetNotice} style={{ ...actS, flexShrink: 0, color: 'var(--text-muted)' }}><Icon name="close" size={13} /></button>}
              </div>
            ))}
          </div>
        )}

        {/* message area: list=시간순 (scrolling rows) or square view=광장 (floating canvas) */}
        {mode === 'square' ? (
          <SquareView messages={messages} meKey={meKey} blobURL={api.blobURL} labels={L} config={plaza} clearSignal={clearScreen} />
        ) : (
          <div ref={logRef} onScroll={() => { const el = logRef.current; if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60 }}
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {messages.length === 0 && <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: 'var(--fs-small,12px)' }}>{L.empty}</div>}
            {messages.map((m, i) => (
              <MessageRow key={m.id} m={m} meKey={meKey} isManager={isManager} blobURL={api.blobURL}
                grouped={i > 0 && messages[i - 1].author_key === m.author_key && (messages[i - 1].kind || 'msg') === 'msg' && (m.kind || 'msg') === 'msg'}
                onReply={(mm) => { setReply(mm); inputRef.current?.focus() }}
                onEdit={editMsg}
                onDelete={deleteMsg}
                onComplete={completeQ}
                onNotice={setNotice}
                onPollClick={(pid) => { setActivePollId(pid); setPanel('poll') }}
                revealed={revealed.has(m.id)} onReveal={() => setRevealed((s) => { const n = new Set(s); n.has(m.id) ? n.delete(m.id) : n.add(m.id); return n })}
                labels={L} />
            ))}
          </div>
        )}

        {error && <div style={{ padding: '4px 12px', color: 'var(--danger-text)', fontSize: 'var(--fs-small,12px)' }}>⚠ {error}</div>}
        {banned && <div style={{ padding: '8px 12px', color: 'var(--danger-text)', fontSize: 'var(--fs-small,12px)', textAlign: 'center' }}>{L.banned}</div>}

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
                  <span key={k} style={{ ...chipS, maxWidth: '100%', minWidth: 0 }}>
                    <Icon name={isImg(a.type, a.name) ? 'image' : 'file'} size={14} />
                    <span style={{ minWidth: 0, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                    <button onClick={() => setPending((p) => p.filter((_, j) => j !== k))} style={{ ...actS, padding: 0, flexShrink: 0 }}><Icon name="close" size={12} /></button>
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
                placeholder={noticeMode ? '공지를 입력하고 전송하세요…' : qMode ? '질문을 입력하고 전송하세요…' : L.placeholder}
                style={{ flex: 1, resize: 'none', maxHeight: 120, minHeight: 36, padding: '8px 11px', borderRadius: 10, fontFamily: 'inherit', fontSize: 'var(--fs-body,13px)', lineHeight: 1.4, outline: 'none', background: 'var(--input-bg,var(--surface))', color: 'var(--text-primary)',
                  border: (qMode || noticeMode) ? '2px solid var(--warning-text)' : '1px solid var(--border-default)' }} />
              <button onClick={doSend} disabled={!text.trim() && !pending.length} title={L.send}
                style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: (text.trim() || pending.length) ? 'var(--btn-primary-bg)' : 'var(--surface-3)', color: (text.trim() || pending.length) ? 'var(--btn-primary-text)' : 'var(--text-muted)' }}>
                <Icon name={uploading ? 'spinner' : 'send'} size={17} weight="fill" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* right dock: a "커뮤니티 채팅"-style box hosting the active rail panel */}
      {panel && (
        <div style={{ width: 288, flexShrink: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--border-default)', borderRadius: 12, background: 'var(--surface)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-2)' }}>
            <Icon name={(rail.find((r) => r.id === panel) || {}).icon || 'community'} size={16} color="var(--btn-primary-bg)" />
            <span style={{ fontWeight: 600, fontSize: 'var(--fs-small,12px)', flex: 1 }}>{PANEL_TITLES(L)[panel]}</span>
            {panel === 'poll' && isManager && !pollForm && (
              <button title={L.createPoll} onClick={() => setPollForm({ title: '', options: ['', ''], deadline: '', minutes: '', named: true })} style={actS}><Icon name="plus" size={16} /></button>
            )}
            <button onClick={() => setPanel(null)} title="닫기" style={actS}><Icon name="close" size={15} /></button>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* ── 투표 / 설문 ── */}
            {panel === 'poll' && <>
              {pollForm && (
                <div style={{ border: '1px solid var(--border-default)', borderRadius: 12, background: 'var(--surface)', padding: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 'var(--fs-small,12px)', marginBottom: 8 }}>{L.createPoll}</div>
                  <input value={pollForm.title} onChange={(e) => setPollForm((f) => ({ ...f, title: e.target.value }))} placeholder={L.pollTitle} style={fieldS} />
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button onClick={() => setPollForm((f) => ({ ...f, named: true }))} style={{ ...ghostBtnS, flex: 1, ...(pollForm.named !== false ? activeGhost : {}) }}>{L.pollNamed}</button>
                    <button onClick={() => setPollForm((f) => ({ ...f, named: false }))} style={{ ...ghostBtnS, flex: 1, ...(pollForm.named === false ? activeGhost : {}) }}>{L.pollAnon}</button>
                  </div>
                  {pollForm.options.map((o, i) => (
                    <input key={i} value={o} onChange={(e) => setPollForm((f) => ({ ...f, options: f.options.map((x, j) => j === i ? e.target.value : x) }))}
                      placeholder={`${L.pollOption} ${i + 1}`} style={{ ...fieldS, marginTop: 6 }} />
                  ))}
                  <button onClick={() => setPollForm((f) => ({ ...f, options: [...f.options, ''] }))} style={{ ...ghostBtnS, marginTop: 6, width: '100%' }}>+ {L.addOption}</button>
                  <div style={{ marginTop: 8, fontSize: 'var(--fs-tiny,11px)', color: 'var(--text-muted)', marginBottom: 3 }}>{L.closeAfter}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <input type="number" min="1" value={pollForm.minutes} placeholder="분"
                      onChange={(e) => setPollForm((f) => ({ ...f, minutes: e.target.value }))} style={{ ...fieldS, width: 64 }} />
                    {[5, 10, 30, 60].map((mm) => (
                      <button key={mm} onClick={() => setPollForm((f) => ({ ...f, minutes: String(mm) }))}
                        style={{ ...ghostBtnS, padding: '3px 8px', ...(String(mm) === pollForm.minutes ? activeGhost : {}) }}>{mm}</button>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 'var(--fs-tiny,11px)', color: 'var(--text-muted)', marginBottom: 3 }}>{L.orDeadline}</div>
                  <input type="datetime-local" value={pollForm.deadline} onChange={(e) => setPollForm((f) => ({ ...f, deadline: e.target.value, minutes: '' }))} style={fieldS} />
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button onClick={submitPoll} style={{ flex: 1, ...primaryBtnS, padding: '6px 0' }}>{L.createPoll}</button>
                    <button onClick={() => setPollForm(null)} style={ghostBtnS}><Icon name="close" size={14} /></button>
                  </div>
                </div>
              )}
              {!pollForm && activePolls.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-small,12px)' }}>{L.noPoll}</div>}
              {[...activePolls].sort((a, b) => (b.id === activePollId ? 1 : 0) - (a.id === activePollId ? 1 : 0))
                .map((p) => <PollCard key={p.id} poll={p} highlight={p.id === activePollId} isManager={isManager} onVote={vote} onClose={closePoll} fetchResults={api.pollResults} labels={L} />)}
              {!pollForm && (closedPolls.length > 0 || showClosed) && (
                <button onClick={() => setShowClosed((v) => !v)} style={{ ...ghostBtnS, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <Icon name={showClosed ? 'caret-up' : 'caret-down'} size={13} />
                  {(showClosed ? L.hideClosedPolls : L.showClosedPolls) + (closedPolls.length ? ` (${closedPolls.length})` : '')}
                </button>
              )}
              {!pollForm && showClosed && closedPolls.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-small,12px)' }}>{L.noClosedPoll}</div>}
              {!pollForm && showClosed && closedPolls
                .map((p) => <PollCard key={p.id} poll={p} highlight={p.id === activePollId} isManager={isManager} onVote={vote} onClose={closePoll} fetchResults={api.pollResults} labels={L} />)}
            </>}

            {/* ── 질문 목록 / 완료 목록 ── */}
            {(panel === 'questions' || panel === 'completed') && <>
              {panelList.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-small,12px)' }}>{panel === 'completed' ? L.emptyDone : L.emptyQ}</div>}
              {panelList.map((m) => (
                <div key={m.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: 10, background: 'var(--surface-2)', padding: '8px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <Avatar outline={m.anon} icon={m.author_shape} color={m.anon ? undefined : m.author_color} seed={m.author_username || m.author_key} size={18} />
                    <b style={{ fontSize: 'var(--fs-small,12px)' }}>{m.author_name}</b>
                    <em style={{ fontStyle: 'normal', fontSize: 'var(--fs-micro,10px)', color: 'var(--text-muted)', marginLeft: 'auto' }}>{timeLabel(m.created_at)}</em>
                  </div>
                  <div style={{ fontSize: 'var(--fs-small,12px)', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{m.body}</div>
                  {panel === 'questions' && isManager && !m.done && (
                    <button onClick={() => completeQ(m)} style={{ ...ghostBtnS, marginTop: 6 }}><Icon name="check" size={12} /> {L.done}</button>
                  )}
                </div>
              ))}
            </>}

            {/* ── 첨부 목록 (세로 사진도 비율 유지) ── */}
            {panel === 'files' && <>
              {allAttachments.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-small,12px)' }}>{L.noAttach}</div>}
              {allAttachments.map((x, k) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                  <Attachment att={x.att} blobURL={api.blobURL} />
                  <span style={{ fontSize: 'var(--fs-micro,10px)', color: 'var(--text-muted)' }}>{x.from} · {timeLabel(x.at)}</span>
                </div>
              ))}
            </>}

            {/* ── 채팅창 관리 (manager) — 한 줄에 한 명 + 전체 이용제한/해제 ── */}
            {panel === 'manage' && isManager && <>
              <button onClick={clearAll} style={{ ...ghostBtnS, alignSelf: 'flex-start', color: confirmClear ? 'var(--danger-text)' : 'var(--text-secondary)', borderColor: confirmClear ? 'var(--danger-text)' : 'var(--border-default)' }}>
                {confirmClear ? L.confirmClear : L.clearAll}
              </button>
              {users.length > 0 && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => banAll(true)} style={{ ...ghostBtnS, flex: 1, color: 'var(--danger-text)', borderColor: 'var(--danger-text)' }}>{L.banAll}</button>
                  <button onClick={() => banAll(false)} style={{ ...ghostBtnS, flex: 1 }}>{L.unbanAll}</button>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {users.length === 0 && <span style={{ fontSize: 'var(--fs-tiny,11px)', color: 'var(--text-muted)' }}>사용자 없음</span>}
                {users.map((u) => (
                  <div key={u.user_key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px 4px 10px', borderRadius: 8, background: u.banned ? 'var(--danger-bg)' : 'var(--surface-2)', fontSize: 'var(--fs-small,12px)' }}>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                    <button onClick={() => toggleBan(u)} style={{ ...actS, fontSize: 'var(--fs-micro,10px)', padding: '2px 8px', background: 'var(--surface)', border: '1px solid var(--border-default)', borderRadius: 999, color: u.banned ? 'var(--text-secondary)' : 'var(--danger-text)' }}>{u.banned ? L.unban : L.ban}</button>
                  </div>
                ))}
              </div>
              {(api.anonNames || api.bots) && (
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {F.anon && api.anonNames && <button onClick={() => openAdmin(admin === 'names' ? null : 'names')} style={{ ...ghostBtnS, ...(admin === 'names' ? activeGhost : {}) }}>익명 이름 목록</button>}
                  {api.bots && <button onClick={() => openAdmin(admin === 'bots' ? null : 'bots')} style={{ ...ghostBtnS, ...(admin === 'bots' ? activeGhost : {}) }}>봇 관리</button>}
                </div>
              )}
              {admin === 'names' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div><div style={lblS}>성씨 ({parseNames(nameDraft.surnames).length})</div><textarea value={nameDraft.surnames} onChange={(e) => setNameDraft((n) => ({ ...n, surnames: e.target.value }))} rows={3} style={taS} /></div>
                  <div><div style={lblS}>이름 ({parseNames(nameDraft.given).length})</div><textarea value={nameDraft.given} onChange={(e) => setNameDraft((n) => ({ ...n, given: e.target.value }))} rows={3} style={taS} /></div>
                  <button onClick={saveNames} style={primaryBtnS}>저장 · {parseNames(nameDraft.surnames).length}×{parseNames(nameDraft.given).length} 조합</button>
                </div>
              )}
              {admin === 'bots' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {bots.map((b) => (
                    <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-small,12px)' }}>
                      <Avatar icon="robot" color="#8b5cf6" seed={b.name} size={20} /> <b>@{b.name}</b>
                      <button onClick={() => saveBot({ ...b, enabled: !b.enabled })} style={{ ...ghostBtnS, marginLeft: 'auto' }}>{b.enabled ? 'on' : 'off'}</button>
                      <button onClick={() => delBot(b.name)} style={{ ...actS, color: 'var(--danger-text)' }}><Icon name="trash" size={13} /></button>
                    </div>
                  ))}
                  <BotAdd onSave={saveBot} />
                </div>
              )}
            </>}

            {/* ── 광장(plaza) 관리 (manager) ── */}
            {panel === 'plaza' && isManager && <>
              <button onClick={() => setClearScreen((n) => n + 1)} style={{ ...ghostBtnS, alignSelf: 'flex-start' }}>
                <Icon name="eye-off" size={13} /> {L.plazaClear}
              </button>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={lblS}>{L.plazaLifetime}</span>
                <input type="number" min="0" value={plaza.lifetime} onChange={(e) => savePlaza({ lifetime: Math.max(0, Number(e.target.value) || 0) })} style={fieldS} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={lblS}>{L.plazaMax}</span>
                <input type="number" min="1" value={plaza.max} onChange={(e) => savePlaza({ max: Math.max(1, Number(e.target.value) || 1) })} style={fieldS} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={lblS}>{L.plazaPerAccount}</span>
                <input type="number" min="1" value={plaza.per_account} onChange={(e) => savePlaza({ per_account: Math.max(1, Number(e.target.value) || 1) })} style={fieldS} />
              </label>
              <button onClick={() => savePlaza({ show_names: !plaza.show_names })} style={{ ...ghostBtnS, alignSelf: 'flex-start', ...(plaza.show_names ? activeGhost : {}) }}>
                <Icon name={plaza.show_names ? 'eye' : 'eye-off'} size={13} /> {L.plazaShowNames}: {plaza.show_names ? 'on' : 'off'}
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={lblS}>{L.plazaBubbleSize} · {Math.round((plaza.bubble_scale || 1) * 100)}%</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => savePlaza({ bubble_scale: Math.max(0.6, Math.round(((plaza.bubble_scale || 1) - 0.1) * 10) / 10) })} style={{ ...ghostBtnS, padding: '2px 10px' }}>−</button>
                  <input type="range" min="0.6" max="2.5" step="0.1" value={plaza.bubble_scale || 1} onChange={(e) => savePlaza({ bubble_scale: Number(e.target.value) })} style={{ flex: 1 }} />
                  <button onClick={() => savePlaza({ bubble_scale: Math.min(2.5, Math.round(((plaza.bubble_scale || 1) + 0.1) * 10) / 10) })} style={{ ...ghostBtnS, padding: '2px 10px' }}>+</button>
                </div>
              </div>
            </>}
          </div>
        </div>
      )}

      {/* right icon rail — each opens its box beside the chat (chat stays visible) */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rail.map((it) => {
          const on = panel === it.id
          return (
            <button key={it.id} onClick={() => openPanel(it.id)} title={it.label}
              style={{ position: 'relative', width: 44, height: 44, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                border: `1px solid ${on ? 'var(--btn-primary-bg)' : 'var(--border-default)'}`, borderRadius: 10, cursor: 'pointer',
                background: on ? 'var(--info-bg)' : 'var(--surface)', color: on ? 'var(--btn-primary-bg)' : 'var(--text-secondary)' }}>
              <Icon name={it.icon} size={18} weight={on ? 'fill' : 'regular'} />
              {it.badge ? <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontSize: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{it.badge}</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// right-dock box titles per panel id
const PANEL_TITLES = (L) => ({ poll: L.poll, questions: L.questionList, completed: L.completedList, files: L.attachList, manage: L.chatManage, plaza: L.plazaManage })

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

/* ── 광장 / square view: messages float in a fixed canvas (no scroll). Each bubble
   is assigned a grid CELL the first time it appears and KEEPS it — new messages
   never shuffle existing ones (a fresh bubble takes a random empty cell, or
   overlaps a random cell when the grid is full). Revealed on a staggered queue
   (profile first, then the bubble grows out), auto-expire / cap / per-account
   per room config. A living 광장 rather than a time-ordered feed. ── */
const STAGGER_MS = 110          // ≥0.1s between two bubbles appearing
const SQUARE_CSS = `
@keyframes cmProfIn { from { opacity:0; transform: scale(.5) } to { opacity:1; transform: scale(1) } }
@keyframes cmGrow { 0% { opacity:0; transform: scale(.18) } 70% { opacity:1; transform: scale(1.06) } 100% { transform: scale(1) } }
.cm-plaza-prof { animation: cmProfIn .16s ease both; cursor: grab; }
.cm-plaza-prof:active { cursor: grabbing; }
.cm-plaza-bubble { animation: cmGrow .25s cubic-bezier(.34,1.4,.5,1) .08s both; transform-origin: left center; }
.cm-plaza-info { opacity: 0; transition: opacity .15s; pointer-events: none; }
.cm-plaza-unit:hover .cm-plaza-info { opacity: 1; }
.cm-plaza-unit:hover { z-index: 8; }
`
// apply the room config: keep the last per_account per author, then the last max overall
function squareVisible(messages, cfg) {
  const list = messages.filter((m) => m.kind !== 'poll')
  const perAcc = Math.max(1, cfg.per_account || 3)
  const counts = new Map(); const kept = []
  for (let i = list.length - 1; i >= 0; i--) {           // newest → oldest
    const k = list[i].author_key
    const c = counts.get(k) || 0
    if (c < perAcc) { counts.set(k, c + 1); kept.push(list[i]) }
  }
  kept.reverse()
  return kept.slice(-Math.max(1, cfg.max || 30))
}

function SquareView({ messages, meKey, blobURL, labels, config, clearSignal }) {
  const cfg = config || { lifetime: 30, max: 30, per_account: 3, show_names: true }
  const scale = Math.min(2.5, Math.max(0.6, cfg.bubble_scale || 1))   // 광장 관리 말풍선 크기
  const HALF_W = 150 * scale, HALF_H = 48 * scale                     // clamp margins (keep units on-screen)
  const ref = useRef(null)
  const [size, setSize] = useState({ w: 800, h: 500 })
  const [focusId, setFocusId] = useState(null)   // double-clicked profile → centred, others ring around it
  const [revealed, setRevealed] = useState(() => new Set())
  const [positions, setPositions] = useState(() => new Map())   // id → {x,y} (computed from cells)
  const [nonce, setNonce] = useState(0)                         // bump → re-place everything (replay)
  const [dragPos, setDragPos] = useState(() => new Map())        // id → dragged {x,y} override
  const posCache = useRef(new Map())    // id → {fx, fy} fractional canvas coords — PERSISTENT (never moves)
  const appeared = useRef(new Map())    // id -> appear timestamp (for lifetime fade)
  const dismissed = useRef(new Set())   // ids hidden by 화면 비우기 (message stays, bubble goes)
  const queue = useRef([])
  const dragRef = useRef(null)
  const [, tick] = useState(0)

  useEffect(() => {
    const el = ref.current; if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el); return () => ro.disconnect()
  }, [])

  const visible = squareVisible(messages, cfg)
  const ids = visible.map((m) => m.id).join(',')

  // Assign positions OUTSIDE render. A cached id keeps its coords (never moves);
  // a NEW id is scattered by rejection sampling: try random spots and take the
  // first that's ≥ minDist from every placed bubble (Poisson-disk-ish) — no grid,
  // so nothing clumps at fixed points. When the canvas is crowded, take the spot
  // that's simply the farthest from others (graceful overlap).
  useEffect(() => {
    const w = size.w, h = size.h
    if (w < 60 || h < 60) return
    const cache = posCache.current
    const minDist = 150 * scale
    const rx = () => HALF_W + Math.random() * Math.max(1, w - 2 * HALF_W)
    const ry = () => HALF_H + Math.random() * Math.max(1, h - 2 * HALF_H)
    const placed = []
    for (const m of visible) { const e = cache.get(m.id); if (e) placed.push([e.fx * w, e.fy * h]) }
    for (const m of visible) {
      if (cache.has(m.id)) continue
      let best = null, bestD = -1
      for (let k = 0; k < 40; k++) {
        const x = rx(), y = ry()
        let d2 = Infinity
        for (const p of placed) { const dd = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (dd < d2) d2 = dd }
        const d = Math.sqrt(d2)
        if (d >= minDist) { best = [x, y]; break }
        if (d > bestD) { bestD = d; best = [x, y] }
      }
      if (!best) best = [rx(), ry()]
      cache.set(m.id, { fx: best[0] / w, fy: best[1] / h })
      placed.push(best)
    }
    const out = new Map()
    const cx = (v) => Math.max(HALF_W, Math.min(w - HALF_W, v))   // keep the whole unit on-screen
    const cy = (v) => Math.max(HALF_H, Math.min(h - HALF_H, v))
    for (const m of visible) { const e = cache.get(m.id); if (!e) continue; out.set(m.id, { x: cx(e.fx * w), y: cy(e.fy * h) }) }
    setPositions(out)
  }, [ids, size.w, size.h, nonce, scale])

  // enqueue any newly-visible bubble that hasn't appeared or been dismissed yet
  useEffect(() => {
    const known = new Set([...revealed, ...queue.current, ...dismissed.current])
    for (const m of visible) if (!known.has(m.id)) queue.current.push(m.id)
  }, [ids]) // eslint-disable-line

  // reveal one queued bubble every STAGGER_MS (profile-first pipeline)
  useEffect(() => {
    const t = setInterval(() => {
      if (!queue.current.length) return
      const id = queue.current.shift()
      appeared.current.set(id, Date.now())
      setRevealed((s) => { const n = new Set(s); n.add(id); return n })
    }, STAGGER_MS)
    return () => clearInterval(t)
  }, [])

  // lifetime fade: re-render on a slow tick so expired bubbles drop off
  useEffect(() => {
    if (!cfg.lifetime) return
    const t = setInterval(() => tick((n) => n + 1), 500)
    return () => clearInterval(t)
  }, [cfg.lifetime])

  // 화면 비우기: drop every on-screen bubble (the messages themselves stay)
  useEffect(() => {
    if (!clearSignal) return
    setRevealed((cur) => { cur.forEach((id) => dismissed.current.add(id)); return new Set() })
  }, [clearSignal])

  function replay() {
    dismissed.current = new Set()
    appeared.current = new Map()
    posCache.current = new Map()                     // forget all coords → re-scatter at random
    queue.current = visible.map((m) => m.id)
    setDragPos(new Map())
    setNonce((n) => n + 1)                           // re-run the placement effect
    setRevealed(new Set())
  }

  // clear focus if the focused message scrolled out of the visible set
  useEffect(() => { if (focusId && !visible.some((m) => m.id === focusId)) setFocusId(null) }, [ids]) // eslint-disable-line

  // focus layout: focused bubble at centre, everyone else on ring(s) hugging it
  // (near the outside — not pushed to the screen edges; may overlap each other).
  const focusMap = useMemo(() => {
    const map = new Map()
    if (!focusId) return map
    const w = size.w, h = size.h, ccx = w / 2, ccy = h / 2
    map.set(focusId, { x: ccx, y: ccy })
    const others = visible.filter((m) => m.id !== focusId)
    const perRing = Math.max(7, Math.round(w / (170 * scale)))
    const baseR = 155 * scale
    others.forEach((m, i) => {
      const ring = Math.floor(i / perRing), inRing = i % perRing
      const count = Math.min(perRing, others.length - ring * perRing)
      const ang = (inRing / count) * Math.PI * 2 + ring * 0.6
      const R = baseR + ring * (120 * scale)
      const x = Math.max(HALF_W, Math.min(w - HALF_W, ccx + Math.cos(ang) * R * 1.5))  // canvas is wide
      const y = Math.max(HALF_H, Math.min(h - HALF_H, ccy + Math.sin(ang) * R))
      map.set(m.id, { x, y })
    })
    return map
  }, [focusId, ids, size.w, size.h, scale]) // eslint-disable-line

  // drag a bubble by its profile to reposition it
  function startDrag(e, id) {
    e.preventDefault(); e.stopPropagation()
    const cur = dragPos.get(id) || positions.get(id); if (!cur) return
    dragRef.current = { id, cx: e.clientX, cy: e.clientY, bx: cur.x, by: cur.y }
    const move = (ev) => {
      const d = dragRef.current; if (!d) return
      setDragPos((mp) => { const n = new Map(mp); n.set(d.id, { x: d.bx + (ev.clientX - d.cx), y: d.by + (ev.clientY - d.cy) }); return n })
    }
    const up = () => { dragRef.current = null; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up)
  }

  const now = Date.now()
  return (
    <div ref={ref} onDoubleClick={() => setFocusId(null)} style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', background: 'var(--surface-2)' }}>
      <style>{SQUARE_CSS}</style>
      {visible.length === 0 && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 'var(--fs-small,12px)' }}>{labels.empty}</div>}
      <button onClick={replay} title={labels.plazaReplay} style={{ position: 'absolute', top: 10, right: 12, zIndex: 10, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', border: '1px solid var(--border-default)', borderRadius: 999, background: 'var(--surface)', cursor: 'pointer', fontSize: 'var(--fs-tiny,11px)', color: 'var(--text-secondary)' }}>
        <Icon name="refresh" size={13} /> {labels.plazaReplay}
      </button>
      {visible.map((m) => {
        if (!revealed.has(m.id) || dismissed.current.has(m.id)) return null
        const pos = focusId ? (focusMap.get(m.id) || positions.get(m.id)) : (dragPos.get(m.id) || positions.get(m.id))
        if (!pos) return null
        const frozen = dragPos.has(m.id) || !!focusId   // don't expire while dragging / focusing
        if (cfg.lifetime > 0 && !frozen) {
          const age = (now - (appeared.current.get(m.id) || now)) / 1000
          if (age > cfg.lifetime + 0.6) return null
        }
        const age = (now - (appeared.current.get(m.id) || now)) / 1000
        const expiring = cfg.lifetime > 0 && !frozen && age > cfg.lifetime
        const mine = m.author_key === meKey
        const isQ = m.kind === 'question'
        const isNotice = !!m.notice
        const emph = /!/.test(m.body || '')     // "!" → a slightly BIGGER bubble (no bold)
        const focused = focusId === m.id
        const bScale = scale * (focused ? 1.14 : 1)
        const body = m.body || ''
        const px = (n) => Math.round(n * bScale)
        return (
          <div key={m.id} className="cm-plaza-unit" style={{ position: 'absolute', left: pos.x, top: pos.y, transform: 'translate(-50%,-50%)', display: 'flex', alignItems: 'flex-start', gap: px(6), width: 'max-content', maxWidth: px(300), zIndex: focused ? 7 : undefined,
            opacity: expiring ? 0 : (focusId && !focused ? 0.9 : 1), transition: dragPos.has(m.id) ? 'opacity .5s ease' : 'left .3s ease, top .3s ease, opacity .5s ease' }}>
            <div className="cm-plaza-prof" style={{ flexShrink: 0 }} onMouseDown={(e) => startDrag(e, m.id)} onDoubleClick={(e) => { e.stopPropagation(); setFocusId((f) => f === m.id ? null : m.id) }} title={labels.plazaDragHint}>
              <Avatar outline={m.anon} icon={m.author_shape} color={m.anon ? undefined : m.author_color} seed={m.author_username || m.author_key} size={px(26)} title={m.author_name} />
            </div>
            <div style={{ minWidth: 0 }}>
              {cfg.show_names && (
                <div className="cm-plaza-info" style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: px(12), color: 'var(--text-primary)' }}>{mine ? labels.me : m.author_name}</span>
                  <em style={{ fontStyle: 'normal', fontSize: px(10), color: 'var(--text-muted)' }}>{timeLabel(m.created_at)}</em>
                </div>
              )}
              <div className="cm-plaza-bubble" style={{ maxWidth: px(240), minWidth: 0, boxSizing: 'border-box', padding: emph ? `${px(9)}px ${px(14)}px` : `${px(6)}px ${px(11)}px`, borderRadius: '3px 12px 12px 12px',
                background: (isNotice || isQ) ? 'var(--warning-bg)' : mine ? 'var(--info-bg)' : 'var(--surface)',
                border: `1px solid ${(isNotice || isQ) ? 'var(--warning-text)' : mine ? 'var(--btn-primary-bg)' : 'var(--border-default)'}`,
                fontSize: px(emph ? 15 : 13), fontWeight: 400,
                color: 'var(--text-primary)', boxShadow: focused ? '0 4px 16px rgba(0,0,0,.16)' : '0 1px 4px rgba(0,0,0,.07)', wordBreak: 'break-word', lineHeight: 1.4 }}>
                {isNotice && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: px(10), fontWeight: 700, color: 'var(--warning-text)', marginBottom: 2 }}><Icon name="megaphone" size={px(11)} /> {labels.notice}</span>}
                {body && <div><ReactMarkdown remarkPlugins={[remarkGfm]} components={CM_MD}>{mdPrep(body)}</ReactMarkdown></div>}
                {(m.attachments || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: '100%', marginTop: body ? 5 : 0 }}>
                    {m.attachments.map((a, k) => <Attachment att={a} key={k} blobURL={blobURL} imgMax={px(206)} />)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
