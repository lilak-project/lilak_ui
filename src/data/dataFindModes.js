/**
 * dataFindModes — command-bar "find modes" for the data-component index.
 *
 * Each data kind has a lead char; typing it in the command bar opens a finder
 * scoped to that kind. A trailing number jumps straight to that entry; free text
 * (and #tags) searches names/tags within the kind.
 *
 *   %  modules & services      _  logs
 *   ^  files & photos          &  infography figures
 *
 * Entries come from the kit tag index (each surface registers its data via
 * `useTaggable`/`useTaggables` with `{ id, label, tags, kind, number, run }`).
 *
 *   const modes = makeDataFindModes(tagIndex, { labels })
 *   <CommandBar findModes={{ ...modes, '#': tagMode }} />
 */
import { getBookmarks } from './bookmarks.js'

// char → which entry kinds it indexes. `*` is special (cross-kind bookmarks).
export const DATA_INDEX = {
  '%': { kinds: ['module', 'service'], label: '모듈·서비스' },
  '_': { kinds: ['log'], label: '로그' },
  '^': { kinds: ['file', 'photo', 'image'], label: '파일·사진' },
  '&': { kinds: ['infograph', 'figure'], label: '인포그래피' },
  '@': { kinds: ['user'], label: '사용자' },
  '~': { kinds: ['post', 'comment'], label: '커뮤니티' },
  '>': { kinds: ['run'], label: '실험 런' },
  '!': { kinds: ['notification'], label: '알림' },
}

// every index lead char, including the `*` bookmark gather
export const INDEX_CHARS = [...Object.keys(DATA_INDEX), '*']

const LEAD_RE = /^[%_^&@~>!*]/

// rank entries of a candidate set against the typed remainder (number or text).
// `char` is the index lead so each result shows its index id (e.g. `_48 title`).
function rank(all, rest, char) {
  const num = /^\d+$/.test(rest) ? rest : null
  const scored = []
  for (const e of all) {
    const n = String(e.number ?? '').toLowerCase()
    const hay = `${n} ${e.label} ${e.keywords || ''} ${(e.tags || []).join(' ')}`.toLowerCase()
    if (!rest) { scored.push([e.number != null ? Number(e.number) : 0, e]); continue }
    if (num && n === num) scored.push([-1000, e])
    else if (num && n.startsWith(num)) scored.push([-500 + Number(n), e])
    else if (hay.includes(rest)) scored.push([hay.indexOf(rest), e])
  }
  scored.sort((a, b) => a[0] - b[0])
  return scored.slice(0, 30).map(([, e]) => ({
    id: e.id,
    // show the index id up front so it's clear what was matched: `_48 Run 17…`
    label: e.number != null ? `${char}${e.number}  ${e.label}` : e.label,
    tags: e.tags, run: e.run,
  }))
}

export function makeDataFindModes(store, { labels = {} } = {}) {
  const snap = () => (store?.getSnapshot ? store.getSnapshot() : (store?.entries || []))
  const modes = {}
  for (const [char, def] of Object.entries(DATA_INDEX)) {
    const name = labels[char] || def.label
    modes[char] = {
      placeholder: `${char}<번호> 로 ${name} 열기 (예: ${char}20) · 이름·#태그 검색도 가능`,
      hint: char,
      help: `${char}<번호>로 그 ${name}을(를) 엽니다. 이름이나 #태그로도 검색하세요.`,
      search: (value) => rank(
        snap().filter((e) => def.kinds.includes(e.kind)),
        String(value).replace(LEAD_RE, '').trim().toLowerCase(), char),
    }
  }
  // `*` — gather every currently-registered entry that has been bookmarked.
  modes['*'] = {
    placeholder: '* 북마크 … 별표(★)한 데이터 컴포넌트 모아보기',
    hint: '*',
    help: '별표(★)한 데이터 컴포넌트를 종류 상관없이 모아 봅니다.',
    search: (value) => {
      const bm = getBookmarks()
      return rank(snap().filter((e) => bm.has(String(e.id))),
        String(value).replace(LEAD_RE, '').trim().toLowerCase(), '*')
    },
  }
  return modes
}
