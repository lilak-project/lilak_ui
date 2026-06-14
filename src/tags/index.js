/**
 * Tag search index store (framework-agnostic core).
 *
 * Hash-tagging is a first-class, reusable concern: any "searchable" component
 * registers an entry carrying tags, and the CommandBar `#tag` find-mode and the
 * Search page query the same index.
 *
 * Entry shape:
 *   { id, label, tags: string[], kind, hint, keywords, run() }
 *
 * `search(query)` understands `#tag` tokens (AND-combined) mixed with free text.
 */
export function createTagStore() {
  const entries = new Map()  // id -> entry
  const subs = new Set()
  let snapshot = []

  function rebuild() { snapshot = [...entries.values()]; subs.forEach((f) => f()) }

  return {
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn) },
    getSnapshot() { return snapshot },

    add(entry) {
      if (!entry || entry.id == null) return () => {}
      entries.set(entry.id, normalizeEntry(entry))
      rebuild()
      return () => { entries.delete(entry.id); rebuild() }
    },
    addMany(list) {
      const unsubs = (list || []).map((e) => this.add(e))
      return () => unsubs.forEach((u) => u())
    },

    /** Distinct tag → count, for tag suggestion lists. */
    tagCounts() {
      const counts = new Map()
      for (const e of snapshot) for (const tg of e.tags) counts.set(tg, (counts.get(tg) || 0) + 1)
      return counts
    },

    search(query, limit = 30) { return searchEntries(snapshot, query, limit) },
  }
}

export function normalizeEntry(e) {
  return {
    id: e.id,
    label: e.label ?? String(e.id),
    tags: (e.tags || []).map((t) => String(t).replace(/^#/, '').toLowerCase()),
    kind: e.kind ?? 'item',
    number: e.number ?? null,   // per-kind lookup number for command-bar index (%/_/^/&)
    hint: e.hint ?? '',
    keywords: e.keywords ?? '',
    run: e.run ?? null,
  }
}

/** Parse a query into `{ tags: [...], text: '...' }`. `#foo bar #baz` → tags[foo,baz] text 'bar'. */
export function parseQuery(query) {
  const tags = []
  const words = []
  for (const tok of String(query || '').trim().split(/\s+/)) {
    if (!tok) continue
    if (tok.startsWith('#') && tok.length > 1) tags.push(tok.slice(1).toLowerCase())
    else words.push(tok.toLowerCase())
  }
  return { tags, text: words.join(' ') }
}

export function searchEntries(list, query, limit = 30) {
  const { tags, text } = parseQuery(query)
  const scored = []
  for (const e of list) {
    // every requested tag must be present (prefix match allowed)
    const tagOk = tags.every((q) => e.tags.some((tg) => tg === q || tg.startsWith(q)))
    if (!tagOk) continue
    let score = 0
    if (text) {
      const hay = `${e.label} ${e.keywords} ${e.tags.join(' ')}`.toLowerCase()
      if (!hay.includes(text)) continue
      score = e.label.toLowerCase().startsWith(text) ? 0 : e.label.toLowerCase().includes(text) ? 5 : 10
    }
    scored.push({ e, score })
  }
  scored.sort((a, b) => a.score - b.score || String(a.e.label).localeCompare(String(b.e.label)))
  return scored.slice(0, limit).map((s) => s.e)
}
