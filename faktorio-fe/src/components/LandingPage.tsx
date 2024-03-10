import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ButtonLink } from './ui/link'

export const LandingPage = () => {
  return (
    <>
      <section className="w-full py-6 md:py-12 lg:py-16 xl:py-24">
        <div className="container flex flex-col items-center justify-center space-y-2 px-4 md:px-6 text-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
              Fakturujte. Jednoduše.
            </h1>
            <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              Nejsnadnější způsob, jak vytvářet faktury.
            </p>
          </div>
          <div className="mx-auto max-w-[400px] space-y-2">
            <form className="grid gap-2">
              <Input
                className="w-full"
                placeholder="Enter your email"
                type="email"
              />
              <Button className="w-full" type="submit">
                Sign Up
              </Button>
            </form>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Zaregistrujte se. Je to zdarma.
            </p>
          </div>
        </div>
      </section>
      <section className="w-full py-12 md:py-24">
        <div className="container grid items-center gap-4 px-4 md:px-6">
          <img
            alt="Image"
            className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full"
            height="310"
            src="/placeholder.svg"
            width="550"
          />
          <div className="flex flex-col gap-2 min-[400px]:flex-row">
            <ButtonLink
              className="inline-flex h-10 items-center justify-center rounded-md bg-gray-900 px-8 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300"
              href="#"
            >
              Contact Sales
            </ButtonLink>
            <ButtonLink
              className="inline-flex h-10 items-center justify-center rounded-md border border-gray-200 border-gray-200 bg-white px-8 text-sm font-medium shadow-sm transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-800 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-800 dark:hover:text-gray-50 dark:focus-visible:ring-gray-300"
              href="#"
            >
              Tour the Platform
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  )
}
