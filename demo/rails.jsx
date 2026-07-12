import React from 'react'
import { createRoot } from 'react-dom/client'
import { Package, Atom, Cube, ArrowsLeftRight, ChartLine, ChartBar, Palette, Stack, TreeStructure, SlidersHorizontal, Flask, Gauge, Terminal, Path, FilmStrip, Play, Stop, Lightning, FolderOpen } from '@phosphor-icons/react'
import { applyTheme, RailNav, Rail, LayoutEditor } from '../src/index.js'

function EditorDemo() {
  const [cfg, setCfg] = React.useState({ tabs: [
    { id: 'home', label: '홈', icon: 'factory', menu: [
      { type: 'item', id: 'a', label: 'A', icon: 'tag' },
      { type: 'item', id: 'b', label: 'B', icon: 'tag' },
    ] },
    { id: 'community', label: '커뮤니티', icon: 'community', codeMenu: [
      { id: 'poll', label: '투표', icon: 'chart' },
      { id: 'questions', label: '질문', icon: 'question-mark' },
      { id: 'completed', label: '완료', icon: 'check' },
      { id: 'plaza', label: '광장', icon: 'beer-stein' },
      { id: 'broadcast', label: '방송', icon: 'megaphone', hidden: true },
    ] },
    { id: 'set', label: '설정', icon: 'settings' },
  ] })
  return <div style={{ width: 560 }}><LayoutEditor value={cfg} onChange={setCfg} /></div>
}

applyTheme('light')

// Each block reproduces one real tab's rail config, all through the SINGLE shared
// RailNav — so if they look identical here, they're identical everywhere.
function Block({ title, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</div>
      <div style={{ position: 'relative', minHeight: 320, minWidth: 74 }}>{children}</div>
    </div>
  )
}

function Demo() {
  return (
    <div style={{ padding: 28, display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'flex-start', fontFamily: 'var(--font-sans)', background: 'var(--surface)', minHeight: '100vh' }}>
      <Block title="LayoutEditor — community codeMenu is 🔒 (reorder/hide only)">
        <EditorDemo />
      </Block>

      <Block title="setup (dup file · changed · needfill · select)">
        <RailNav items={[
          { id: 'file', label: 'file', Icon: Package, dup: true, on: true },
          { type: 'divider' },
          { id: 'physics', label: 'physics', Icon: Atom, on: false, changed: true },
          { id: 'detector', label: 'detector', Icon: Cube, needfill: true },
          { id: 'reaction', label: 'reaction', Icon: ArrowsLeftRight },
          { id: 'xsec', label: 'x-section', Icon: ChartLine },
          { id: 'style', label: 'style', Icon: Palette },
        ]} />
      </Block>

      <Block title="geometry (multi-open toggle · float)">
        <RailNav float style={{ position: 'static' }} items={[
          { id: 'docs', label: '지오메트리', Icon: Stack, on: true },
          { id: 'blocks', label: '블록', Icon: TreeStructure, on: true },
          { id: 'props', label: '속성', Icon: SlidersHorizontal },
          { id: 'materials', label: '재료', Icon: Flask },
        ]} />
      </Block>

      <Block title="simulation (toggle + action buttons)">
        <RailNav items={[
          { id: 'status', label: 'status', Icon: Gauge, on: true },
          { id: 'batch', label: 'batch', Icon: Terminal },
          { id: 'tracks', label: 'tracks', Icon: Path },
          { id: 'anim', label: 'animation', Icon: FilmStrip },
          { type: 'divider' },
          { id: 'start', label: 'start', Icon: Play, tone: 'start', weight: 'fill' },
          { id: 'run1', label: 'run 1', Icon: Lightning, tone: 'run', weight: 'fill' },
          { id: 'run10', label: 'run 10', Icon: Lightning, tone: 'run', weight: 'fill', disabled: true },
        ]} />
      </Block>

      <Block title="files (2 dup toggles)">
        <RailNav items={[
          { id: 'files', label: '파일', Icon: FolderOpen, dup: true, on: true },
          { id: 'root', label: 'root', Icon: ChartBar, dup: true, disabled: true },
        ]} />
      </Block>

      <Block title="SCAFFOLD: <Rail> coupled, panels EMPTY (what a new service shows)">
        <div style={{ height: 300, width: 340, border: '1px dashed var(--border-default)', borderRadius: 8 }}>
          <Rail items={[
            { id: 'detector', label: 'detector', icon: 'atom' },
            { id: 'physics', label: 'physics', icon: 'atom' },
            { type: 'divider' },
            { id: 'style', label: 'style', icon: 'palette' },
          ]} panels={{}} />
        </div>
      </Block>

      <Block title="SCAFFOLD: <Rail> coupled, panels FILLED">
        <div style={{ height: 300, width: 340, border: '1px dashed var(--border-default)', borderRadius: 8 }}>
          <Rail items={[
            { id: 'detector', label: 'detector', icon: 'atom' },
            { id: 'physics', label: 'physics', icon: 'atom' },
            { type: 'divider' },
            { id: 'style', label: 'style', icon: 'palette' },
          ]} panels={{ detector: <div style={{ padding: 16 }}>detector panel</div>, physics: <div style={{ padding: 16 }}>physics panel</div>, style: <div style={{ padding: 16 }}>style panel</div> }} />
        </div>
      </Block>

      <Block title="community (badges · short labels)">
        <RailNav items={[
          { id: 'poll', label: '투표', icon: 'chart', badge: 2, on: true },
          { id: 'q', label: '질문', icon: 'question-mark' },
          { id: 'done', label: '완료', icon: 'check' },
          { id: 'files', label: '첨부', icon: 'attach' },
          { id: 'manage', label: '관리', icon: 'gear' },
          { id: 'plaza', label: '광장', icon: 'beer-stein' },
          { id: 'bc', label: '방송', icon: 'megaphone', badge: 'ON' },
        ]} />
      </Block>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<Demo />)
