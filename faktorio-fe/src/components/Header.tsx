import { SheetTrigger, SheetContent, Sheet } from '@/components/ui/sheet'
// Create Document Component
import { MountainIcon } from '../components/MountainIcon'
import { ButtonLink } from '../components/ui/link'
import { Button } from '../components/ui/button'
import { LucideMenu, LogOut, Database, ScrollIcon } from 'lucide-react'
import { User } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { useState } from 'react'
import { useLocation } from 'wouter'
import { useDb } from '../lib/local-db/DbContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../components/ui/dropdown-menu'

export const Header = () => {
  const { isSignedIn, user, logout } = useAuth()
  const { activeDbName } = useDb()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [location, navigate] = useLocation()

  // Check if this is a local user (from auth token in localStorage)
  const isLocalUser = localStorage.getItem('auth_token')?.startsWith('local_')

  const UserDropdownMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {user?.pictureUrl ? (
          <div
            style={{
              backgroundImage: `url(${user.pictureUrl})`,
              backgroundSize: 'cover'
            }}
            aria-label="Uživatelský profil"
            className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200"
          ></div>
        ) : (
          <div
            aria-label="Uživatelský profil"
            className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-gray-200"
          >
            <User className="h-4 w-4 text-gray-800" />
          </div>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isLocalUser && activeDbName ? (
          <>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate('/my-details')}
            >
              <ScrollIcon className="mr-2 h-4 w-4" />
              Moje fakturační údaje
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate('/local-dbs')}
            >
              <Database className="mr-2 h-4 w-4" />
              <span>Správa lokálních databází</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-default hover:bg-gray-50 !opacity-100"
              disabled
            >
              <Database className="mr-2 h-4 w-4" />
              <span className="font-mono text-sm">{activeDbName}</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate('/my-details')}
            >
              <ScrollIcon className="mr-2 h-4 w-4" />
              Moje fakturační údaje
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate('/manage-login-details')}
            >
              <User className="mr-2 h-4 w-4" />
              <span>Přihlašovací údaje</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => logout('/')}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Odhlásit se</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <header className="px-4 lg:px-6 h-14 flex items-center">
      <div className="flex items-center gap-4">
        <ButtonLink className="flex items-center justify-center" href="/">
          <MountainIcon className="h-6 w-6" />
          <span className="sr-only">Faktorio</span>
        </ButtonLink>
        <ButtonLink href="/blog" className="hidden sm:block">
          Blog
        </ButtonLink>
      </div>

      <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
        {isSignedIn ? (
          <>
            {/* Mobile layout */}
            <div className="sm:hidden flex items-center gap-4">
              <Sheet
                open={isMenuOpen}
                onOpenChange={(open) => {
                  setIsMenuOpen(open)
                }}
              >
                <SheetTrigger asChild>
                  <Button
                    className="border-0 rounded-full p-2"
                    size="icon"
                    variant="outline"
                  >
                    <LucideMenu className="h-6 w-6" />
                    <span className="sr-only">Toggle navigation menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="flex flex-col"
                  onClick={(event) => {
                    if (event.target instanceof HTMLButtonElement) {
                      event.stopPropagation()
                      setIsMenuOpen(false)
                    }
                  }}
                >
                  <ButtonLink
                    className="inline-flex h-9 items-center justify-start rounded-md bg-white px-4 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                    href="/blog"
                  >
                    Blog
                  </ButtonLink>
                  <ButtonLink
                    className="inline-flex h-9 items-center justify-start rounded-md bg-white px-4 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                    href="/new-invoice"
                  >
                    Vystavit fakturu
                  </ButtonLink>
                  <ButtonLink
                    className="inline-flex h-9 items-center justify-start rounded-md bg-white px-4 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                    href="/invoices"
                  >
                    Faktury
                  </ButtonLink>

                  {!isLocalUser && (
                    <ButtonLink
                      className="inline-flex h-9 items-center justify-start rounded-md bg-white px-4 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                      href="/received-invoices"
                    >
                      Přijaté faktury
                    </ButtonLink>
                  )}

                  <ButtonLink
                    className="inline-flex h-9 items-center justify-start rounded-md bg-white px-4 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                    href="/xml-export"
                  >
                    Export XML
                  </ButtonLink>

                  <ButtonLink
                    className="inline-flex h-9 items-center justify-start rounded-md px-4 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900  focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                    href="/contacts"
                  >
                    Kontakty
                  </ButtonLink>

                  <ButtonLink
                    className="inline-flex h-9 items-center justify-start rounded-md bg-white px-4 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 focus:bg-gray-100 focus:text-gray-900 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                    href="/local-dbs"
                  >
                    Lokální databáze
                  </ButtonLink>

                  {isLocalUser && activeDbName && (
                    <div className="inline-flex h-9 items-center justify-start rounded-md bg-blue-50 px-4 text-sm font-medium text-blue-800">
                      <Database className="mr-2 h-4 w-4" />
                      <span className="font-mono">{activeDbName}</span>
                    </div>
                  )}
                </SheetContent>
              </Sheet>

              <UserDropdownMenu />
            </div>

            {/* Desktop layout */}
            <div className="hidden sm:flex lg:flex justify-center items-center">
              <ButtonLink href="/new-invoice">Vystavit fakturu</ButtonLink>
              <ButtonLink href="/invoices">Vystavené</ButtonLink>
              {!isLocalUser && (
                <ButtonLink href="/received-invoices">Přijaté</ButtonLink>
              )}

              <ButtonLink href="/xml-export">Export XML</ButtonLink>
              <ButtonLink href="/contacts">Kontakty</ButtonLink>

              <UserDropdownMenu />
            </div>
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
