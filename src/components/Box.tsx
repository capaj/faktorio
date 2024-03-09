import React from 'react'

// Define an interface for the props
interface TailwindBoxProps {
  as?: keyof JSX.IntrinsicElements
  children?: React.ReactNode
  className?: string
  m?: string
  mt?: string
  mr?: string
  mb?: string
  ml?: string
  mx?: string
  my?: string
  p?: string
  pt?: string
  pr?: string
  pb?: string
  pl?: string
  px?: string
  py?: string
  minH?: string
  minW?: string
  h?: string | number
  w?: string | number
  backgroundColor?: string
}

// Helper function to generate Tailwind class names based on props
function generateClassNames(props: TailwindBoxProps): string {
  let classes = ''
  // Spacing and size mappings
  const mappings: { [key: string]: string } = {
    m: 'm',
    mt: 'mt',
    mr: 'mr',
    mb: 'mb',
    ml: 'ml',
    mx: 'mx',
    my: 'my',
    p: 'p',
    pt: 'pt',
    pr: 'pr',
    pb: 'pb',
    pl: 'pl',
    px: 'px',
    py: 'py',
    minH: 'min-h',
    h: 'h',
    w: 'w',
    minW: 'min-w',
    backgroundColor: 'bg', // Assumes a direct mapping; might need adjustment for custom palettes
  }

  Object.entries(props).forEach(([key, value]) => {
    if (mappings[key]) {
      classes += ` ${mappings[key]}-${value}`
    }
  })

  // Add custom class from props if provided
  if (props.className) {
    classes += ` ${props.className}`
  }

  return classes.trim()
}

// TailwindBox component with TypeScript
export const Box: React.FC<TailwindBoxProps> = ({
  as = 'div',
  children,
  ...props
}) => {
  const Tag = as // Allows for semantic tag flexibility
  const className = generateClassNames(props)
  return <Tag className={className}>{children}</Tag>
}
