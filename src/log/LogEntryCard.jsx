/**
 * LogEntryCard — faithful port of lilak_elog's LogCard, decoupled from elog's
 * api/router deps and styled with the kit's CSS-variable tokens.
 *
 * Reads the same entry shape as elog (drop-in for real elog data):
 *   { id, log_index, title, body, body_excerpt, level, tags:[{id,name,color,border_color,text_color}],
 *     run_number, run_number_type, run_number_text, run_type, beam, target,
 *     author_name, created_at, source, attachment_count, is_auto, is_deleted, parent_log_id }
 *
 *   viewMode: 'brief' | 'normal' | 'rich'
 */
import { runNumberText } from './formatUtils.js'
import { RUN_STATUS_TAG, chipProps, synthChipProps } from './tagColors.js'
import Markdown from './Markdown.jsx'

// run-number / beam / target badge colors — verbatim from elog EntryShared
const RUN_NUM = { backgroundColor: '#374151', color: '#fff' }
const RUN_NUM_ALT = { backgroundColor: '#d1d5db', color: '#111827' }
const BEAM = { backgroundColor: '#0d9488', color: '#fff' }
const TARGET = { backgroundColor: '#db2777', color: '#fff' }

function severityStyle(level) {
  switch (level) {
    case 'warning':  return { backgroundColor: 'var(--warning-bg)', color: 'var(--warning-text)' }
    case 'error':    return { backgroundColor: 'var(--danger-bg)',  color: 'var(--danger-text)' }
    case 'critical': return { backgroundColor: 'var(--btn-danger-bg)', color: 'var(--btn-danger-text)' }
    default:         return { backgroundColor: 'var(--info-bg)',    color: 'var(--info-text)' }
  }
}

function cardFrameStyle(entry, focused) {
  if (focused)          return { backgroundColor: 'var(--info-bg)',   borderColor: 'var(--border-focus)' }
  if (entry.is_deleted) return { backgroundColor: 'var(--danger-bg)', borderColor: 'var(--danger-bg)', opacity: 0.6 }
  return                       { backgroundColor: 'var(--surface-2)', borderColor: 'var(--border-subtle)' }
}

function stripMarkdown(text = '') {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[[^\]]*\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '').replace(/[*_~]{1,3}/g, '').replace(/>\s*/g, '')
    .replace(/\n{2,}/g, ' ').replace(/\n/g, ' ').trim()
}

/** [*run] [>beam] [@target] — run status is shown as a tag, not here. */
function RunBadges({ entry, sm }) {
  const num = runNumberText(entry)
  if (!num && !entry.beam && !entry.target) return null
  const cls = { fontSize: 'var(--fs-tiny, 11px)', fontFamily: 'var(--font-mono)', padding: sm ? '1px 6px' : '1px 8px', borderRadius: 4, flexShrink: 0 }
  const single = entry.run_number_type === 'single' || !entry.run_number_type
  const numStyle = (single && entry.run_number != null && entry.run_number % 2 === 1) ? RUN_NUM_ALT : RUN_NUM
  return (
    <>
      {num && <span style={{ ...cls, ...numStyle }}>{`*${num}`}</span>}
      <span style={{ ...cls, ...BEAM }}>{`>${entry.beam || ''}`}</span>
      <span style={{ ...cls, ...TARGET }}>{`@${entry.target || ''}`}</span>
    </>
  )
}

const CHIP = { fontSize: 'var(--fs-tiny, 11px)', padding: '1px 8px', borderRadius: 999, flexShrink: 0, whiteSpace: 'nowrap' }

export default function LogEntryCard({ entry, viewMode = 'normal', focused = false, expanded = false, onClick, tagColorMap }) {
  const sev = severityStyle(entry.level)
  const frame = cardFrameStyle(entry, focused)
  const idPill = { fontSize: 'var(--fs-small, 12px)', fontFamily: 'var(--font-mono)', padding: '2px 6px', borderRadius: 4, backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)', flexShrink: 0 }
  // elog LogCard shows the raw title; run context is carried by the run badges + status tag.
  const title = entry.title

  const realTags = (entry.tags || []).filter((tg) => tg && tg.name)
  const runTag = RUN_STATUS_TAG[entry.run_type]
  const hasConfirm = realTags.some((tg) => tg.name === 'confirmation required')
  const isPending = entry.task_status === 'pending' && !entry.task_service_id && !entry.task_module

  const synthChip = (name) => <span key={name} style={{ ...CHIP, ...synthChipProps(name, tagColorMap).style }}>#{name}</span>
  const realChip = (tg) => <span key={tg.id ?? tg.name} style={{ ...CHIP, ...chipProps(tg.name, tg.color, tg.border_color, tg.text_color).style }}>#{tg.name}</span>
  const tagChips = (
    <>
      {runTag && synthChip(runTag)}
      {isPending && synthChip('pending')}
      {entry.is_auto && synthChip('auto')}
      {entry.parent_log_id && synthChip('task')}
      {hasConfirm && synthChip('confirm')}
      {realTags.filter((tg) => tg.name !== 'confirmation required').map(realChip)}
    </>
  )

  /* ── brief: single compact row ─────────────────────────────────────────── */
  if (viewMode === 'brief') {
    return (
      <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, padding: '6px 12px', borderRadius: 8, border: '1px solid', cursor: 'pointer', ...frame }}>
        <span style={idPill}>_{entry.log_index ?? entry.id}</span>
        {entry.is_deleted && <span style={{ ...CHIP, backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)' }}>DELETED</span>}
        {entry.level && entry.level !== 'info' && <span style={{ ...sev, fontSize: 'var(--fs-tiny, 11px)', padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>{entry.level.toUpperCase()}</span>}
        <RunBadges entry={entry} sm />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-body, 13px)', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        {tagChips}
        <span style={{ flex: 1 }} />
        {entry.attachment_count > 0 && <span style={{ fontSize: 'var(--fs-tiny, 11px)', color: 'var(--text-muted)', flexShrink: 0 }}>[{entry.attachment_count}]</span>}
        <span style={{ fontSize: 'var(--fs-tiny, 11px)', color: 'var(--text-muted)', flexShrink: 0 }}>{entry.author_name}</span>
        <span style={{ fontSize: 'var(--fs-tiny, 11px)', color: 'var(--text-muted)', flexShrink: 0 }}>{entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ''}</span>
      </div>
    )
  }

  /* ── normal / rich: card ───────────────────────────────────────────────── */
  return (
    <div onClick={onClick} style={{ border: '1px solid', borderRadius: 12, cursor: 'pointer', ...frame }}>
      <div style={{ padding: viewMode === 'rich' ? '14px 16px' : '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* row 1: id + level + run badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={idPill}>_{entry.log_index ?? entry.id}</span>
          {entry.is_deleted && <span style={{ ...CHIP, backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)' }}>DELETED</span>}
          {entry.level && entry.level !== 'info' && <span style={{ ...sev, fontSize: 'var(--fs-tiny, 11px)', padding: '1px 8px', borderRadius: 999, flexShrink: 0 }}>{entry.level.toUpperCase()}</span>}
          <RunBadges entry={entry} />
        </div>
        {/* row 2: title */}
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: viewMode === 'rich' ? 15 : 14, fontWeight: 500, lineHeight: 1.35, color: 'var(--text-primary)' }}>{title}</div>
        {/* row 3: tags */}
        {(runTag || isPending || entry.is_auto || entry.parent_log_id || entry.tags?.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{tagChips}</div>
        )}
        {/* row 4: author / date / source / attachments */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 'var(--fs-small, 12px)', color: 'var(--text-secondary)' }}>
          <span>{entry.author_name}</span>
          <span>{entry.created_at ? new Date(entry.created_at).toLocaleString() : ''}</span>
          {entry.source && entry.source !== 'human' && <span style={{ color: 'var(--text-link)' }}>{entry.source}</span>}
          {entry.attachment_count > 0 && <span>[{entry.attachment_count}]</span>}
        </div>
        {/* body: full markdown (expanded) or excerpt (rich) */}
        {expanded && entry.body && (
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border-subtle)' }}><Markdown>{entry.body}</Markdown></div>
        )}
        {!expanded && viewMode === 'rich' && (entry.body_excerpt || entry.body) && (
          <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--border-subtle)', fontSize: 'var(--fs-body, 13px)', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            {stripMarkdown(entry.body_excerpt || entry.body).slice(0, 280)}{(entry.body_excerpt || entry.body).length >= 300 ? '…' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
