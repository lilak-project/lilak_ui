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

/**
 * Treat a single newline as a line break.
 *
 * Markdown folds one newline into the surrounding paragraph, so a log typed with
 * Enter between its lines came back as one run-on block — the text was never
 * lost, it just stopped being readable the moment it was saved. A logbook is
 * written the way a note is, not the way a document is, so a newline means what
 * the person pressing Enter meant by it.
 *
 * Written out rather than pulled in (remark-breaks) to keep the kit's dependency
 * list as it is; the whole transform is one walk over the tree.
 */
export function remarkSoftBreaks() {
  const split = (nodes) => {
    const out = []
    for (const node of nodes) {
      if (node.children) node.children = split(node.children)
      if (node.type !== 'text' || !node.value.includes('\n')) { out.push(node); continue }
      const parts = node.value.split('\n')
      parts.forEach((part, i) => {
        if (i) out.push({ type: 'break' })
        if (part) out.push({ ...node, value: part })
      })
    }
    return out
  }
  return (tree) => { tree.children = split(tree.children) }
}

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
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkSoftBreaks]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
