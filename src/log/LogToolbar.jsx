import Select from '../components/Select.jsx'
/**
 * LogToolbar — the bar above a log feed: page-size, view-mode, the configurable
 * group-by selector (#8), a filter toggle, plus free slots for status chips and
 * actions. Prop-driven and i18n-agnostic (pass label strings / label fns).
 *
 *   <LogToolbar
 *     pageSize={20} pageSizes={[10,20,50]} onPageSize={setPageSize}
 *     viewMode={vm} viewModes={['brief','normal','rich']} onViewMode={setVm}
 *     viewLabel={(m)=>t('view_'+m)}
 *     groupBy={gb} groupOptions={GROUP_OPTS} onGroupBy={setGb} groupLabel={t('group_by')}
 *     filterActive={isFiltered} onToggleFilter={...} filterLabel={t('filter_title')}
 *     status={<…chips…>} actions={<…buttons…>} />
 *
 * `style` merges into the bar's own — that is how a host overrides the default
 * gap it leaves below itself.
 */
function Segmented({ value, options, onChange, render }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: 2, height: 32, borderRadius: 8, backgroundColor: 'var(--dock-surface-2)' }}>
      {options.map((opt) => {
        const v = typeof opt === 'object' ? opt.value : opt
        const label = render ? render(opt) : (typeof opt === 'object' ? opt.label : opt)
        const on = v === value
        return (
          <button key={v} onClick={() => onChange(v)}
            style={{
              height: '100%', padding: '0 11px', borderRadius: 6, fontSize: 'var(--fs-small, 12px)', fontWeight: 500,
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              backgroundColor: on ? 'var(--dock-surface)' : 'transparent',
              color: on ? 'var(--dock-text-primary)' : 'var(--dock-text-secondary)',
              boxShadow: on ? '0 1px 2px rgba(0,0,0,0.08)' : 'none', transition: 'background-color .12s, color .12s',
            }}>{label}</button>
        )
      })}
    </div>
  )
}

export default function LogToolbar({
  pageSize, pageSizes = [10, 20, 50], onPageSize,
  viewMode, viewModes = ['brief', 'normal', 'rich'], onViewMode, viewLabel = (m) => m,
  groupBy, groupOptions, onGroupBy, groupLabel = 'group',
  filterActive, onToggleFilter, filterLabel = 'Filter',
  status, actions, style,
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, height: 44,
      borderBottom: '1px solid var(--dock-border-default)', fontFamily: 'var(--font-sans)',
      // The bar is always followed by the feed it controls, and it had no gap at
      // all — the first entry sat welded to the bar's bottom rule, reading as a
      // header row of the list rather than the first item in it.
      marginBottom: 10,
      ...style,
    }}>
      {onPageSize && (
        <Segmented value={pageSize} options={pageSizes} onChange={onPageSize} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>{status}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        {groupOptions && onGroupBy && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 4px 0 10px',
            borderRadius: 8, backgroundColor: 'var(--dock-surface-2)', fontSize: 'var(--fs-small, 12px)', color: 'var(--dock-text-secondary)' }}>
            <span style={{ whiteSpace: 'nowrap' }}>{groupLabel}</span>
            <Select value={groupBy} onChange={(e) => onGroupBy(e.target.value)}
              style={{ height: 26, border: 'none', borderRadius: 6, background: 'var(--dock-surface)', color: 'var(--dock-text-primary)',
                fontSize: 'var(--fs-small, 12px)', padding: '0 6px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
              {groupOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </label>
        )}

        {onToggleFilter && (
          <button onClick={onToggleFilter}
            style={{
              height: 32, padding: '0 12px', borderRadius: 8, fontSize: 'var(--fs-small, 12px)', fontWeight: 500, cursor: 'pointer', border: 'none',
              backgroundColor: filterActive ? 'var(--dock-info-bg)' : 'var(--dock-surface-2)',
              color: filterActive ? 'var(--dock-info-text)' : 'var(--dock-text-secondary)',
            }}>{filterLabel}{filterActive ? ' •' : ''}</button>
        )}

        {(onViewMode) && (
          <Segmented value={viewMode} options={viewModes} onChange={onViewMode} render={viewLabel} />
        )}

        {actions}
      </div>
    </div>
  )
}
