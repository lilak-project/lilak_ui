/**
 * LogList — renders a feed of log entries with task-child nesting and a
 * CONFIGURABLE group divider (#8). elog historically drew a divider whenever the
 * run number changed; here the grouping key is switchable: run / date / run type
 * / beam / target / none.
 *
 *   <LogList
 *     entries={filtered}          // API order (oldest→newest)
 *     groupBy="run"               // 'run'|'date'|'run_type'|'beam'|'target'|'none' | fn(entry)
 *     reverse                     // show newest first (elog default)
 *     gap={3}
 *     renderItem={(entry, idx) => <Card …/>} // idx = index into `entries`
 *   />
 *
 * Task children (entry.parent_log_id present and on this page) are kept grouped
 * directly under their mother log (not indented), as in elog.
 */
export const GROUP_ACCESSORS = {
  none: () => null,
  run: (e) => e.run_number,
  run_type: (e) => e.run_type,
  beam: (e) => e.beam,
  target: (e) => e.target,
  date: (e) => (e.created_at ? new Date(e.created_at).toISOString().slice(0, 10) : null),
}

export default function LogList({
  entries = [],
  groupBy = 'run',
  reverse = true,
  gap = 3,
  dividerColor = 'var(--border-default)',
  renderItem,
}) {
  const accessor = typeof groupBy === 'function' ? groupBy : (GROUP_ACCESSORS[groupBy] || GROUP_ACCESSORS.none)

  // task children grouped under their mother (within this page)
  const idSet = new Set(entries.map((e) => e.id))
  const childrenOf = {}
  for (const e of entries) {
    if (e.parent_log_id != null && idSet.has(e.parent_log_id)) {
      (childrenOf[e.parent_log_id] ||= []).push(e)
    }
  }
  let topLevel = entries.filter((e) => e.parent_log_id == null || !idSet.has(e.parent_log_id))
  if (reverse) topLevel = [...topLevel].reverse()

  const idxOf = (e) => entries.indexOf(e)
  const out = []
  let prevKey
  const grouping = groupBy !== 'none'

  for (const e of topLevel) {
    const key = accessor(e)
    if (grouping && prevKey !== undefined && key !== prevKey) {
      out.push(<div key={`sep-${e.id}`} style={{ height: 2, margin: '4px 0', backgroundColor: dividerColor }} />)
    }
    prevKey = key
    out.push(renderItem(e, idxOf(e)))
    const kids = childrenOf[e.id]
    if (kids) {
      for (const k of [...kids].sort((a, b) => a.id - b.id)) out.push(renderItem(k, idxOf(k)))
    }
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap }}>{out}</div>
}
