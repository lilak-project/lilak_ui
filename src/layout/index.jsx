/**
 * Layout primitives — tiny inline-style flex/grid helpers so consumer "glue"
 * code never has to hand-roll `className="flex ..."` (the kit is Tailwind-free).
 *
 *   <Container>            page-width centered column (max 1120px)
 *   <Stack gap={8}>        vertical flex
 *   <Row gap={8} align>    horizontal flex (align/justify shorthands)
 *   <Grid cols={3} gap>    CSS grid
 *   <Box>                  styled div passthrough
 *
 * All accept `style` (merged last) and forward refs + remaining props.
 */
import { forwardRef } from 'react'

const ALIGN = { start: 'flex-start', center: 'center', end: 'flex-end', stretch: 'stretch', baseline: 'baseline' }
const JUSTIFY = { start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between', around: 'space-around', evenly: 'space-evenly' }

function pick(map, v, dflt) {
  if (v === true) return dflt
  if (v == null || v === false) return undefined
  return map[v] || v
}

export const Box = forwardRef(function Box({ as: As = 'div', style, ...rest }, ref) {
  return <As ref={ref} style={style} {...rest} />
})

export const Stack = forwardRef(function Stack(
  { gap = 0, align, justify, wrap, flex, style, as = 'div', ...rest }, ref) {
  const As = as
  return (
    <As
      ref={ref}
      style={{
        display: 'flex', flexDirection: 'column',
        gap, flexWrap: wrap ? 'wrap' : undefined, flex,
        alignItems: pick(ALIGN, align, 'stretch'),
        justifyContent: pick(JUSTIFY, justify, 'flex-start'),
        minWidth: 0,
        ...style,
      }}
      {...rest}
    />
  )
})

export const Row = forwardRef(function Row(
  { gap = 0, align = 'center', justify, wrap, flex, style, as = 'div', ...rest }, ref) {
  const As = as
  return (
    <As
      ref={ref}
      style={{
        display: 'flex', flexDirection: 'row',
        gap, flexWrap: wrap ? 'wrap' : undefined, flex,
        alignItems: pick(ALIGN, align, 'center'),
        justifyContent: pick(JUSTIFY, justify, 'flex-start'),
        minWidth: 0,
        ...style,
      }}
      {...rest}
    />
  )
})

export const Grid = forwardRef(function Grid(
  { cols = 2, gap = 0, minCol, align, style, as = 'div', ...rest }, ref) {
  const As = as
  const templateColumns = minCol
    ? `repeat(auto-fill, minmax(${typeof minCol === 'number' ? minCol + 'px' : minCol}, 1fr))`
    : (typeof cols === 'number' ? `repeat(${cols}, minmax(0, 1fr))` : cols)
  return (
    <As
      ref={ref}
      style={{ display: 'grid', gridTemplateColumns: templateColumns, gap, alignItems: pick(ALIGN, align), ...style }}
      {...rest}
    />
  )
})

export const Container = forwardRef(function Container(
  { max = 1120, pad = '8px 16px', style, as = 'div', ...rest }, ref) {
  const As = as
  return (
    <As
      ref={ref}
      style={{ width: '100%', maxWidth: max, marginLeft: 'auto', marginRight: 'auto', padding: pad, minWidth: 0, ...style }}
      {...rest}
    />
  )
})

/** Flexible spacer for Row/Stack — `<Spacer/>` pushes following items to the end. */
export function Spacer() { return <div style={{ flex: 1, minWidth: 0 }} /> }
