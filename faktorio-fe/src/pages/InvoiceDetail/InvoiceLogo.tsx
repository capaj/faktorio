import React from 'react'
import {
  Circle,
  Ellipse,
  G,
  Image,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
  Svg
} from '@react-pdf/renderer'

const SVG_LOGO_WIDTH = 180
const SVG_LOGO_HEIGHT = 70

const isSvgDataUrl = (logoUrl: string) =>
  logoUrl.startsWith('data:image/svg+xml')

const getSvgTextFromDataUrl = (dataUrl: string) => {
  const [, metadata = '', payload = ''] =
    dataUrl.match(/^data:image\/svg\+xml([^,]*),(.*)$/) ?? []

  if (metadata.includes(';base64')) {
    return atob(payload)
  }

  return decodeURIComponent(payload)
}

const parseStyle = (style: string | null): Record<string, string> => {
  if (!style) {
    return {}
  }

  return Object.fromEntries(
    style
      .split(';')
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .map((declaration) => {
        const [property, value] = declaration.split(':')
        return [property?.trim(), value?.trim()]
      })
      .filter(([property, value]) => property && value)
  )
}

const toCamelCase = (value: string) =>
  value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())

const numberAttributes = new Set([
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'x1',
  'x2',
  'y',
  'y1',
  'y2',
  'width',
  'height',
  'fillOpacity',
  'opacity',
  'strokeOpacity',
  'strokeWidth'
])

const presentationAttributes = [
  'clip-path',
  'color',
  'fill',
  'fill-opacity',
  'fill-rule',
  'opacity',
  'stroke',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'stroke-width',
  'text-anchor',
  'transform',
  'visibility'
]

const shapeAttributes = [
  'cx',
  'cy',
  'd',
  'height',
  'points',
  'r',
  'rx',
  'ry',
  'width',
  'x',
  'x1',
  'x2',
  'y',
  'y1',
  'y2'
]

const getSvgProps = (element: Element) => {
  const styleAttributes = parseStyle(element.getAttribute('style'))
  const props: Record<string, string | number> = {}

  for (const [property, value] of Object.entries(styleAttributes)) {
    props[toCamelCase(property)] = value
  }

  for (const attribute of [...presentationAttributes, ...shapeAttributes]) {
    const value = element.getAttribute(attribute)
    if (!value) {
      continue
    }
    props[toCamelCase(attribute)] = value
  }

  for (const [key, value] of Object.entries(props)) {
    if (numberAttributes.has(key) && typeof value === 'string') {
      const numericValue = Number.parseFloat(value)
      if (!Number.isNaN(numericValue)) {
        props[key] = numericValue
      }
    }
  }

  return props
}

const renderSvgChildren = (element: Element): React.ReactNode[] =>
  Array.from(element.children)
    .map((child, index) => renderSvgElement(child, index))
    .filter(Boolean)

const renderSvgElement = (element: Element, index: number): React.ReactNode => {
  const props = getSvgProps(element)
  const children = renderSvgChildren(element)

  switch (element.tagName.toLowerCase()) {
    case 'g':
      return (
        <G key={index} {...props}>
          {children}
        </G>
      )
    case 'path':
      return <Path key={index} {...props} d={String(props.d ?? '')} />
    case 'rect':
      return (
        <Rect
          key={index}
          {...props}
          width={props.width ?? 0}
          height={props.height ?? 0}
        />
      )
    case 'circle':
      return <Circle key={index} {...props} r={props.r ?? 0} />
    case 'ellipse':
      return (
        <Ellipse key={index} {...props} rx={props.rx ?? 0} ry={props.ry ?? 0} />
      )
    case 'line':
      return (
        <Line
          key={index}
          {...props}
          x1={props.x1 ?? 0}
          x2={props.x2 ?? 0}
          y1={props.y1 ?? 0}
          y2={props.y2 ?? 0}
        />
      )
    case 'polygon':
      return (
        <Polygon key={index} {...props} points={String(props.points ?? '')} />
      )
    case 'polyline':
      return (
        <Polyline key={index} {...props} points={String(props.points ?? '')} />
      )
    default:
      return children.length ? <G key={index}>{children}</G> : null
  }
}

const SvgLogo = ({ logoUrl }: { logoUrl: string }) => {
  const svgText = getSvgTextFromDataUrl(logoUrl)
  const svg = new DOMParser().parseFromString(
    svgText,
    'image/svg+xml'
  ).documentElement
  const viewBox = svg.getAttribute('viewBox') ?? '0 0 180 70'

  return (
    <Svg
      width={SVG_LOGO_WIDTH}
      height={SVG_LOGO_HEIGHT}
      viewBox={viewBox}
      preserveAspectRatio="xMinYMid meet"
    >
      {renderSvgChildren(svg)}
    </Svg>
  )
}

export const InvoiceLogo = ({ logoUrl }: { logoUrl: string }) => {
  if (isSvgDataUrl(logoUrl)) {
    return <SvgLogo logoUrl={logoUrl} />
  }

  return (
    <Image
      style={{
        width: SVG_LOGO_WIDTH,
        maxHeight: SVG_LOGO_HEIGHT,
        objectFit: 'contain'
      }}
      source={logoUrl}
    />
  )
}
