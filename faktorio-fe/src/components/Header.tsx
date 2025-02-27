import { SheetTrigger, SheetContent, Sheet } from '@/components/ui/sheet'
// Create Document Component
import { MountainIcon } from '../components/MountainIcon'
import { ButtonLink } from '../components/ui/link'
import { Button } from '../components/ui/button'
import { LucideMenu, LogOut } from 'lucide-react'
import { User } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { useState } from 'react'
import { useLocation } from 'wouter'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../components/ui/dropdown-menu'

export const Header = () => {
  const { isSignedIn, user, logout } = useAuth()
  console.log(user)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [location, navigate] = useLocation()

  return (
    <header className="px-4 lg:px-6 h-14 flex items-center">
      <ButtonLink className="flex items-center justify-center" href="/">
        <MountainIcon className="h-6 w-6" />
        <span className="sr-only">Faktorio</span>
      </ButtonLink>
      <ButtonLink href="/blog">Blog</ButtonLink>
      <nav className="ml-auto flex gap-4 sm:gap-6">
        {isSignedIn ? (
          <>
            <div className="hidden sm:flex lg:flex justify-center items-center">
              <ButtonLink href="/contacts">Kontakty</ButtonLink>
              <ButtonLink href="/invoices">Faktury</ButtonLink>
              <ButtonLink href="/new-invoice">Vystavit fakturu</ButtonLink>
              <ButtonLink href="/my-details">Moje údaje</ButtonLink>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {user?.pictureUrl ? (
                    <img src={user.pictureUrl} alt="User" className="h-4 w-4" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200">
                      <User className="h-4 w-4 text-gray-800" />
                    </div>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => navigate('/my-details')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Můj profil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Odhlásit se</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Sheet
              open={isMenuOpen}
              onOpenChange={(open) => {
                setIsMenuOpen(open)
              }}
            >
              <SheetTrigger asChild>
                <Button
                  className="border-0 rounded-full p-2 sm:hidden"
                  size="icon"
                  variant="outline"
                >
                  <LucideMenu className="h-6 w-6" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex flex-col">
                <ButtonLink
                  className="inline-flex h-9 items-center justify-start rounded-md px-4 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900  focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                  href="/contacts"
                >
                  Kontakty
                </ButtonLink>

                <ButtonLink
                  className="inline-flex h-9 items-center justify-start rounded-md bg-white px-4 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                  href="/invoices"
                >
                  Faktury
                </ButtonLink>

                <ButtonLink
                  className="inline-flex h-9 items-center justify-start rounded-md bg-white px-4 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                  href="/new-invoice"
                >
                  Vystavit fakturu
                </ButtonLink>

                <ButtonLink
                  className="inline-flex h-9 items-center justify-start rounded-md bg-white px-4 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                  href="/my-details"
                >
                  Moje údaje
                </ButtonLink>

                <Button
                  className="inline-flex h-9 items-center justify-start rounded-md bg-white px-4 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                  onClick={logout}
                  variant="ghost"
                >
                  Odhlásit se
                </Button>
              </SheetContent>
            </Sheet>
          </>
        ) : (
          <>
            <ButtonLink
              href="/login"
              variant="link"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              Přihlásit se
            </ButtonLink>
            <ButtonLink
              href="/signup"
              variant="default"
              className="text-sm font-medium"
            >
              Registrovat
            </ButtonLink>
          </>
        )}
      </nav>
    </header>
  )
}
