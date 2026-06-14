/**
 * Command registry store (framework-agnostic core).
 *
 * A single mutable store that components register commands and shortcuts into.
 * The CommandBar, ShortcutsModal, and global hotkey handler all read from it,
 * so a feature declares an action ONCE and every surface picks it up.
 *
 * A "command" is runnable from the command line and (optionally) bound to a key:
 *   { id, title, hint, keywords, category, hotkey, requiresAuth, lead, run(arg) }
 * A "shortcut" is a bare key→fn binding with no command-line entry.
 *
 * Uses a subscribe/snapshot model compatible with React's useSyncExternalStore.
 */
export function createCommandStore() {
  const commands = new Map()   // id -> command
  const shortcuts = new Map()  // token -> { combo, fn, label }
  const subs = new Set()
  let snapshot = { commands: [], shortcuts: [] }

  function rebuild() {
    snapshot = {
      commands: [...commands.values()],
      shortcuts: [...shortcuts.values()],
    }
    subs.forEach((f) => f())
  }

  return {
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn) },
    getSnapshot() { return snapshot },

    addCommand(cmd) {
      if (!cmd || !cmd.id) return () => {}
      commands.set(cmd.id, normalizeCommand(cmd))
      rebuild()
      return () => { commands.delete(cmd.id); rebuild() }
    },
    addCommands(list) {
      const unsubs = (list || []).map((c) => this.addCommand(c))
      return () => unsubs.forEach((u) => u())
    },
    addShortcut(combo, fn, label) {
      const token = String(combo)
      shortcuts.set(token, { combo: token, fn, label: label || token })
      rebuild()
      return () => { shortcuts.delete(token); rebuild() }
    },

    getCommands() { return snapshot.commands },
    getShortcuts() { return snapshot.shortcuts },
    run(id, arg) {
      const c = commands.get(id)
      if (!c) return false
      c.run?.(arg)
      return true
    },
  }
}

export function normalizeCommand(c) {
  return {
    id: c.id,
    title: c.title ?? c.id,
    hint: c.hint ?? '',
    keywords: c.keywords ?? '',
    category: c.category ?? 'general',
    hotkey: c.hotkey ?? null,         // e.g. 'g l', 'mod+k'
    lead: c.lead ?? null,             // lead-char find mode this command serves: _ * > @ & #
    requiresAuth: !!c.requiresAuth,
    argHint: c.argHint ?? '',
    args: c.args ?? null,             // fixed option list → shown as a pick-list
    aliases: c.aliases ?? null,       // alternate names matched in the bar (e.g. login→in)
    freeArg: !!c.freeArg,             // accepts one free-text arg after "/cmd "
    mode: c.mode ?? null,             // 'password' → secure masked follow-up input
    securePrompt: c.securePrompt ?? null, // label shown in secure mode (string|fn(arg))
    run: c.run ?? (() => {}),
  }
}
