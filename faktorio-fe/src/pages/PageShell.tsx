import { useScreen, useWindowSize } from 'usehooks-ts'

export const PageShell = ({ children }) => {
  const screen = useWindowSize()
  console.log('screen:', screen)
  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: screen.height - 90
      }}
    >
      <div className="flex-grow container mx-auto px-4 py-6 md:py-12 lg:py-16 xl:py-24">
        {children}
      </div>
      <footer className="mt-auto">
        <div className="container mx-auto p-4">
          <div className="text-center text-sm text-gray-600">
            © {new Date().getFullYear()} Faktorio
          </div>
        </div>
      </footer>
    </div>
  )
}
