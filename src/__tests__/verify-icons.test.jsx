import { describe, it, expect } from 'vitest'
import { ICONS, PICKER_ICONS, searchIcons } from '../icons.jsx'

const ADDED = `baby acorn android-logo brackets-angle bug cactus car castle-turret cat chart-scatter code
discord-logo dog finn-the-human flying-saucer github-logo guitar hand-palm hands-clapping linux-logo
mask-happy moon music-note nuclear-plant paw-print pencil-line person-arms-spread radioactive reddit-logo
robot rocket shrimp skull smiley-wink smiley spiral star yarn binary number-zero number-one number-two
number-three number-four eye bomb bowl-food game-controller arrow-fat-right play intersect-square
lego-smiley`.split(/\s+/)
const GONE = ['microscope', 'anchor', 'basketball', 'football', 'soccer-ball', 'tennis-ball', 'barbell']

describe('icon set', () => {
  it('registers + offers every requested icon', () => {
    const missing = ADDED.filter((n) => !ICONS[n])
    const unpickable = ADDED.filter((n) => !PICKER_ICONS.includes(n))
    expect({ missing, unpickable }).toEqual({ missing: [], unpickable: [] })
  })
  it('drops the removed icons everywhere', () => {
    expect(GONE.filter((n) => ICONS[n] || PICKER_ICONS.includes(n))).toEqual([])
  })
  it('keeps horse/timer (sports is only a secondary tag)', () => {
    expect(PICKER_ICONS).toEqual(expect.arrayContaining(['horse', 'timer']))
  })
  it('searches by phosphor tags, not just the name', () => {
    expect(searchIcons('nut')).toContain('acorn')
    expect(searchIcons('infant')).toContain('baby')
    expect(searchIcons('ufo')).toContain('flying-saucer')
    expect(searchIcons('')).toEqual(PICKER_ICONS)
  })
})
