import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Link, useRoute } from 'wouter'

export function ButtonLink({
  children,
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
        variant={props.variant ?? 'link'}
        size={props.size}
        className={cn(
          props.className,
          isActive ? 'underline' : '',
          'cursor-pointer'
        )}
      >
        {children}
      </Button>
    </Link>
  )
}
