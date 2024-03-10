import { Button } from '@/components/ui/button'
import { Link } from 'wouter'

export function ButtonLink({
  children,
  ...props
}: {
  children: React.ReactNode
  className?: string
  href: string
  target?: string
  rel?: string
}) {
  return (
    <Link href={props.href} target={props.target} rel={props.rel}>
      <Button variant="link" className={props.className}>
        {children}
      </Button>
    </Link>
  )
}
