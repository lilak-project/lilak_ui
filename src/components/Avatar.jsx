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
  Robot, Brain, Eye, Crown, Diamond, Gift, Cube, Compass, Anchor, Snowflake,
  Cloud, Drop, Mountains, Cactus, Bug, PawPrint, MagicWand, Sparkle,
} from '@phosphor-icons/react'

/** Curated set of Phosphor icons that read well as small avatars. */
export const AVATAR_ICON_MAP = {
  flask: Flask, atom: Atom, planet: Planet, rocket: Rocket, star: Star,
  heart: Heart, moon: Moon, sun: Sun, lightning: Lightning, fire: Fire,
  leaf: Leaf, tree: Tree, flower: Flower, lotus: FlowerLotus, butterfly: Butterfly,
  bird: Bird, cat: Cat, dog: Dog, fish: Fish, ghost: Ghost,
  robot: Robot, brain: Brain, eye: Eye, crown: Crown, diamond: Diamond,
  gift: Gift, cube: Cube, compass: Compass, anchor: Anchor, snowflake: Snowflake,
  cloud: Cloud, drop: Drop, mountains: Mountains, cactus: Cactus, bug: Bug,
  paw: PawPrint, wand: MagicWand, sparkle: Sparkle,
}

export const AVATAR_ICONS = Object.keys(AVATAR_ICON_MAP)

/** 20 hues picked to read on both light & dark backgrounds. */
export const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899', '#f43f5e', '#64748b', '#a16207', '#0f766e',
]

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
  const Cmp = AVATAR_ICON_MAP[icon] || AVATAR_ICON_MAP[det.profile_shape]
  const bg = color || det.profile_color
  return (
    <span
      title={title}
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: bg, color: '#fff', ...style,
      }}
      {...rest}
    >
      <Cmp size={Math.round(size * 0.56)} weight={weight} color="#fff" />
    </span>
  )
}
