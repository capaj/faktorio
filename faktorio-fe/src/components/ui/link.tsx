import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Link, useRoute } from 'wouter'

export function ButtonLink({
  children,
  tabIndex,
  ...props
}: {
  children: React.ReactNode
  className?: string
  href: string
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  target?: string
  rel?: string
  tabIndex?: number
  type?: 'button' | 'submit' | 'reset'
}) {
  const [isActive] = useRoute(props.href)
  const variant = props.variant ?? 'link'
  // One focusable element: the link itself, styled as a button (a <button> inside <a> was two tab stops)
  return (
    <Button
      asChild
      variant={variant}
      size={props.size}
      className={cn(
        props.className,
        // Only text links are underlined; links that look like buttons never are
        isActive && variant === 'link' ? 'underline' : '',
        'cursor-pointer'
      )}
    >
      <Link
        href={props.href}
        target={props.target}
        rel={props.rel}
        tabIndex={tabIndex}
        aria-current={isActive ? 'page' : undefined}
      >
        {children}
      </Link>
    </Button>
  )
}
