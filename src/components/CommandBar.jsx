/**
 * CommandBar — the command line at the bottom of the UI.
 *
 * `/` is the command trigger. Other lead chars are "find modes" (passed via
 * `findModes`), e.g. `#` searches the hash-tag index. Opening pre-fills the bar
 * with the lead char (`openWith`); typing after it filters; Enter runs the
 * selection.
 *
 * Commands with a fixed set of OPTIONS declare `args` (e.g. theme → bright/dark/
 * teal). Choosing such a command does NOT auto-fill the first option — it
 * expands the bar to `/<cmd> ` and lists the options so you pick one explicitly.
 *
 * Toggle behaviour (every UI): pressing the SAME lead key again while the bar
 * shows only that char closes the bar — so `/`…`/` and `#`…`#` open then close.
 *
 *   <CommandBar collapsible commands={cmds}
 *     open={open} onOpenChange={setOpen} openWith={lead}
 *     findModes={{ '#': { search:(q)=>tagIndex.search(q), placeholder, help } }} />
 *
 * findMode: `{ search(value) -> items[], placeholder?, help?, hint? }`; each item
 * `{ id, label, hint, tags?, kind?, run() }`. Command `args`: `['a','b']` or
 * `[{ value, label }]`.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { matchCommands } from '../commands.js'
import { setBarSlotEl } from './barController.js'
import Icon from '../icons.jsx'

const OPEN_H = 44
const PILL = 20
const argVal = (a) => (a && typeof a === 'object' ? a.value : a)
const argLabel = (a) => (a && typeof a === 'object' ? (a.label ?? a.value) : a)

export default function CommandBar({
  collapsible = false,
  open: openProp,
  onOpenChange,
  commands = [],
  onRun,
  value: valueProp,
  onChange,
  openWith = '/',
  findModes = {},
  placeholder = 'Type a command…',
  hint,
  inputId,
  maxSuggestions = 8,
  // Free-text input mode — turns the collapsible bar into a labelled text bar so
  // the app never needs a second fixed bottom bar (comments, chat, goto, …).
  // { label?, placeholder?, hint?, contextNode?, multiline?, persistent?,
  //   initialValue?, onSubmit(value), onCancel?(), onValueChange?(v),
  //   onKeyDown?(e, value, setValue) }
  input = null,
  // Slot mode: render the bar as an empty always-expanded container whose DOM
  // node is published via barController, so a page can portal its own composer
  // (rich community chat) into the single bottom bar.
  slot = false,
}) {
  const controlledOpen = openProp != null
  const [openState, setOpenState] = useState(!collapsible)
  const open = controlledOpen ? openProp : openState
  const setOpen = (v) => { controlledOpen ? onOpenChange?.(v) : setOpenState(v) }

  const controlledVal = valueProp != null
  const [valState, setValState] = useState('')
  const value = controlledVal ? valueProp : valState
  const setValue = (v) => { if (controlledVal) onChange?.(v); else setValState(v) }

  const inputRef = useRef(null)
  const [sel, setSel] = useState(0)
  // Secure follow-up mode: a command with `mode:'password'` (e.g. /login <user>)
  // switches the bar to a masked input that captures one secret, then runs the
  // command with `{ username, password }`. Holds `{ cmd, username }` or null.
  const [secure, setSecure] = useState(null)

  // Free-text input mode (comments / chat / goto) — its own value + element.
  const [inputVal, setInputVal] = useState('')
  const textRef = useRef(null)
  const inputKey = input ? (input.key ?? 'on') : null
  useEffect(() => {
    if (!input) return
    setInputVal(input.initialValue || '')
    const id = requestAnimationFrame(() => {
      const el = textRef.current
      if (el) { el.focus(); const n = el.value.length; el.setSelectionRange?.(n, n) }
    })
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputKey])

  const expanded = !collapsible || open
  const lead = value[0]
  const mode = secure ? null : (findModes[lead] || null)

  function close() {
    setValue('')
    setSel(0)
    setSecure(null)
    inputRef.current?.blur()
    if (collapsible) setOpen(false)
  }

  // Unified suggestion items: each carries its own onPick.
  const suggestions = useMemo(() => {
    if (!expanded || secure) return []

    // find mode (e.g. #tag)
    if (mode) {
      return (mode.search(value) || []).slice(0, maxSuggestions).map((it) => ({
        key: String(it.id), kind: 'find', label: it.label, tags: it.tags, kindLabel: it.kind,
        onPick: () => { it.run?.(); onRun?.(it, value); close() },
      }))
    }

    // command arg mode: "/theme da" → list theme's options
    const argMatch = value.match(/^\/(\S+)\s+(.*)$/)
    if (argMatch) {
      const cmd = commands.find((c) => c.id === argMatch[1] && c.args?.length)
      if (cmd) {
        const q = argMatch[2].toLowerCase()
        return cmd.args
          .filter((a) => String(argVal(a)).toLowerCase().includes(q) || String(argLabel(a)).toLowerCase().includes(q))
          .slice(0, maxSuggestions)
          .map((a) => ({
            key: cmd.id + ':' + argVal(a), kind: 'arg', label: String(argVal(a)),
            secondary: argLabel(a) !== argVal(a) ? String(argLabel(a)) : '',
            cmdId: cmd.id, value: String(argVal(a)),
            onPick: () => { cmd.run?.(argVal(a)); onRun?.(cmd, argVal(a)); close() },
          }))
      }
    }

    // plain command match
    return matchCommands(commands, value.replace(/^\//, ''), maxSuggestions).map((c) => {
      const expands = !!(c.args?.length || c.freeArg || c.mode === 'password')
      return {
        key: c.id, kind: 'cmd', label: '/' + c.id,
        secondary: c.title !== c.id ? c.title : c.hint, hasArgs: !!c.args?.length, expands,
        onPick: () => {
          // options OR a free/secure arg → expand to "/cmd " so the user types it
          if (expands) { setValue('/' + c.id + ' ') }
          else { c.run?.(); onRun?.(c, ''); close() }
        },
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commands, value, expanded, mode, secure, maxSuggestions])

  useEffect(() => { setSel(0) }, [value, expanded])

  useEffect(() => {
    if (!expanded) return
    if (!controlledVal && value === '') setValue(openWith)
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus()
      const el = inputRef.current
      if (el) el.setSelectionRange(el.value.length, el.value.length)
    })
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, openWith])

  // command (by id or alias) carrying a given capability flag
  const findCmd = (id, flag) => commands.find(
    (c) => (c.id === id || c.aliases?.includes(id)) && (flag === 'password' ? c.mode === 'password' : c[flag]),
  )

  function runChosen() {
    // submitting the secret inside secure mode
    if (secure) {
      const pw = value
      secure.cmd.run?.({ username: secure.username, password: pw })
      onRun?.(secure.cmd, { username: secure.username, password: pw })
      close()
      return
    }
    // "/login <user>" → enter secure mode; "/<freeArg> <text>" → run with the text
    const m = value.match(/^\/(\S+)\s+(.+)$/)
    if (m) {
      const arg = m[2].trim()
      const secureCmd = findCmd(m[1], 'password')
      if (secureCmd) { setSecure({ cmd: secureCmd, username: arg }); setValue(''); setSel(0); return }
      const freeCmd = findCmd(m[1], 'freeArg')
      if (freeCmd) { freeCmd.run?.(arg); onRun?.(freeCmd, arg); close(); return }
    }
    const chosen = suggestions[sel]
    if (chosen) return chosen.onPick()
    const raw = value.replace(/^[/#%_&*>@^]/, '').trim()
    if (raw) onRun?.(null, raw)
    close()
  }

  function onKeyDown(e) {
    if (!secure && e.key === value && value.length === 1 && (value === '/' || findModes[value])) {
      e.preventDefault(); close(); return
    }
    // a find mode may intercept keys (e.g. `_` log goto: a second `g` → top)
    if (mode?.onKey) { mode.onKey(e, { value, close }); if (e.defaultPrevented) return }
    if (e.key === 'Escape') { e.preventDefault(); close(); return }
    if (e.key === 'Enter') { e.preventDefault(); runChosen(); return }
    if (suggestions.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => (s + 1) % suggestions.length) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => (s - 1 + suggestions.length) % suggestions.length) }
      if (e.key === 'Tab') {
        e.preventDefault()
        const s = suggestions[sel]
        if (!s) return
        if (s.kind === 'cmd') {
          // complete the command name; if it takes args/options, add a space so
          // the option list appears (tab again to complete an option).
          setValue('/' + s.key + (s.expands ? ' ' : ''))
        } else if (s.kind === 'arg') {
          // fill the chosen option into the bar (Enter then applies it).
          setValue('/' + s.cmdId + ' ' + s.value)
        } else {
          s.onPick()
        }
      }
    }
  }

  const securePrompt = secure
    ? (typeof secure.cmd.securePrompt === 'function'
        ? secure.cmd.securePrompt(secure.username)
        : (secure.cmd.securePrompt || `password · ${secure.username}`))
    : null
  const activePlaceholder = securePrompt || mode?.placeholder || placeholder
  const helpText = secure ? securePrompt : mode?.help

  // ── Slot mode: empty always-expanded container; the page portals into it ──
  if (slot) {
    return <div ref={setBarSlotEl} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40, backgroundColor: 'var(--nav-bg)', color: 'var(--nav-text)', fontFamily: 'var(--font-sans)' }} />
  }

  // ── Free-text input mode: the bar IS the text input (full width, expanded) ──
  if (input) {
    const submit = () => { input.onSubmit?.(inputVal); if (input.persistent) setInputVal('') }
    const onKey = (e) => {
      input.onKeyDown?.(e, inputVal, setInputVal)
      if (e.defaultPrevented) return
      if (e.key === 'Escape') { e.preventDefault(); input.onCancel?.() }
      else if (e.key === 'Enter' && (!input.multiline || !e.shiftKey)) { e.preventDefault(); submit() }
    }
    const Field = input.multiline ? 'textarea' : 'input'
    return (
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40, backgroundColor: 'var(--nav-bg)', color: 'var(--nav-text)', fontFamily: 'var(--font-sans)' }}>
        {input.contextNode}
        <form onSubmit={(e) => { e.preventDefault(); submit() }} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: OPEN_H, padding: '0 14px', borderTop: '1px solid var(--nav-border)' }}>
          {input.label && <span style={{ flexShrink: 0, fontSize: 'var(--fs-small, 12px)', color: 'var(--nav-text-muted)', whiteSpace: 'nowrap' }}>{input.label}</span>}
          <Field
            ref={textRef}
            autoFocus
            value={inputVal}
            onChange={(e) => { setInputVal(e.target.value); input.onValueChange?.(e.target.value) }}
            onKeyDown={onKey}
            placeholder={input.placeholder || ''}
            rows={input.multiline ? 1 : undefined}
            spellCheck={false}
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: 'var(--nav-text)', fontSize: 'var(--fs-small, 12px)', fontFamily: 'inherit', lineHeight: 1.4, maxHeight: input.multiline ? 72 : undefined, padding: input.multiline ? '10px 0' : 0 }}
          />
          {input.hint && <span style={{ flexShrink: 0, fontSize: 'var(--fs-tiny, 11px)', color: 'var(--nav-text-muted)' }}>{input.hint}</span>}
        </form>
      </div>
    )
  }

  return (
    <div
      onClick={() => { if (!expanded) setOpen(true) }}
      title={expanded ? undefined : 'Command bar  ( / )'}
      style={{
        position: 'fixed', left: 0, bottom: 0, zIndex: 40,
        width: expanded ? '100%' : PILL,
        height: expanded ? OPEN_H : PILL,
        marginLeft: expanded ? 0 : 16,
        marginBottom: expanded ? 0 : 16,
        backgroundColor: 'var(--nav-bg)',
        borderTop: expanded ? '1px solid var(--nav-border)' : 'none',
        border: expanded ? undefined : '1px solid var(--nav-border)',
        borderRadius: expanded ? 0 : '50%',
        boxShadow: expanded ? 'none' : '0 2px 6px rgba(0,0,0,0.25)',
        cursor: expanded ? 'default' : 'pointer',
        overflow: 'visible',
        fontFamily: 'var(--font-sans)',
        transition: 'width .28s cubic-bezier(.4,0,.2,1), height .24s cubic-bezier(.4,0,.2,1), border-radius .26s, margin .24s',
      }}
    >
      {expanded && (suggestions.length > 0 || helpText) && (
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: '100%',
          maxHeight: 300, overflowY: 'auto',
          backgroundColor: 'var(--nav-bg)', borderTop: '1px solid var(--nav-border)',
        }}>
          {helpText && (
            <div style={{ padding: '6px 16px', fontSize: 'var(--fs-tiny, 11px)', color: 'var(--nav-text-muted)', borderBottom: '1px solid var(--nav-border)' }}>
              {helpText}
            </div>
          )}
          {suggestions.map((s, i) => (
            <div
              key={s.key}
              onMouseDown={(e) => { e.preventDefault(); s.onPick() }}
              onMouseEnter={() => setSel(i)}
              style={{
                display: 'flex', gap: 10, alignItems: 'baseline',
                padding: '6px 16px', cursor: 'pointer',
                backgroundColor: i === sel ? 'var(--nav-accent)' : 'transparent',
              }}
            >
              {s.kind === 'find' ? (
                <>
                  <span style={{ fontSize: 'var(--fs-body, 13px)', color: 'var(--nav-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '46%' }}>{s.label}</span>
                  {s.tags?.length > 0 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-tiny, 11px)', color: 'var(--nav-text-muted)' }}>
                      {s.tags.map((tg) => '#' + tg).join(' ')}
                    </span>
                  )}
                  <span style={{ flex: 1 }} />
                  {s.kindLabel && <span style={{ fontSize: 'var(--fs-micro, 10px)', color: 'var(--nav-text-muted)', flexShrink: 0 }}>{s.kindLabel}</span>}
                </>
              ) : s.kind === 'arg' ? (
                <>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-small, 12px)', color: 'var(--nav-text)' }}>{s.label}</span>
                  {s.secondary && <span style={{ fontSize: 'var(--fs-small, 12px)', color: 'var(--nav-text-muted)' }}>{s.secondary}</span>}
                </>
              ) : (
                <>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-small, 12px)', color: 'var(--nav-text)' }}>{s.label}</span>
                  <span style={{ fontSize: 'var(--fs-small, 12px)', color: 'var(--nav-text-muted)' }}>{s.secondary}</span>
                  {s.hasArgs && <span style={{ marginLeft: 'auto', display: 'inline-flex', color: 'var(--nav-text-muted)' }}><Icon name="caret-right" size={12} /></span>}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, height: '100%', padding: '0 14px',
        opacity: expanded ? 1 : 0,
        transition: 'opacity .16s ease', transitionDelay: expanded ? '.08s' : '0s',
        pointerEvents: expanded ? 'auto' : 'none',
        overflow: 'hidden', whiteSpace: 'nowrap',
      }}>
        {secure && <Icon name="key" size={13} style={{ flexShrink: 0, color: 'var(--nav-text-muted)' }} />}
        <input
          ref={inputRef}
          id={inputId}
          type={secure ? 'password' : 'text'}
          autoComplete={secure ? 'current-password' : 'off'}
          value={value}
          onChange={(e) => {
            const v = e.target.value
            // deleting the lead char (input goes empty) collapses the bar —
            // but in secure mode an empty field just means "type the secret"
            if (collapsible && v === '' && !secure) { close(); return }
            setValue(v)
          }}
          onKeyDown={onKeyDown}
          onBlur={() => { if (collapsible && !secure && value.length <= 1) close() }}
          placeholder={activePlaceholder}
          spellCheck={false}
          style={{
            flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--nav-text)', fontSize: 'var(--fs-body, 13px)', fontFamily: 'var(--font-mono)',
          }}
        />
        {(mode?.hint || hint) && <span style={{ fontSize: 'var(--fs-tiny, 11px)', color: 'var(--nav-text-muted)', flexShrink: 0 }}>{mode?.hint || hint}</span>}
      </div>
    </div>
  )
}
