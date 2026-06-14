/**
 * barController — lets any component drive the single collapsible CommandBar
 * (which lives in the app shell) as a free-text input bar, so the app never
 * needs a second fixed bottom bar.
 *
 *   import { openBarInput, closeBarInput } from 'lilak-ui'
 *   openBarInput({ label: '댓글', placeholder: '댓글…', onSubmit: (text) => post(text) })
 *
 * The shell subscribes once and feeds the request into <CommandBar input=… />.
 * Also carries lightweight "open in a lead mode" requests (e.g. `_` goto) so a
 * key like `g` can pop the collapsible bar open in a find mode.
 */
let inputListener = null
let leadListener = null
let pendingInput
let pendingLead

/** Open the command bar as a labelled text input. `req` may be null to close. */
export function openBarInput(req) {
  pendingInput = req
  if (inputListener) inputListener(req)
}
export function closeBarInput() { openBarInput(null) }

/** Pop the collapsible bar open at a given lead char (command `/` or a find mode). */
export function openBarLead(lead) {
  pendingLead = lead
  if (leadListener) leadListener(lead)
}

export function subscribeBarInput(fn) {
  inputListener = fn
  if (pendingInput !== undefined) { fn(pendingInput); pendingInput = undefined }
  return () => { if (inputListener === fn) inputListener = null }
}
export function subscribeBarLead(fn) {
  leadListener = fn
  if (pendingLead !== undefined) { fn(pendingLead); pendingLead = undefined }
  return () => { if (leadListener === fn) leadListener = null }
}

// ── Slot mode ───────────────────────────────────────────────────────────────
// For rich, always-on bars (community chat): the shell renders the ONE bottom
// bar as an empty always-expanded container, and the owning page portals its own
// composer into it — so there is still only one bottom bar, fully featured.
let slotActive = false
let slotEl = null
let slotActiveListener = null
const slotElSubs = new Set()

export function activateBarSlot(on) { slotActive = on; slotActiveListener?.(on) }
export function subscribeBarSlotActive(fn) {
  slotActiveListener = fn; fn(slotActive)
  return () => { if (slotActiveListener === fn) slotActiveListener = null }
}
/** Called by the CommandBar (ref) to publish the slot DOM node to portal into. */
export function setBarSlotEl(el) { slotEl = el; slotElSubs.forEach((f) => f(el)) }
export function subscribeBarSlotEl(fn) { slotElSubs.add(fn); fn(slotEl); return () => slotElSubs.delete(fn) }
