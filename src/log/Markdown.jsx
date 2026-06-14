/**
 * Markdown — GitHub-flavored markdown renderer, same engine as lilak_elog
 * (react-markdown + remark-gfm). Kit-token styled, compact.
 *
 * Requires the consumer to have react-markdown + remark-gfm installed
 * (listed as optional peerDependencies of lilak-ui).
 *
 *   <Markdown>{entry.body}</Markdown>
 */
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const components = {
  h1: (p) => <h1 style={{ fontSize: 'var(--fs-xlarge, 18px)', fontWeight: 600, margin: '8px 0 4px' }} {...p} />,
  h2: (p) => <h2 style={{ fontSize: 'var(--fs-large, 16px)', fontWeight: 600, margin: '8px 0 4px' }} {...p} />,
  h3: (p) => <h3 style={{ fontSize: 'var(--fs-medium, 14px)', fontWeight: 600, margin: '6px 0 3px' }} {...p} />,
  p:  (p) => <p style={{ margin: '4px 0', lineHeight: 1.55 }} {...p} />,
  a:  (p) => <a style={{ color: 'var(--text-link)' }} {...p} />,
  ul: (p) => <ul style={{ margin: '4px 0', paddingLeft: 20, listStyle: 'disc' }} {...p} />,
  ol: (p) => <ol style={{ margin: '4px 0', paddingLeft: 20, listStyle: 'decimal' }} {...p} />,
  li: (p) => <li style={{ margin: '2px 0' }} {...p} />,
  code: ({ inline, ...p }) => inline
    ? <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--surface-3)', padding: '1px 4px', borderRadius: 4, fontSize: '0.92em' }} {...p} />
    : <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92em' }} {...p} />,
  pre: (p) => <pre style={{ background: 'var(--surface-3)', padding: 10, borderRadius: 6, overflowX: 'auto', margin: '6px 0', fontSize: 'var(--fs-small, 12px)' }} {...p} />,
  blockquote: (p) => <blockquote style={{ borderLeft: '3px solid var(--border-strong)', paddingLeft: 10, margin: '6px 0', color: 'var(--text-secondary)' }} {...p} />,
  table: (p) => <table style={{ borderCollapse: 'collapse', margin: '6px 0', fontSize: 'var(--fs-small, 12px)' }} {...p} />,
  th: (p) => <th style={{ border: '1px solid var(--border-default)', padding: '3px 8px', background: 'var(--surface-2)' }} {...p} />,
  td: (p) => <td style={{ border: '1px solid var(--border-subtle)', padding: '3px 8px' }} {...p} />,
}

export default function Markdown({ children = '', style }) {
  return (
    <div style={{ fontSize: 'var(--fs-body, 13px)', color: 'var(--text-primary)', ...style }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
