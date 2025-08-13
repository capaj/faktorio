import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Link, useRoute } from 'wouter'

export function ButtonLink({
  children,
  tabIndex,
  type,
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
  return (
    <Link
      href={props.href}
      target={props.target}
      rel={props.rel}
      className={(active: boolean) => {
        return active ? 'text-primary' : 'text-accent'
      }}
    >
      <Button
        tabIndex={tabIndex}
        variant={props.variant ?? 'link'}
        size={props.size}
        className={cn(
          props.className,
          isActive ? 'underline' : '',
          'cursor-pointer'
        )}
        type={type}
      >
        {children}
      </Button>
    </Link>
  )
}
