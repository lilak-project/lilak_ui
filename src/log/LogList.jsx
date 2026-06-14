/**
 * LogList — renders a feed of log entries in their array order with a
 * CONFIGURABLE group divider (#8). elog historically drew a divider whenever the
 * run number changed; here the grouping key is switchable: run / date / run type
 * / beam / target / none.
 *
 *   <LogList
 *     entries={filtered}          // already in display order (e.g. newest→oldest)
 *     groupBy="run"               // 'run'|'date'|'run_type'|'beam'|'target'|'none' | fn(entry)
 *     reverse={false}             // flip the array before rendering (default true)
 *     gap={3}
 *     renderItem={(entry, idx) => <Card …/>} // idx = index into `entries`
 *   />
 *
 * Entries render strictly in (optionally reversed) array order so the feed stays
 * monotonically sorted. Task children (entry.parent_log_id present) carry the
 * same group key as their mother (e.g. run_number), so they sit inline next to
 * it in time order rather than being pinned above/below it — keeping the list
 * correctly sorted regardless of the parent/child relationship.
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

  const list = reverse ? [...entries].reverse() : entries
  const idxOf = (e) => entries.indexOf(e)
  const out = []
  let prevKey
  const grouping = groupBy !== 'none'

  for (const e of list) {
    const key = accessor(e)
    if (grouping && prevKey !== undefined && key !== prevKey) {
      out.push(<div key={`sep-${e.id}`} style={{ height: 2, margin: '4px 0', backgroundColor: dividerColor }} />)
    }
    prevKey = key
    out.push(renderItem(e, idxOf(e)))
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap }}>{out}</div>
}
