/**
 * LogDetail — the expanded / full view of a log entry, built from kit tokens.
 * Renders the REUSABLE structure (header with id + level + run badges + tags,
 * title, meta, markdown body, attachments) and exposes SLOTS for app-specific
 * blocks (confirmation banners, custom fields, child tasks, the action bar, and
 * the comments thread) so an app supplies those without the kit knowing them.
 *
 *   <LogDetail entry={summary} detail={full} tagColorMap={map}
 *     labels={{ noBody, attachments:(n)=>…, close, editedBy:(by,at)=>… }}
 *     banner={<ConfirmationBanner/>}      // above tags
 *     beforeBody={<CustomFields/><ChildTasks/>}
 *     actions={<ActionBar/>}              // below body/attachments
 *     footer={<CommentBox/><Comments/>}   // bottom
 *     onClose={…} focused />
 *
 * Attachments are rendered internally from `detail.attachments`
 * (`{id, filename, original_filename, size, content_type}`) via `attachmentHref`.
 */
import { useState } from 'react'
import { runNumberText, formatLogStamp } from './formatUtils.js'
import { isPolling } from './LogEntryCard.jsx'
import { RUN_STATUS_TAG, chipProps, synthChipProps } from './tagColors.js'
import Markdown from './Markdown.jsx'
import Icon from '../icons.jsx'
import Lightbox from '../components/Lightbox.jsx'

const RUN_NUM = { backgroundColor: '#374151', color: '#fff' }
const RUN_NUM_ALT = { backgroundColor: '#d1d5db', color: '#111827' }
const BEAM = { backgroundColor: '#0d9488', color: '#fff' }
const TARGET = { backgroundColor: '#db2777', color: '#fff' }
const CHIP = { fontSize: 'var(--fs-tiny, 11px)', padding: '2px 8px', borderRadius: 999, flexShrink: 0, whiteSpace: 'nowrap' }

function severityStyle(level) {
  switch (level) {
    case 'warning':  return { backgroundColor: 'var(--warning-bg)', color: 'var(--warning-text)' }
    case 'error':    return { backgroundColor: 'var(--danger-bg)',  color: 'var(--danger-text)' }
    case 'critical': return { backgroundColor: 'var(--btn-danger-bg)', color: 'var(--btn-danger-text)' }
    default:         return { backgroundColor: 'var(--info-bg)',    color: 'var(--info-text)' }
  }
}

function RunBadges({ entry }) {
  const num = runNumberText(entry)
  if (!num && !entry.beam && !entry.target) return null
  const cls = { fontSize: 'var(--fs-tiny, 11px)', fontFamily: 'var(--font-mono)', padding: '1px 8px', borderRadius: 4, flexShrink: 0 }
  const single = entry.run_number_type === 'single' || !entry.run_number_type
  const numStyle = (single && entry.run_number != null && entry.run_number % 2 === 1) ? RUN_NUM_ALT : RUN_NUM
  return (
    <>
      {num && <span style={{ ...cls, ...numStyle }}>{`*${num}`}</span>}
      {entry.beam !== undefined && <span style={{ ...cls, ...BEAM }}>{`>${entry.beam || ''}`}</span>}
      {entry.target !== undefined && <span style={{ ...cls, ...TARGET }}>{`@${entry.target || ''}`}</span>}
    </>
  )
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function LogDetail({
  entry,
  detail,
  tagColorMap,
  focused = false,
  onClose,
  labels = {},
  attachmentHref = (att) => `/api/attachments/${att.filename}`,
  noticeBadge,
  headerRight,         // manager-only notice toggle etc.
  banner,
  beforeBody,
  body,                // optional: replaces the markdown body (e.g. an infograph chart)
  actions,
  footer,
  indexPrefix = '_',   // '_' for logs, '&' for infographs
  showIndex = true,    // run groups hide the per-log index pill (it's not one log)
}) {
  // Index of the attachment shown fullscreen, or null. Hoisted above the early
  // return because hooks cannot sit behind one.
  const [lightIdx, setLightIdx] = useState(null)

  const isImg = (a) => a.content_type
    ? a.content_type.startsWith('image/')
    : /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(a.original_filename || '')
  const images = (detail?.attachments || []).filter(isImg)

  if (!entry) return null
  const d = detail || entry
  const level = entry.level || 'info'
  const L = { noBody: '(no body)', attachments: (n) => `Attachments (${n})`, close: 'Close', editedBy: null, ...labels }

  const idPill = { fontSize: 'var(--fs-tiny, 11px)', fontFamily: 'var(--font-mono)', padding: '1px 6px', borderRadius: 4, backgroundColor: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }

  // tags: synthetic (run status / pending / auto / task) + real
  const isPending = d.task_status === 'pending' && !d.task_service_id && !d.task_module
  const runTag = RUN_STATUS_TAG[entry.run_type]
  const realTags = (entry.tags || []).filter((tg) => tg && tg.name && tg.name !== 'confirmation required')
  const synth = (name) => <span key={name} style={{ ...CHIP, ...synthChipProps(name, tagColorMap).style }}>#{name}</span>
  const chips = []
  if (runTag) chips.push(synth(runTag))
  if (isPending) chips.push(synth('pending'))
  if (entry.is_auto) chips.push(synth('auto'))
  if (entry.parent_log_id) chips.push(synth('task'))

  const divider = { borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginBottom: 12 }

  return (
    <div id={`log-card-${entry.id}`} style={{
      borderRadius: 12, borderWidth: 2, borderStyle: 'solid',
      borderColor: focused ? 'var(--border-focus)'
        : entry.is_deleted ? 'var(--danger-text)'
        : isPolling(entry) ? 'var(--success-border)'    // still refilling — see LogEntryCard
        : 'var(--border-default)',
      backgroundColor: 'var(--surface)', boxShadow: '0 4px 14px rgba(0,0,0,0.08)', fontFamily: 'var(--font-sans)',
    }}>
      {/* header — the whole bar closes the entry, not just the × in its corner.
          A strip that already reads as the card's title bar is the obvious
          place to click to put it away, and hunting for a 14px glyph to do it
          is the kind of aim this feed should not ask for. Controls living in
          the bar keep their own jobs (see the guard). */}
      <div onClick={onClose ? (ev) => {
             if (ev.target.closest('button, a, input, select, textarea, label')) return
             onClose()
           } : undefined}
        title={onClose ? L.close : undefined}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 16px',
        borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-2)', borderRadius: '12px 12px 0 0', flexWrap: 'wrap',
        cursor: onClose ? 'pointer' : undefined }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {showIndex && <span style={idPill}>{indexPrefix}{entry.log_index ?? entry.id}</span>}
          {level !== 'info' && <span style={{ ...CHIP, ...severityStyle(level) }}>{level.toUpperCase()}</span>}
          <RunBadges entry={entry} />
          {entry.category && <span style={{ ...CHIP, backgroundColor: 'var(--surface-3)', color: 'var(--text-secondary)' }}>{entry.category}</span>}
          {noticeBadge}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {headerRight}
          {onClose && (
            <button onClick={onClose} title={L.close}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 'var(--fs-medium, 14px)', padding: '0 4px' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}><Icon name="close" size={14} /></button>
          )}
        </div>
      </div>

      <div style={{ padding: '14px 18px 12px' }}>
        {/* title */}
        <h2 style={{ fontSize: 'var(--fs-large, 16px)', lineHeight: 1.35, margin: '0 0 4px', color: 'var(--text-primary)', fontWeight: 600 }}>
          {(entry.title || '').trim() || <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>{L.noBody}</span>}
        </h2>

        {/* meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 'var(--fs-small, 12px)', color: 'var(--text-secondary)', marginBottom: 12 }}>
          <span>{entry.author_name}</span>
          <span>{formatLogStamp(entry.created_at)}</span>
          {L.editedBy && d.updated_by && <span style={{ color: 'var(--text-muted)' }}>{L.editedBy(d.updated_by, formatLogStamp(d.updated_at))}</span>}
          {entry.source && entry.source !== 'human' && <span style={{ color: 'var(--text-link)' }}>{entry.source}</span>}
        </div>

        {banner}

        {/* tags */}
        {(chips.length > 0 || realTags.length > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
            {chips}
            {realTags.map((tag) => (
              <span key={tag.id ?? tag.name} style={{ ...CHIP, ...chipProps(tag.name, tag.color, tag.border_color, tag.text_color).style }}>#{tag.name}</span>
            ))}
          </div>
        )}

        {beforeBody}

        {/* body — an explicit `body` slot (e.g. a chart) wins over the markdown body */}
        {body !== undefined ? (
          <div style={{ ...divider }}>{body}</div>
        ) : detail ? (
          d.body
            ? <div style={{ ...divider, fontSize: 'var(--fs-medium, 14px)', color: 'var(--text-primary)' }}><Markdown>{d.body}</Markdown></div>
            : <p style={{ ...divider, fontSize: 'var(--fs-medium, 14px)', fontStyle: 'italic', color: 'var(--text-muted)' }}>{L.noBody}</p>
        ) : (
          <div style={{ ...divider }}>
            <div style={{ height: 14, borderRadius: 4, width: '75%', marginBottom: 8, backgroundColor: 'var(--surface-2)' }} />
            <div style={{ height: 14, borderRadius: 4, width: '50%', backgroundColor: 'var(--surface-2)' }} />
          </div>
        )}

        {/* attachments — images render as thumbnails, the rest as filename chips */}
        {detail?.attachments?.length > 0 && (() => {
          const files = detail.attachments.filter((a) => !isImg(a))
          return (
            <div style={{ ...divider }}>
              <div style={{ fontSize: 'var(--fs-tiny, 11px)', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-muted)', marginBottom: 8 }}>
                {L.attachments(detail.attachments.length)}
              </div>
              {images.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: files.length ? 8 : 0 }}>
                  {/* A photo on a log opens where the eye already is, the same
                      as in the gallery — a new browser tab loses the log. */}
                  {images.map((att, i) => (
                    <button key={att.id} type="button" title={att.original_filename}
                      onClick={(e) => { e.stopPropagation(); setLightIdx(i) }}
                      style={{ display: 'block', padding: 0, borderRadius: 8, overflow: 'hidden', cursor: 'zoom-in',
                               border: '1px solid var(--border-default)', background: 'none', lineHeight: 0 }}>
                      <img src={attachmentHref(att)} alt={att.original_filename} loading="lazy"
                        style={{ display: 'block', width: 'auto', maxWidth: 220, maxHeight: 220, objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              )}
              {files.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {files.map((att) => (
                    <a key={att.id} href={attachmentHref(att)} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-small, 12px)', padding: '6px 10px', borderRadius: 8,
                        border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-2)', color: 'var(--text-primary)', textDecoration: 'none' }}>
                      <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.original_filename}</span>
                      {att.size && <span style={{ color: 'var(--text-muted)' }}>{formatSize(att.size)}</span>}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )
        })()}

        {actions}
        {footer}
      </div>

      <Lightbox
        open={lightIdx != null}
        src={lightIdx != null ? attachmentHref(images[lightIdx]) : undefined}
        alt={lightIdx != null ? images[lightIdx]?.original_filename : ''}
        caption={lightIdx != null ? images[lightIdx]?.original_filename : null}
        index={lightIdx} count={images.length}
        onClose={() => setLightIdx(null)}
        onPrev={images.length > 1 ? () => setLightIdx((i) => (i - 1 + images.length) % images.length) : undefined}
        onNext={images.length > 1 ? () => setLightIdx((i) => (i + 1) % images.length) : undefined}
      />
    </div>
  )
}
