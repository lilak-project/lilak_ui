/**
 * DataTable — dense, theme-aware table tuned for high information density.
 *
 * Compact row height, hairline row borders, optional zebra striping, sticky
 * header, hover highlight. Built for "many rows on one screen" tools, not
 * roomy marketing cards.
 *
 *   <DataTable
 *     columns={[
 *       { key: 'name',  header: 'Parameter', width: '42%', mono: true, muted: true },
 *       { key: 'value', header: 'Value', mono: true,
 *         render: (row) => <Input value={row.value} /> },
 *     ]}
 *     rows={rows}
 *     rowKey={(r, i) => i}
 *     zebra
 *     onRowClick={…}
 *     selectedKey={sel}
 *   />
 */
import { tableHeader } from '../theme/uiStyles.js'

const DENSITY = {
  compact:     { cellPad: '3px 12px', fontSize: 'var(--fs-tiny, 11px)', headPad: '5px 12px' },
  comfortable: { cellPad: '6px 12px', fontSize: 'var(--fs-small, 12px)', headPad: '7px 12px' },
}

export default function DataTable({
  columns = [],
  rows = [],
  rowKey = (_r, i) => i,
  rowId,
  density = 'compact',
  zebra = false,
  stickyHeader = false,
  onRowClick,
  selectedKey,
  emptyText = 'no rows',
  style,
}) {
  const d = DENSITY[density] ?? DENSITY.compact
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: d.fontSize, ...style }}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              style={{
                backgroundColor: tableHeader.backgroundColor,
                color: tableHeader.color,
                textAlign: c.align ?? 'left',
                fontWeight: 500,
                fontSize: 'var(--fs-micro, 10px)',
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                padding: d.headPad,
                width: c.width,
                borderBottom: '1px solid var(--border-default)',
                position: stickyHeader ? 'sticky' : undefined,
                top: stickyHeader ? 0 : undefined,
                zIndex: stickyHeader ? 1 : undefined,
              }}
            >
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} style={{ padding: 18, textAlign: 'center', color: 'var(--text-muted)' }}>
              {emptyText}
            </td>
          </tr>
        )}
        {rows.map((row, i) => {
          const key = rowKey(row, i)
          const selected = selectedKey != null && key === selectedKey
          const striped = zebra && i % 2 === 1
          return (
            <tr
              key={key}
              id={rowId ? rowId(row, i) : undefined}
              onClick={onRowClick ? () => onRowClick(row, i) : undefined}
              style={{
                backgroundColor: selected ? 'var(--info-bg)' : striped ? 'var(--surface-2)' : 'var(--surface)',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background-color .1s',
              }}
              onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = 'var(--surface-2)' }}
              onMouseLeave={(e) => { if (!selected) e.currentTarget.style.backgroundColor = striped ? 'var(--surface-2)' : 'var(--surface)' }}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{
                    padding: d.cellPad,
                    textAlign: c.align ?? 'left',
                    borderBottom: '1px solid var(--border-subtle)',
                    color: c.muted ? 'var(--text-secondary)' : 'var(--text-primary)',
                    fontFamily: c.mono ? 'var(--font-mono, ui-monospace, monospace)' : 'inherit',
                    // `fit` columns (e.g. action buttons) hug their content and never clip
                    whiteSpace: c.wrap ? 'normal' : 'nowrap',
                    overflow: c.fit ? 'visible' : 'hidden',
                    textOverflow: c.fit ? 'clip' : 'ellipsis',
                    maxWidth: c.fit ? undefined : 0,
                    width: c.fit ? 1 : c.width,
                  }}
                >
                  {c.render ? c.render(row, i) : row[c.key]}
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
