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
 */
function Segmented({ value, options, onChange, render }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: 2, height: 32, borderRadius: 8, backgroundColor: 'var(--surface-2)' }}>
      {options.map((opt) => {
        const v = typeof opt === 'object' ? opt.value : opt
        const label = render ? render(opt) : (typeof opt === 'object' ? opt.label : opt)
        const on = v === value
        return (
          <button key={v} onClick={() => onChange(v)}
            style={{
              height: '100%', padding: '0 11px', borderRadius: 6, fontSize: 'var(--fs-small, 12px)', fontWeight: 500,
              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              backgroundColor: on ? 'var(--surface)' : 'transparent',
              color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
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
  status, actions,
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, height: 44,
      borderBottom: '1px solid var(--border-default)', fontFamily: 'var(--font-sans)',
    }}>
      {onPageSize && (
        <Segmented value={pageSize} options={pageSizes} onChange={onPageSize} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>{status}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        {groupOptions && onGroupBy && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 4px 0 10px',
            borderRadius: 8, backgroundColor: 'var(--surface-2)', fontSize: 'var(--fs-small, 12px)', color: 'var(--text-secondary)' }}>
            <span style={{ whiteSpace: 'nowrap' }}>{groupLabel}</span>
            <select value={groupBy} onChange={(e) => onGroupBy(e.target.value)}
              style={{ height: 26, border: 'none', borderRadius: 6, background: 'var(--surface)', color: 'var(--text-primary)',
                fontSize: 'var(--fs-small, 12px)', padding: '0 6px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
              {groupOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        )}

        {onToggleFilter && (
          <button onClick={onToggleFilter}
            style={{
              height: 32, padding: '0 12px', borderRadius: 8, fontSize: 'var(--fs-small, 12px)', fontWeight: 500, cursor: 'pointer', border: 'none',
              backgroundColor: filterActive ? 'var(--info-bg)' : 'var(--surface-2)',
              color: filterActive ? 'var(--info-text)' : 'var(--text-secondary)',
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
