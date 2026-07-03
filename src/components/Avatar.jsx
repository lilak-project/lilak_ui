/**
 * Avatar — a profile mark: a Phosphor icon inside a colored circle. Replaces
 * elog's hand-drawn HexAvatar with the kit's icon system, so a profile is just
 * `{ icon, color }` (an icon name + a hex color).
 *
 *   <Avatar icon="flask" color="#10b981" size={48} />
 *   <Avatar seed="jungwoo" />                       // stable random for a user
 *
 * Helpers:
 *   randomAvatar()      → { profile_shape, profile_color }   (fully random)
 *   avatarFor(seed)     → { profile_shape, profile_color }   (stable per seed)
 *   AVATAR_ICONS        → all icon keys; AVATAR_COLORS → all colors
 *
 * `profile_shape`/`profile_color` keys mirror the elog user model so it drops in
 * where HexAvatar was. Unknown/legacy icon keys fall back to a stable per-seed
 * pick, so pre-existing users still get a consistent avatar.
 */
import {
  Flask, Atom, Planet, Rocket, Star, Heart, Moon, Sun, Lightning, Fire,
  Leaf, Tree, Flower, FlowerLotus, Butterfly, Bird, Cat, Dog, Fish, Ghost,
  Robot, Brain, Eye, Crown, Diamond, Gift, Cube, Compass, Snowflake,
  Cloud, Drop, Mountains, Cactus, Bug, PawPrint, MagicWand, Sparkle,
  // extended set
  Baseball, Basketball, Bicycle, Boat, Cake, Coffee, Feather,
  GameController, Hamburger, Hexagon, IceCream, Key, Lightbulb, MusicNotes,
  Pizza, Rainbow, Shield, ShootingStar, Smiley, SoccerBall, Spade, Sword,
  Trophy, Wrench, YinYang, Crosshair, Bone, Alien,
  FinnTheHuman, Aperture, BowlFood, FlyingSaucer, Guitar, HandEye, HandPeace,
  PuzzlePiece, Shrimp, UserCircle, Yarn, Confetti, Headphones, Martini, Popcorn,
} from '@phosphor-icons/react'
// Unify the pool: an avatar glyph is resolved from the SAME icon set the service
// picker uses (kit ICONS / PICKER_ICONS). AVATAR_ICON_MAP below stays only as a
// fallback for legacy profile_shape values not in ICONS.
import { ICONS, PICKER_ICONS } from '../icons.jsx'

/** Curated set of Phosphor icons that read well as small avatars (80). */
export const AVATAR_ICON_MAP = {
  flask: Flask, atom: Atom, planet: Planet, rocket: Rocket, star: Star,
  heart: Heart, moon: Moon, sun: Sun, lightning: Lightning, fire: Fire,
  leaf: Leaf, tree: Tree, flower: Flower, lotus: FlowerLotus, butterfly: Butterfly,
  bird: Bird, cat: Cat, dog: Dog, fish: Fish, ghost: Ghost,
  robot: Robot, brain: Brain, eye: Eye, crown: Crown, diamond: Diamond,
  gift: Gift, cube: Cube, compass: Compass, snowflake: Snowflake,
  cloud: Cloud, drop: Drop, mountains: Mountains, cactus: Cactus, bug: Bug,
  paw: PawPrint, wand: MagicWand, sparkle: Sparkle,
  // extended set
  baseball: Baseball, basketball: Basketball, bicycle: Bicycle,
  boat: Boat, cake: Cake, coffee: Coffee, feather: Feather, gamepad: GameController,
  burger: Hamburger, hexagon: Hexagon, icecream: IceCream, key: Key, bulb: Lightbulb,
  music: MusicNotes, pizza: Pizza, rainbow: Rainbow, shield: Shield, shootingstar: ShootingStar,
  smiley: Smiley, soccer: SoccerBall, spade: Spade, sword: Sword,
  trophy: Trophy, wrench: Wrench, yinyang: YinYang, crosshair: Crosshair, bone: Bone, alien: Alien,
  finn: FinnTheHuman, aperture: Aperture, bowlfood: BowlFood, ufo: FlyingSaucer, guitar: Guitar,
  handeye: HandEye, peace: HandPeace, puzzle: PuzzlePiece, shrimp: Shrimp, usercircle: UserCircle,
  yarn: Yarn, confetti: Confetti, headphones: Headphones, martini: Martini, popcorn: Popcorn,
}

// Pickable pool = the shared service/profile set. Profiles render each in a
// coloured circle; services render the same names duotone.
export const AVATAR_ICONS = PICKER_ICONS

/** Backgrounds dark enough that the white icon always reads (no colour forces a
 *  dark icon). Black is reserved for managers and is NOT in this pool — apps
 *  apply it separately for manager profiles. */
// Reserved for admins/managers — NOT in AVATAR_COLORS, so only admins use it and
// non-admins can't pick it. (Same value elog uses.)
export const MANAGER_COLOR = '#111827'

export const AVATAR_COLORS = [
  // mid hues
  '#ef4444', '#f97316', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#64748b', '#a16207', '#0f766e', '#9ca3af',
  // deeper shades
  '#b91c1c', '#c2410c', '#b45309', '#4d7c0f', '#15803d', '#047857', '#0e7490',
  '#1d4ed8', '#4338ca', '#7c3aed', '#a21caf', '#be123c', '#9f1239',
]

// A readable icon colour for the circle: dark on light backgrounds, white on
// dark — so light pastels/greys still show the icon. Non-hex bg → white.
export function iconColorFor(bg) {
  const s = typeof bg === 'string' && bg[0] === '#' ? bg.slice(1) : null
  if (!s || (s.length !== 6 && s.length !== 3)) return '#fff'
  const h = s.length === 3 ? s.split('').map((x) => x + x).join('') : s
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? '#1f2937' : '#fff'
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

/** Random icon + color. */
export function randomAvatar() {
  return { profile_shape: pick(AVATAR_ICONS), profile_color: pick(AVATAR_COLORS) }
}

/** Stable icon + color derived from a string (usually username). */
export function avatarFor(seed) {
  let x = 2166136261 >>> 0
  for (const c of String(seed || '')) { x ^= c.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0 }
  return {
    profile_shape: AVATAR_ICONS[x % AVATAR_ICONS.length],
    profile_color: AVATAR_COLORS[(x >>> 8) % AVATAR_COLORS.length],
  }
}

export default function Avatar({ icon, color, seed, size = 36, weight = 'fill', title, style, ...rest }) {
  const det = avatarFor(seed)
  const Cmp = ICONS[icon] || AVATAR_ICON_MAP[icon] || ICONS[det.profile_shape] || AVATAR_ICON_MAP[det.profile_shape]
  const bg = color || det.profile_color
  const fg = iconColorFor(bg)
  return (
    <span
      title={title}
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: bg, color: fg, ...style,
      }}
      {...rest}
    >
      <Cmp size={Math.round(size * 0.56)} weight={weight} color={fg} />
    </span>
  )
}
