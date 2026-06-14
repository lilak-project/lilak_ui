/**
 * ShortcutsModal — lists every keyboard shortcut, read live from the command
 * registry (commands that declare a `hotkey` + bare `useShortcut` bindings),
 * grouped by command category. Because it reads the registry, any feature that
 * registers a hotkey shows up here automatically.
 *
 *   <ShortcutsModal open={open} onClose={close} title={t('shortcuts')}
 *     labelFor={(cmd) => t(cmd.id)} extra={[{combo:'[', label:'prev tab'}]} />
 */
import Modal from './Modal.jsx'
import { prettyKey } from '../hooks/useHotkeys.js'
import { useCommandRegistry } from '../command/CommandRegistry.jsx'

function Key({ combo }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-tiny, 11px)', padding: '2px 7px', borderRadius: 6,
      backgroundColor: 'var(--surface-3)', color: 'var(--text-primary)',
      borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border-default)', whiteSpace: 'nowrap',
    }}>{prettyKey(combo)}</span>
  )
}

export default function ShortcutsModal({ open, onClose, title = 'Keyboard shortcuts', labelFor, extra = [] }) {
  const reg = useCommandRegistry()
  if (!open) return null
  const commands = reg?.commands || []
  const shortcuts = reg?.shortcuts || []

  // commands with a hotkey, grouped by category
  const groups = {}
  for (const c of commands) {
    if (!c.hotkey) continue
    ;(groups[c.category] ||= []).push({ combo: c.hotkey, label: labelFor ? labelFor(c) : c.title })
  }
  const bare = [
    ...shortcuts.map((s) => ({ combo: s.combo, label: s.label })),
    ...extra,
  ]
  if (bare.length) groups['navigation'] = [...(groups['navigation'] || []), ...bare]

  const cats = Object.keys(groups)

  return (
    <Modal onClose={onClose} title={title} width={560}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 }}>
        {cats.map((cat) => (
          <div key={cat}>
            <div style={{ fontSize: 'var(--fs-micro, 10px)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-muted)', marginBottom: 6 }}>{cat}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {groups[cat].map((b, i) => (
                <div key={b.combo + i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Key combo={b.combo} />
                  <span style={{ fontSize: 'var(--fs-small, 12px)', color: 'var(--text-secondary)' }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
