/**
 * TimeRangePicker — Grafana-style time-range + auto-refresh control. A range
 * preset dropdown, a manual refresh button, and an auto-refresh interval menu.
 * Owns its own auto-refresh ticker.
 *
 *   <TimeRangePicker
 *     range={rangeKey} onRangeChange={(r) => setRange(r)}      // r = { key, label, from, to }
 *     refresh={refreshKey} onRefreshChange={setRefresh}
 *     onRefresh={() => bump()} />                              // fired on manual click + each tick
 *
 * `from`/`to` are epoch-ms (to = now); `from` is null for "All time".
 */
import { useEffect, useRef } from 'react'
import Menu from './Menu.jsx'
import Button from './Button.jsx'
import Icon from '../icons.jsx'

const RANGES = [
  { key: '1h', label: 'Last 1 hour', ms: 3600e3 },
  { key: '6h', label: 'Last 6 hours', ms: 6 * 3600e3 },
  { key: '24h', label: 'Last 24 hours', ms: 24 * 3600e3 },
  { key: '7d', label: 'Last 7 days', ms: 7 * 24 * 3600e3 },
  { key: '30d', label: 'Last 30 days', ms: 30 * 24 * 3600e3 },
  { key: 'all', label: 'All time', ms: null },
]
const REFRESH = [
  { key: 'off', label: 'Off', ms: 0 },
  { key: '5s', label: '5s', ms: 5000 },
  { key: '10s', label: '10s', ms: 10000 },
  { key: '30s', label: '30s', ms: 30000 },
  { key: '1m', label: '1m', ms: 60000 },
]

export function rangeBounds(key) {
  const r = RANGES.find(x => x.key === key) || RANGES[1]
  const to = Date.now()
  return { key: r.key, label: r.label, to, from: r.ms == null ? null : to - r.ms }
}

export default function TimeRangePicker({ range = '6h', refresh = 'off', onRangeChange, onRefreshChange, onRefresh }) {
  const r = RANGES.find(x => x.key === range) || RANGES[1]
  const rf = REFRESH.find(x => x.key === refresh) || REFRESH[0]
  const cb = useRef(onRefresh); cb.current = onRefresh

  useEffect(() => {
    if (!rf.ms) return
    const id = setInterval(() => cb.current?.(), rf.ms)
    return () => clearInterval(id)
  }, [rf.ms])

  const pill = {
    display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 10px',
    border: '1px solid var(--border-default)', borderRadius: 8, cursor: 'pointer',
    background: 'var(--surface)', color: 'var(--text-primary)', fontSize: 'var(--fs-small, 12px)',
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Menu align="right" width={170}
        trigger={<span style={pill}><Icon name="schedule" size={14} />{r.label}<Icon name="caret-down" size={12} /></span>}
        sections={[{ items: RANGES.map(x => ({ id: x.key, label: x.label, active: x.key === range, onSelect: () => onRangeChange?.(rangeBounds(x.key)) })) }]} />
      <span style={{ display: 'inline-flex' }}>
        <Button variant="secondary" icon title="새로고침" onClick={() => onRefresh?.()} style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}><Icon name="refresh" size={14} /></Button>
        <Menu align="right" width={120}
          trigger={<span style={{ ...pill, height: 'auto', padding: '4px 8px', borderTopLeftRadius: 0, borderBottomLeftRadius: 0, marginLeft: -1 }}>{rf.label}<Icon name="caret-down" size={11} /></span>}
          sections={[{ label: 'Auto refresh', items: REFRESH.map(x => ({ id: x.key, label: x.label, active: x.key === refresh, onSelect: () => onRefreshChange?.(x.key) })) }]} />
      </span>
    </span>
  )
}
