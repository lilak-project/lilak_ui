/**
 * CopyField — a read-only value shown in a code box with a copy button that
 * flips to a "copied" confirmation. For webhook URLs, tokens, share links, etc.
 *
 *   <CopyField value={bridge.incoming_url} />
 *   <CopyField value={token} labels={{ copy:'복사', copied:'복사됨' }} />
 */
import { useState } from 'react'
import Icon from '../icons.jsx'

export default function CopyField({ value, mono = true, labels = {}, style, ...rest }) {
  const [copied, setCopied] = useState(false)
  if (value == null || value === '') return null
  const L = { copy: 'copy', copied: 'copied', ...labels }

  function copy() {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...style }} {...rest}>
      <code style={{
        flex: 1, minWidth: 0, fontSize: 'var(--fs-tiny, 11px)', padding: '4px 8px', borderRadius: 6,
        border: '1px solid var(--border-default)', backgroundColor: 'var(--surface-2)',
        color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono, ui-monospace, monospace)' : 'inherit',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</code>
      <button type="button" onClick={copy}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
          fontSize: 'var(--fs-tiny, 11px)', padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
          border: '1px solid var(--info-text)', backgroundColor: 'var(--info-bg)', color: 'var(--info-text)',
        }}>
        <Icon name={copied ? 'check' : 'copy'} size={12} weight={copied ? 'bold' : 'regular'} />
        {copied ? L.copied : L.copy}
      </button>
    </div>
  )
}
