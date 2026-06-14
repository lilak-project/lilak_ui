/**
 * Tag chip styling — ported (pure part) from lilak_elog's tagColors.
 * The elog `useTagColors`/`refreshTagColors` (which fetched /tags/colors via
 * its own api) are dropped; pass a `colorMap` into synthChipProps instead.
 *
 * A chip can have a background color, a border color, or both. With no
 * background it falls back to the themed "sky" look (info-bg / info-text).
 */

export const DEFAULT_TAG_COLORS = {
  pending: '#2563eb',
  init:    '#ffe375', start: '#ffe375', running: '#ffe375', end: '#ffe375',
  idle:    '#e5e7eb',
}
export const BORDER_TAGS = {}
export const RUN_STATUS_TAG = { I: 'init', S: 'start', R: 'running', E: 'end', IDLE: 'idle', A: 'idle' }

export function textOn(hex) {
  if (!hex || hex[0] !== '#' || hex.length < 7) return '#ffffff'
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? '#111827' : '#ffffff'
}

/** Returns inline style for a tag chip. With no bg, uses themed sky (info) tokens. */
export function chipProps(name, color, border, text) {
  const bg = color === 'theme' ? null : (color || DEFAULT_TAG_COLORS[name] || null)
  let bd = border === 'none' ? null : (border || BORDER_TAGS[name] || null)
  const style = {}
  if (bg) {
    style.backgroundColor = bg
    style.color = text || textOn(bg)
    if (bg.toLowerCase() === '#ffffff' && !bd) bd = 'var(--border-default)'
  } else {
    style.backgroundColor = 'var(--info-bg)'
    style.color = text || 'var(--info-text)'
  }
  if (bd) style.border = `1.5px solid ${bd}`
  return { style }
}

export function synthChipProps(name, colorMap) {
  const c = colorMap && colorMap[name]
  return chipProps(name, c && c.color, c && c.border, c && c.text)
}
