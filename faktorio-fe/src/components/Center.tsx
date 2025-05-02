export const Center = ({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <div className={`flex justify-center mt-8 ${className}`}>{children}</div>
  )
}
