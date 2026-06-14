import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  applyTheme, getTheme, setTheme, applyLangFont, THEMES,
  LangProvider, useLang, useHotkeys, prettyKey, useBreakpoint,
  defineCommands, runCommand,
  IdentityProvider, useIdentity,
  Button, Input, Badge, Card, DataTable, Modal, TopBar, CommandBar, LogFeed, LogComposer, TopPanel, ColorSettings, ColorPicker, CrudTable,
} from '../src/index.js'

// Demonstrates ColorPicker's component mode: set background / line / text
// separately for a tag-like component (#3).
function TagColorDemo() {
  const [c, setC] = useState({ background: '#0d9488', border: '#0f766e', text: '#ffffff' })
  return (
    <Card title="Tag / component colors  (background · line · text)">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 4 }}>
        <ColorPicker parts={c} onPartsChange={setC} size={26}
          labels={{ background: 'Background', border: 'Line', text: 'Text' }} />
        <span style={{ padding: '3px 12px', borderRadius: 999, fontSize: 13,
          backgroundColor: c.background, color: c.text, border: `1.5px solid ${c.border}` }}>#sample-tag</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
          {c.background} / {c.border} / {c.text}
        </span>
      </div>
    </Card>
  )
}

// Demonstrates CrudTable: add / edit / delete over in-memory rows (#crud).
function CrudTableDemo() {
  const [rows, setRows] = useState([
    { id: 1, name: 'DAQ System', source_name: 'daq_system', role: 'manager', active: true },
    { id: 2, name: 'Slow Monitor', source_name: 'slow_mon', role: 'user', active: false },
  ])
  const nextId = () => (rows.reduce((m, r) => Math.max(m, r.id), 0) + 1)
  return (
    <Card title="CrudTable — add / edit / delete">
     <div style={{ overflowX: 'auto' }}>
      <CrudTable
        rows={rows}
        rowKey={(r) => r.id}
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'source_name', header: 'Source', mono: true },
          { key: 'role', header: 'Role' },
          { key: 'active', header: 'Active', render: (r) => (r.active ? 'on' : 'off') },
        ]}
        formFields={[
          { key: 'name', label: 'Name', requiredOnCreate: true, disabledOnEdit: true, placeholder: 'e.g. DAQ System' },
          { key: 'source_name', label: 'Source', placeholder: 'e.g. daq_system' },
          { key: 'role', label: 'Role', type: 'select', options: ['user', 'manager'] },
          { key: 'password', label: 'Password', type: 'password', requiredOnCreate: true, placeholder: '••••••' },
          { key: 'active', label: 'Active', type: 'checkbox', checkboxLabel: 'enabled' },
        ]}
        onCreate={(v) => setRows((rs) => [...rs, { id: nextId(), ...v }])}
        onUpdate={(row, v) => setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, ...v } : r)))}
        onDelete={(row) => setRows((rs) => rs.filter((r) => r.id !== row.id))}
        labels={{ add: 'Add row', confirmDelete: (r) => `Delete "${r.name}"?`, newTitle: 'New row', editTitle: 'Edit row' }}
      />
     </div>
    </Card>
  )
}

function AlarmIcon() {
  // bell — notifications / alarm
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

const DICTS = {
  en: {
    brand: 'LILAK',
    tab_run: 'Run', tab_log: 'Log', tab_root: 'ROOT', tab_settings: 'Settings',
    cs_presets: 'Presets', cs_edit: 'Edit colors', cs_save: 'Save as preset', cs_reset: 'Reset', cs_nameph: 'My palette',
    status_running: 'running',
    col_param: 'Parameter', col_value: 'Value', col_comment: 'Comment',
    btn_save: 'Save', btn_run: 'Run',
    log_title: 'Title', log_tags: 'tags (comma-separated)', log_body: 'Body (markdown)…', log_add: 'Add', log_empty: 'No entries',
    log_format: 'Format', log_standard: 'Standard', log_write: 'Write', log_preview: 'Preview', log_attach: 'Attachments', log_drop: 'drop files or click',
    log_help: '↑↓ / j k  navigate · space  expand · enter  add',
    root_hint: 'ROOT viewer would render here (JSROOT canvas).',
    sys_title: 'System', sys_status: 'Status', sys_recent: 'Recent system log',
    sys_daq: 'DAQ', sys_disk: 'Disk', sys_lastrun: 'Last run', sys_online: 'online',
    sys_name: 'Your name', sys_name_hint: 'Recorded as the author of your log entries.',
    cmd_placeholder: 'Type a command…   run · open · theme · goto',
    cmd_hint: '↵ run · esc close', settings: 'Settings', theme: 'Theme', language: 'Language',
    shortcuts: 'Shortcuts', sc_title: 'Keyboard shortcuts',
    sc_cmd: 'Open command bar', sc_settings: 'Open system panel', sc_tabprev: 'Previous tab', sc_tabnext: 'Next tab',
    sc_run: 'Go to Run', sc_log: 'Go to Log', sc_root: 'Go to ROOT', sc_lognav: 'Log: navigate / expand',
    sc_help: 'This help', sc_close: 'Close / cancel', ran: (c) => `▸ ran: ${c}`,
  },
  ko: {
    brand: '라일락',
    tab_run: '실행', tab_log: '로그', tab_root: 'ROOT', tab_settings: '설정',
    cs_presets: '프리셋', cs_edit: '색상 편집', cs_save: '프리셋으로 저장', cs_reset: '되돌리기', cs_nameph: '내 팔레트',
    status_running: '실행 중',
    col_param: '파라미터', col_value: '값', col_comment: '주석',
    btn_save: '저장', btn_run: '실행',
    log_title: '제목', log_tags: '태그 (쉼표로 구분)', log_body: '내용 (마크다운)…', log_add: '등록', log_empty: '로그가 없습니다',
    log_format: '포맷', log_standard: '표준', log_write: '작성', log_preview: '미리보기', log_attach: '첨부', log_drop: '파일을 끌어놓거나 클릭',
    log_help: '↑↓ / j k  이동 · space  열기/닫기 · enter  등록',
    root_hint: '여기에 ROOT 뷰어(JSROOT 캔버스)가 표시됩니다.',
    sys_title: '시스템', sys_status: '상태', sys_recent: '최근 시스템 로그',
    sys_daq: 'DAQ', sys_disk: '디스크', sys_lastrun: '마지막 런', sys_online: '온라인',
    sys_name: '이름', sys_name_hint: '작성한 로그의 작성자로 기록됩니다.',
    cmd_placeholder: '명령 입력…   run · open · theme · goto',
    cmd_hint: '↵ 실행 · esc 닫기', settings: '설정', theme: '테마', language: '언어',
    shortcuts: '단축키', sc_title: '키보드 단축키',
    sc_cmd: '명령 바 열기', sc_settings: '시스템 패널 열기', sc_tabprev: '이전 탭', sc_tabnext: '다음 탭',
    sc_run: '실행 탭으로', sc_log: '로그 탭으로', sc_root: 'ROOT 탭으로', sc_lognav: '로그: 이동 / 열기',
    sc_help: '이 도움말', sc_close: '닫기 / 취소', ran: (c) => `▸ 실행됨: ${c}`,
  },
}

// example formats (elog shape): Standard (null) + one with a number_entry field
const FORMATS = [
  {
    id: 'beam-tuning', name: 'Beam tuning', is_default: true,
    fields: [
      { key: 'title', label: 'Title', field_type: 'builtin', builtin_id: 'title', order: 0 },
      { key: 'run', label: 'Run', field_type: 'builtin', builtin_id: 'run', order: 1 },
      { key: 'current', label: 'Beam current (nA)', field_type: 'number_entry', number_variant: 'multiple', order: 2 },
      { key: 'tags', label: 'Tags', field_type: 'builtin', builtin_id: 'tags', order: 3 },
      { key: 'body', label: 'Body', field_type: 'builtin', builtin_id: 'body', order: 4 },
    ],
  },
]

// elog-shaped seed entries
const SEED_LOGS = [
  { id: 1, log_index: 41, title: 'Run started', run_number: '253', run_type: 'S', tags: [{ name: 'daq' }], body: 'InputFile = data/run_0253.dat\nEntries = 10089', level: 'info', author_name: 'jungwoo', created_at: '2026-06-11T09:12:00', source: 'human' },
  { id: 2, log_index: 42, title: 'Pedestal drift on AsAd 2', run_number: '253', run_type: 'R', tags: [{ name: 'hardware' }], body: 'Channel 33–40 baseline shifted ~12 ADC.', level: 'warning', author_name: 'jungwoo', created_at: '2026-06-11T09:40:00', source: 'human' },
  { id: 3, log_index: 43, title: 'Pair matching done', run_number: '253', run_type: 'E', tags: [{ name: 'analysis' }], body: '4520 tracks reconstructed.', level: 'info', author_name: 'daq', created_at: '2026-06-11T10:05:00', source: 'monitor' },
]

const PARAMS = [
  { group: 'LKRun', name: 'Name', value: 'stark', comment: '' },
  { group: 'LKRun', name: 'RunID', value: '253', comment: '' },
  { group: 'LKRun', name: 'InputFile', value: 'data/run_0253.dat', comment: '' },
  { group: 'lilak', name: 'run', value: '0', comment: 'all events' },
  { group: 'lilak', name: 'auto_exit', value: '1', comment: '' },
]

const TAB_IDS = ['run', 'log', 'root', 'settings']

function Shell() {
  const { t, lang, setLang, langs } = useLang()
  const { name: userName, setName } = useIdentity()
  const { isPhone } = useBreakpoint()   // glue-level responsive switch
  const [theme, setThemeState] = useState(getTheme())
  const [tab, setTab] = useState(new URLSearchParams(location.search).get('tab') || 'run')
  const [sel, setSel] = useState(1)
  const [barOpen, setBarOpen] = useState(false)
  const [sysOpen, setSysOpen] = useState(false)
  const [log, setLog] = useState([])
  const [entries, setEntries] = useState(SEED_LOGS)
  const [logFormat, setLogFormat] = useState(null)
  const [showSC, setShowSC] = useState(false)

  useEffect(() => { applyTheme() }, [])
  useEffect(() => { applyLangFont(lang) }, [lang])

  const pushLog = (v) => setLog((l) => [t('ran', v), ...l].slice(0, 6))
  const gotoTab = (id) => setTab(id)
  const applyThemeId = (id) => { setTheme(id); setThemeState(id) }

  // ── single source of truth: every action is a command ──────────────────
  const commands = useMemo(() => defineCommands([
    { id: 'run', title: t('btn_run'), hint: 'execute current config', keywords: 'start exec 실행', run: () => pushLog('run') },
    { id: 'save', title: t('btn_save'), keywords: '저장', run: () => pushLog('save') },
    { id: 'open', title: 'open file', hint: 'open a parameter file', keywords: '열기', run: () => pushLog('open') },
    { id: 'goto run', title: t('sc_run'), run: () => { gotoTab('run'); pushLog('goto run') } },
    { id: 'goto log', title: t('sc_log'), run: () => { gotoTab('log'); pushLog('goto log') } },
    { id: 'goto root', title: t('sc_root'), run: () => { gotoTab('root'); pushLog('goto root') } },
    { id: 'goto settings', title: t('tab_settings'), run: () => { gotoTab('settings'); pushLog('goto settings') } },
    { id: 'theme bright', title: 'Bright theme', run: () => { applyThemeId('bright'); pushLog('theme bright') } },
    { id: 'theme dark', title: 'Dark theme', run: () => { applyThemeId('dark'); pushLog('theme dark') } },
    { id: 'theme lowcontrast', title: 'Low-contrast theme', run: () => { applyThemeId('lowcontrast'); pushLog('theme lowcontrast') } },
    { id: 'lang en', title: 'English', run: () => { setLang('en'); pushLog('lang en') } },
    { id: 'lang ko', title: '한국어', run: () => { setLang('ko'); pushLog('lang ko') } },
    { id: 'shortcuts', title: t('shortcuts'), keywords: 'help keys', run: () => setShowSC(true) },
  ]), [t, lang])

  // ── keyboard navigation ───────────────────────────────────────────────
  useHotkeys({
    '/': () => setBarOpen(true),
    '\\': () => setSysOpen((o) => !o),
    '?': () => setShowSC(true),
    '[': () => setTab((cur) => TAB_IDS[Math.max(0, TAB_IDS.indexOf(cur) - 1)]),
    ']': () => setTab((cur) => TAB_IDS[Math.min(TAB_IDS.length - 1, TAB_IDS.indexOf(cur) + 1)]),
    'g r': () => setTab('run'), 'g l': () => setTab('log'), 'g o': () => setTab('root'), 'g s': () => setTab('settings'),
    'Escape': () => setShowSC(false),
  })

  // icons let TopBar collapse tabs to icon-only when the bar gets narrow (phone)
  const TAB_ICONS = { run: 'run', log: 'logs', root: 'graph', settings: 'settings' }
  const TABS = TAB_IDS.map((id) => ({ id, label: t(`tab_${id}`), icon: TAB_ICONS[id] }))
  const columns = [
    { key: 'name', header: t('col_param'), width: '40%', mono: true, muted: true, render: (r) => `${r.group}/${r.name}` },
    { key: 'value', header: t('col_value'), mono: true, render: (r) => <Input mono value={r.value} onChange={() => {}} /> },
    { key: 'comment', header: t('col_comment'), mono: true, muted: true, render: (r) => r.comment || '—' },
  ]

  // elog-style name + icon button → opens the system drop-down panel
  const sysButton = (
    <button
      onClick={() => setSysOpen((o) => !o)}
      title={`${t('sys_title')}  ( \\ )`}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        background: sysOpen ? 'var(--nav-accent)' : 'transparent',
        border: '1px solid var(--nav-border)', borderRadius: 8,
        padding: isPhone ? '4px 8px' : '2px 10px', cursor: 'pointer',
        color: 'var(--nav-text)', fontSize: 15.5, fontFamily: 'var(--font-mono)',
      }}
    >
      <span style={{ position: 'relative', display: 'inline-flex', color: 'var(--nav-text)' }}>
        <AlarmIcon />
      </span>
      {/* drop the name on phones so the bar fits — the bell still opens the panel */}
      {!isPhone && <span style={{ color: 'var(--nav-text)' }}>{userName}</span>}
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80, fontFamily: 'var(--font-sans)', overflowX: 'hidden' }}>
      <TopBar
        brand={t('brand')}
        tabs={TABS}
        active={tab}
        onTab={setTab}
        right={sysButton}
      />

      {/* system / info panel that drops down from the top bar */}
      <TopPanel open={sysOpen} onClose={() => setSysOpen(false)} topOffset={46} height="50vh">
        <SystemPanelContent
          t={t} theme={theme} lang={lang} langs={langs}
          onTheme={applyThemeId} onLang={setLang} entries={entries}
          userName={userName} onName={setName} isPhone={isPhone}
        />
      </TopPanel>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: isPhone ? '12px 10px' : '16px', display: 'flex', flexDirection: 'column', gap: isPhone ? 12 : 16 }}>
        {/* ── Run tab: parameter table ── */}
        {tab === 'run' && (
          <Card title="stark/config_conv.mac" pad={false}
                actions={<>
                  <Button variant="secondary" onClick={() => runCommand(commands, 'save')}>{t('btn_save')}</Button>
                  <Button onClick={() => runCommand(commands, 'run')}>{t('btn_run')} ▸</Button>
                </>}>
            {/* wide tables get their own horizontal scroll so they never widen the page */}
            <div style={{ overflowX: 'auto' }}>
              <DataTable columns={columns} rows={PARAMS} zebra selectedKey={sel} rowKey={(_r, i) => i} onRowClick={(_r, i) => setSel(i)} />
            </div>
          </Card>
        )}

        {/* ── Log tab: elog-style feed (LogFeed) with keyboard nav + composer ── */}
        {tab === 'log' && (
          <>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('log_help')}</div>
            {/* Edit-mode LogComposer demo: pre-filled from an existing entry. */}
            <Card title="LogComposer — edit mode (pre-filled, Save / Cancel)">
              <LogComposer
                initial={{ id: 7, title: 'Run started', run_number: 253, run_type: 'S', beam: 'proton', target: 'CD2', tags: [{ name: 'start' }, { name: 'daq' }], body: 'Editing this existing entry…', level: 'info' }}
                editKey={7}
                format={logFormat} formats={FORMATS}
                authorName={userName}
                onSubmit={(e) => setEntries((list) => [e, ...list])}
                onCancel={() => {}}
                labels={{ title: t('log_title'), tags: t('log_tags'), body: t('log_body'), run: 'Run #', beam: 'Beam', target: 'Target', format: t('log_format'), standard: t('log_standard'), write: t('log_write'), preview: t('log_preview'), attachments: t('log_attach'), drop: t('log_drop') }}
              />
            </Card>
            <LogFeed
              active={tab === 'log'}
              entries={entries}
              formats={FORMATS}
              format={logFormat}
              onFormatChange={setLogFormat}
              authorName={userName}
              onCreate={(e) => setEntries((list) => [e, ...list])}
              viewMode="normal"
              labels={{ empty: t('log_empty') }}
              composerLabels={{ title: t('log_title'), tags: t('log_tags'), body: t('log_body'), add: t('log_add'), run: 'Run #', beam: 'Beam', target: 'Target', format: t('log_format'), standard: t('log_standard'), write: t('log_write'), preview: t('log_preview'), attachments: t('log_attach'), drop: t('log_drop') }}
            />
          </>
        )}

        {/* ── ROOT tab: placeholder ── */}
        {tab === 'root' && (
          <Card>
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{t('root_hint')}</div>
          </Card>
        )}

        {/* ── Settings tab: color preset management ── */}
        {tab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <CrudTableDemo />
            <TagColorDemo />
            <ColorSettings
              onChange={() => setThemeState(getTheme())}
              labels={{ presets: t('cs_presets'), edit: t('cs_edit'), save: t('cs_save'), reset: t('cs_reset'), namePH: t('cs_nameph') }}
            />
          </div>
        )}

        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {prettyKey('/')} command · {prettyKey('\\')} settings · {prettyKey('[')} {prettyKey(']')} tabs · {prettyKey('?')} help
        </div>

        {log.length > 0 && (
          <Card title="command log">
            {log.map((l, i) => <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{l}</div>)}
          </Card>
        )}
      </div>

      <CommandBar
        collapsible
        open={barOpen}
        onOpenChange={setBarOpen}
        commands={commands}
        onRun={(cmd, raw) => { if (!cmd && raw) pushLog(raw) }}
        placeholder={t('cmd_placeholder')}
        hint={t('cmd_hint')}
      />

      {showSC && (
        <Modal title={t('sc_title')} onClose={() => setShowSC(false)}
               footer={<Button onClick={() => setShowSC(false)}>{t('sc_close')}</Button>}>
          <DataTable
            density="comfortable"
            columns={[
              { key: 'k', header: 'Key', width: '34%', mono: true, render: (r) => prettyKey(r.k) },
              { key: 'd', header: 'Action', muted: true },
            ]}
            rows={[
              { k: '/', d: t('sc_cmd') },
              { k: '\\', d: t('sc_settings') },
              { k: '[', d: t('sc_tabprev') }, { k: ']', d: t('sc_tabnext') },
              { k: 'g r', d: t('sc_run') }, { k: 'g l', d: t('sc_log') }, { k: 'g o', d: t('sc_root') },
              { k: 'j', d: t('sc_lognav') }, { k: 'space', d: t('sc_lognav') },
              { k: '?', d: t('sc_help') }, { k: 'Escape', d: t('sc_close') },
            ]}
            rowKey={(r) => r.k}
          />
        </Modal>
      )}
    </div>
  )
}

// ── content of the system drop-down panel: left 2/3 logs · right 1/3 settings ──
function SystemPanelContent({ t, theme, lang, langs, onTheme, onLang, entries, userName, onName, isPhone }) {
  const sectionTitle = { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--nav-text-muted)', marginBottom: 8 }
  const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid var(--nav-border)', borderRadius: 10, padding: '12px 14px' }
  const statRow = { display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0', color: 'var(--nav-text)' }
  const muted = { color: 'var(--nav-text-muted)' }
  const chip = (active) => ({
    border: '1px solid var(--nav-border)', borderRadius: 7, padding: '4px 12px', fontSize: 12.5, cursor: 'pointer',
    background: active ? 'var(--nav-accent)' : 'transparent', color: 'var(--nav-text)',
  })

  return (
    <div style={{ height: '100%', display: 'grid', gridTemplateColumns: isPhone ? '1fr' : '2fr 1fr', gap: 16, overflowY: isPhone ? 'auto' : undefined }}>
      {/* LEFT 2/3 — system logs */}
      <div style={{ ...card, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={sectionTitle}>{t('sys_recent')}</div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 10, fontSize: 12.5 }}>
          <span style={muted}>{t('sys_daq')}: <span style={{ color: 'var(--success-text)' }}>● {t('sys_online')}</span></span>
          <span style={muted}>{t('sys_disk')}: <span style={{ color: 'var(--nav-text)' }}>64%</span></span>
          <span style={muted}>{t('sys_lastrun')}: <span style={{ color: 'var(--nav-text)', fontFamily: 'var(--font-mono)' }}>run 253</span></span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid var(--nav-border)', paddingTop: 6 }}>
          {entries.map((e) => (
            <div key={e.id} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '4px 0', fontSize: 13 }}>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--nav-text-muted)', fontSize: 11.5 }}>
                {new Date(e.created_at).toLocaleTimeString()}
              </span>
              <span style={{ color: 'var(--nav-text)', flex: 1 }}>{e.title}</span>
              {e.tags?.map((tg) => <span key={tg.name} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--nav-text-muted)' }}>#{tg.name}</span>)}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT 1/3 — settings */}
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={sectionTitle}>{t('sys_name')}</div>
          <input
            defaultValue={userName}
            onKeyDown={(e) => { if (e.key === 'Enter') onName(e.target.value) }}
            onBlur={(e) => onName(e.target.value)}
            style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--nav-border)', borderRadius: 7, padding: '5px 8px', fontSize: 13, color: 'var(--nav-text)', outline: 'none' }}
          />
          <div style={{ ...muted, fontSize: 11, marginTop: 4 }}>{t('sys_name_hint')}</div>
        </div>
        <div>
          <div style={sectionTitle}>{t('theme')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {THEMES.map((th) => <button key={th.id} style={chip(th.id === theme)} onClick={() => onTheme(th.id)}>{th.label}</button>)}
          </div>
        </div>
        <div>
          <div style={sectionTitle}>{t('language')}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {langs.map((l) => <button key={l} style={chip(l === lang)} onClick={() => onLang(l)}>{l === 'ko' ? '한국어' : 'English'}</button>)}
          </div>
        </div>
      </div>
    </div>
  )
}

// Reuse one root across HMR re-evaluations (avoids the "createRoot called twice"
// warning when Vite re-runs this entry module).
const _el = document.getElementById('root')
const _root = (window.__demoRoot ||= createRoot(_el))
_root.render(
  <React.StrictMode>
    <LangProvider dicts={DICTS} defaultLang="ko">
      <IdentityProvider defaultName="jungwoo">
        <Shell />
      </IdentityProvider>
    </LangProvider>
  </React.StrictMode>,
)
