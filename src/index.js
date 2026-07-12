/**
 * lilak-ui — shared React UI kit (compact, theme-aware) for LILAK projects.
 *
 *   import { applyTheme, setTheme, Button, DataTable } from 'lilak-ui'
 *
 * Consumed from source (Vite alias 'lilak-ui' -> this src/), so the host app
 * transpiles the JSX. No build step in this package.
 */

// theme
export { TOKENS, TOKEN_GROUPS, THEMES } from './theme/tokens.js'
export { applyTheme, buildThemeCSS, getTheme, setTheme, cycleTheme, loadFonts, applyLangFont, registerLangFont, SANS_BY_LANG, FONT_DEFAULTS } from './theme/applyTheme.js'
export { listPresets, getActivePreset, setActivePreset, applyPreset, saveCustomPreset, deleteCustomPreset, setTokenOverride, clearOverrides, BUILTIN_PRESETS } from './theme/presets.js'
export * as uiStyles from './theme/uiStyles.js'
export { hoverify } from './theme/uiStyles.js'

// i18n + hotkeys + commands + identity
export { LangProvider, useLang } from './i18n.jsx'
export { useHotkeys, prettyKey } from './hooks/useHotkeys.js'
export { useMediaQuery, useBreakpoint, BREAKPOINTS } from './hooks/useBreakpoint.js'
export { defineCommands, matchCommands, runCommand } from './commands.js'
export { IdentityProvider, useIdentity } from './identity.jsx'

// command/hotkey connector (registry) + tagging index
export { createCommandStore, normalizeCommand } from './command/registry.js'
export { CommandRegistryProvider, useCommandRegistry, useCommand, useCommands, useShortcut } from './command/CommandRegistry.jsx'
export { createTagStore, parseQuery, searchEntries } from './tags/index.js'
export { TagIndexProvider, useTagIndex, useTaggable, useTaggables } from './tags/TagIndex.jsx'

// data components (the unified collapsible data-entry abstraction)
export { default as DataCard, KIND_INDEX } from './data/DataCard.jsx'
export { default as DataGrid } from './data/DataGrid.jsx'
export { makeDataFindModes, DATA_INDEX, INDEX_CHARS } from './data/dataFindModes.js'
export { getBookmarks, isBookmarked, toggleBookmark, subscribeBookmarks, useBookmarks, setBookmarkScope } from './data/bookmarks.js'

// layout primitives
export { Box, Stack, Row, Grid, Container, Spacer } from './layout/index.jsx'

// CRUD scaffolding (admin tables/forms over DataTable)
export { default as CrudTable } from './crud/CrudTable.jsx'
export { default as CrudForm } from './crud/CrudForm.jsx'

// icons (Phosphor, via one semantic map) + custom-icon factories
export { default as Icon, ICONS, customIcon, strokeIcon, fillIcon, PROJECT_ICONS, PICKER_ICONS, randomProjectIcon } from './icons.jsx'

// log system (ported from lilak_elog)
export * as formatUtils from './log/formatUtils.js'
export * as tagColors from './log/tagColors.js'
export { default as LogEntryCard } from './log/LogEntryCard.jsx'
export { default as LogComposer } from './log/LogComposer.jsx'
export { default as LogFeed } from './log/LogFeed.jsx'
export { default as LogList, GROUP_ACCESSORS } from './log/LogList.jsx'
export { default as LogDetail } from './log/LogDetail.jsx'
export { default as LogToolbar } from './log/LogToolbar.jsx'
export { default as NumberEntryField } from './log/NumberEntryField.jsx'
export { default as Markdown } from './log/Markdown.jsx'
export { default as FormatPicker } from './log/FormatPicker.jsx'
export { default as LoginForm } from './auth/LoginForm.jsx'

// components
export { default as Button } from './components/Button.jsx'
export { default as Input } from './components/Input.jsx'
export { default as Badge } from './components/Badge.jsx'
export { default as Chip, ChipGroup } from './components/Chip.jsx'
export { default as Callout } from './components/Callout.jsx'
export { default as CopyField } from './components/CopyField.jsx'
export { default as Lightbox } from './components/Lightbox.jsx'
export { default as DashboardGrid } from './components/DashboardGrid.jsx'
export { default as TimeRangePicker, rangeBounds } from './components/TimeRangePicker.jsx'
export { default as SideNav } from './components/SideNav.jsx'
export { default as Rail } from './components/Rail.jsx'
export { default as RailNav } from './components/RailNav.jsx'
export { default as LayoutEditor } from './components/LayoutEditor.jsx'
export { default as SubTabs } from './components/SubTabs.jsx'
export { default as Avatar, randomAvatar, avatarFor, AVATAR_ICONS, AVATAR_COLORS, AVATAR_ICON_MAP, MANAGER_COLOR } from './components/Avatar.jsx'
export { default as Card } from './components/Card.jsx'
export { default as CoverPage, CoverCard } from './components/CoverPage.jsx'
export { default as Tabs } from './components/Tabs.jsx'
export { default as Modal } from './components/Modal.jsx'
export { default as CameraCapture } from './components/CameraCapture.jsx'
export { default as DataTable } from './components/DataTable.jsx'
export { default as Menu } from './components/Menu.jsx'
export { default as ColorSettings } from './components/ColorSettings.jsx'
export { default as ColorPicker } from './components/ColorPicker.jsx'
export { default as TopBar } from './components/TopBar.jsx'
export { default as CommandBar } from './components/CommandBar.jsx'
export { openBarInput, closeBarInput, openBarLead, subscribeBarInput, subscribeBarLead, activateBarSlot, subscribeBarSlotActive, subscribeBarSlotEl } from './components/barController.js'
export { default as TopPanel } from './components/TopPanel.jsx'
export { default as Drawer } from './components/Drawer.jsx'
export { default as NotificationBell } from './components/NotificationBell.jsx'
export { default as Pagination } from './components/Pagination.jsx'
export { default as ShortcutsModal } from './components/ShortcutsModal.jsx'
export { default as AppShell } from './components/AppShell.jsx'
export { default as Community } from './community/Community.jsx'
