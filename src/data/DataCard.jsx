/**
 * DataCard — the unified "data component" the whole app is built from.
 *
 * Every surface that *holds data* renders as a DataCard: experiment module/service
 * entries, log entries, browsed files/photos, infography figures. They all share
 * the same two-state shape so navigation, tagging, and commenting work uniformly.
 *
 *   collapsed → title + the important tags only (a dense, scannable row)
 *   expanded  → the full data; the body renders by `media.type`:
 *                 'image' → the picture        'text' → the text
 *                 'node'  → any React content  (or pass children)
 *
 * Each kind has a one-char INDEX used by the command bar to jump to an entry by
 * number:  % module/service · _ log · ^ file/photo · & infography.
 *
 *   <DataCard kind="file" number={12} title="run_0253.dat" tags={['daq']}
 *     open={open} onToggle={...} focused={...} onFocus={...}
 *     media={{ type:'image', src:url }}
 *     onAddTag={...} onComment={...} />
 *
 * Grid navigation (arrows + hjkl focus, space toggle) lives in <DataGrid>; a
 * DataCard is also fully usable standalone.
 */
import { useRef } from 'react'
import Icon from '../icons.jsx'

// kind → index char. Surfaces may override via the `indexChar` prop.
export const KIND_INDEX = {
  module: '%', service: '%',
  log: '_',
  file: '^', photo: '^', image: '^',
  infograph: '&', figure: '&',
}

const Tag = ({ children }) => (
  <span style={{
    fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-tiny, 11px)', lineHeight: '16px',
    padding: '0 6px', borderRadius: 999,
    backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)', whiteSpace: 'nowrap',
  }}>#{String(children).replace(/^#/, '')}</span>
)

export default function DataCard({
  kind = 'item',
  indexChar,
  number,
  title,
  tags = [],
  open = false,
  onToggle,
  focused = false,
  onFocus,
  media,
  headerActions,
  onAddTag,
  onComment,
  bookmarked = false,
  onToggleBookmark,
  maxTags = 3,
  children,
  style,
  bodyStyle,
  ...rest
}) {
  const ref = useRef(null)
  const idx = indexChar || KIND_INDEX[kind] || '·'
  const shownTags = open ? tags : tags.slice(0, maxTags)
  const moreTags = !open && tags.length > maxTags ? tags.length - maxTags : 0

  return (
    <div
      ref={ref}
      tabIndex={-1}
      onFocus={onFocus}
      onMouseDown={onFocus}
      data-data-card
      style={{
        display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--surface)',
        borderWidth: 1, borderStyle: 'solid',
        borderColor: focused ? 'var(--border-focus)' : 'var(--border-default)',
        borderRadius: 'var(--radius-lg, 10px)',
        boxShadow: focused ? '0 0 0 2px var(--border-focus)' : 'none',
        outline: 'none', overflow: 'hidden',
        transition: 'border-color .12s, box-shadow .12s',
        ...style,
      }}
      {...rest}
    >
      {/* Header — the collapsed view is just this row (clean, no extra rule). */}
      <div
        onClick={() => onToggle?.(!open)}
        data-drag-handle
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
          cursor: 'pointer', minWidth: 0,
          // only divide header from body when expanded — collapsed has no rule
          borderBottomWidth: open ? 1 : 0, borderBottomStyle: 'solid',
          borderBottomColor: 'var(--border-subtle)',
        }}
      >
        <span style={{
          flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 18, height: 16, padding: '0 4px', borderRadius: 4,
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro, 10px)', fontWeight: 700,
          backgroundColor: 'var(--surface-2)', color: 'var(--text-muted)',
        }} title={`${idx}${number ?? ''}`}>{idx}{number ?? ''}</span>

        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-small, 12px)', color: 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
        }}>{title}</span>

        {shownTags.length > 0 && (
          <span style={{ display: 'flex', gap: 4, alignItems: 'center', overflow: 'hidden' }}>
            {shownTags.map((tg) => <Tag key={tg}>{tg}</Tag>)}
            {moreTags > 0 && <span style={{ fontSize: 'var(--fs-micro, 10px)', color: 'var(--text-muted)' }}>+{moreTags}</span>}
          </span>
        )}

        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {headerActions}
          {onToggleBookmark && (
            <button type="button" title={bookmarked ? '북마크 해제 (*)' : '북마크 (*)'}
              onClick={(e) => { e.stopPropagation(); onToggleBookmark() }}
              style={{ display: 'inline-flex', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                color: bookmarked ? 'var(--warning-text)' : 'var(--text-muted)' }}>
              <Icon name={bookmarked ? 'pin' : 'pin'} size={13} weight={bookmarked ? 'fill' : 'regular'} />
            </button>
          )}
          <span style={{ display: 'inline-flex', color: 'var(--text-muted)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .12s' }}>
            <Icon name="caret-right" size={13} />
          </span>
        </span>
      </div>

      {/* Body — full data, rendered by media type. Only present when expanded. */}
      {open && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: media?.type === 'image' ? 0 : '10px 12px', ...bodyStyle }}>
            {children != null ? children
              : media?.type === 'image' ? (
                <img src={media.src} alt={title} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', backgroundColor: 'var(--surface-2)' }} />
              ) : media?.type === 'text' ? (
                <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-small, 12px)', lineHeight: 1.5, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{media.text}</pre>
              ) : media?.type === 'node' ? media.node : null}
          </div>

          {(onAddTag || onComment) && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px',
              borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'var(--border-subtle)',
            }}>
              {onAddTag && (
                <button onClick={(e) => { e.stopPropagation(); onAddTag() }} style={footBtn} title="태그 추가">
                  <Icon name="tag" size={12} /> 태그
                </button>
              )}
              {onComment && (
                <button onClick={(e) => { e.stopPropagation(); onComment() }} style={footBtn} title="댓글 (커뮤니티에 남습니다)">
                  <Icon name="chats" size={12} /> 댓글
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const footBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  height: 22, padding: '0 8px', borderRadius: 6, cursor: 'pointer',
  borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border-subtle)',
  background: 'transparent', color: 'var(--text-secondary)', fontSize: 'var(--fs-tiny, 11px)', fontFamily: 'var(--font-sans)',
}
