/**
 * Command registry helpers.
 *
 * The CommandBar is a command line: every action a tab or button performs is
 * also registered as a command, so the bar can run it by name. Define the
 * commands once and wire both the UI controls and the bar to the same list.
 *
 *   const commands = defineCommands([
 *     { id: 'run',  title: 'Run analysis', hint: 'execute the current config',
 *       keywords: 'start exec', run: () => doRun() },
 *     { id: 'goto run', title: 'Go to Run tab', run: () => setTab('run') },
 *     { id: 'theme dark', title: 'Dark theme', run: () => setTheme('dark') },
 *   ])
 *
 *   // a button just runs a command by id:
 *   <Button onClick={() => runCommand(commands, 'run')}>Run</Button>
 *
 *   // the bar gets the whole list and dispatches matches:
 *   <CommandBar commands={commands} />
 */

export function defineCommands(list) {
  return list.map((c) => ({
    id: c.id,
    title: c.title ?? c.id,
    hint: c.hint ?? '',
    keywords: c.keywords ?? '',
    run: c.run ?? (() => {}),
    args: c.args ?? null,        // optional arg hint / choices
  }))
}

/** Fuzzy-ish contains match over id + title + keywords, ranked by where it hits. */
export function matchCommands(commands, query, limit = 8) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return commands.slice(0, limit)
  const scored = []
  for (const c of commands) {
    const id = c.id.toLowerCase()
    const hay = `${id} ${c.title} ${c.keywords}`.toLowerCase()
    if (!hay.includes(q)) continue
    let score = 100
    if (id.startsWith(q)) score = 0
    else if (id.includes(q)) score = 10
    else if (c.title.toLowerCase().includes(q)) score = 20
    scored.push({ c, score })
  }
  scored.sort((a, b) => a.score - b.score || a.c.id.localeCompare(b.c.id))
  return scored.slice(0, limit).map((s) => s.c)
}

/** Find and run a command by exact id. Returns true if found. */
export function runCommand(commands, id, ...args) {
  const cmd = commands.find((c) => c.id === id)
  if (!cmd) return false
  cmd.run(...args)
  return true
}
