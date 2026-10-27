import { SheetTrigger, SheetContent, Sheet } from '@/components/ui/sheet'
// Create Document Component
import { MountainIcon } from '../components/MountainIcon'
import { ButtonLink } from '../components/ui/link'
import { Button } from '../components/ui/button'
import {
  LucideMenu,
  LogOut,
  Database,
  ScrollIcon,
  Settings,
  User,
  BookOpen,
  Plus,
  FileText,
  Download,
  Users,
  Receipt
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { ThemeToggle } from './ThemeToggle'
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
  const [, navigate] = useLocation()

  // Check if this is a local user (from auth token in localStorage)
  const isLocalUser = localStorage.getItem('auth_token')?.startsWith('local_')

  // Shared className for mobile menu buttons
  const mobileMenuButtonClass =
    'inline-flex h-9 items-center justify-start rounded-md bg-surface px-4 text-sm font-medium transition-colors hover:bg-surface-strong hover:text-fg-strong focus:bg-surface-muted focus:text-fg-strong focus:outline-none disabled:pointer-events-none disabled:opacity-50'

  const UserDropdownMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="ml-3">
        {user?.pictureUrl ? (
          <button
            type="button"
            style={{
              backgroundImage: `url(${user.pictureUrl})`,
              backgroundSize: 'cover'
            }}
            aria-label="Uživatelský profil"
            className="h-8 w-8 rounded-full bg-surface-muted flex items-center justify-center cursor-pointer hover:bg-surface-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          ></button>
        ) : (
          <button
            type="button"
            aria-label="Uživatelský profil"
            className="h-8 w-8 rounded-full bg-surface-muted flex items-center justify-center cursor-pointer hover:bg-surface-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
          >
            <User className="h-4 w-4 text-fg-emphasis" aria-hidden="true" />
          </button>
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
              className="cursor-default hover:bg-surface-subtle !opacity-100"
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
              onClick={() => navigate('/settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Nastavení</span>
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
        <ButtonLink href="/blog" className="hidden md:flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
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
                  <ButtonLink className={mobileMenuButtonClass} href="/blog">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Blog
                  </ButtonLink>
                  <ButtonLink
                    className={mobileMenuButtonClass}
                    href="/new-invoice"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Vystavit fakturu
                  </ButtonLink>
                  <ButtonLink
                    className={mobileMenuButtonClass}
                    href="/invoices"
                  >
                    <Receipt className="mr-2 h-4 w-4" />
                    Faktury
                  </ButtonLink>

                  {!isLocalUser && (
                    <ButtonLink
                      className={mobileMenuButtonClass}
                      href="/received-invoices"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Přijaté faktury
                    </ButtonLink>
                  )}

                  <ButtonLink
                    className={mobileMenuButtonClass}
                    href="/xml-export"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Export XML
                  </ButtonLink>

                  <ButtonLink
                    className="inline-flex h-9 items-center justify-start rounded-md px-4 text-sm font-medium transition-colors hover:bg-surface-strong hover:text-fg-strong focus:text-fg-strong focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                    href="/contacts"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Kontakty
                  </ButtonLink>

                  {isLocalUser && (
                    <ButtonLink
                      className={mobileMenuButtonClass}
                      href="/local-dbs"
                    >
                      <Database className="mr-2 h-4 w-4" />
                      Lokální databáze
                    </ButtonLink>
                  )}

                  {isLocalUser && activeDbName && (
                    <div className="inline-flex h-9 items-center justify-start rounded-md bg-info-muted px-4 text-sm font-medium text-info-fg">
                      <Database className="mr-2 h-4 w-4" />
                      <span className="font-mono">{activeDbName}</span>
                    </div>
                  )}
                </SheetContent>
              </Sheet>

              <ThemeToggle className="ml-3 rounded-full" />
              <UserDropdownMenu />
            </div>

            {/* Desktop layout */}
            <div className="hidden sm:flex lg:flex justify-center items-center">
              <ButtonLink
                href="/new-invoice"
                className="flex items-center gap-2 hover:bg-surface-strong rounded-md px-2 py-1 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Vystavit fakturu
              </ButtonLink>
              <ButtonLink
                href="/invoices"
                className="flex items-center gap-2 hover:bg-surface-strong rounded-md px-2 py-1 transition-colors"
              >
                <Receipt className="h-4 w-4" />
                Vystavené
              </ButtonLink>
              {!isLocalUser && (
                <ButtonLink
                  href="/received-invoices"
                  className="flex items-center gap-2 hover:bg-surface-strong rounded-md px-2 py-1 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Přijaté
                </ButtonLink>
              )}

              <ButtonLink
                href="/xml-export"
                className="flex items-center gap-2 hover:bg-surface-strong rounded-md px-2 py-1 transition-colors"
              >
                <FileText className="h-4 w-4" />
                Export XML
              </ButtonLink>
              <ButtonLink
                href="/contacts"
                className="flex items-center gap-2 hover:bg-surface-strong rounded-md px-2 py-1 transition-colors"
              >
                <Users className="h-4 w-4" />
                Kontakty
              </ButtonLink>

              <ThemeToggle className="ml-3 rounded-full" />
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
            <ThemeToggle className="rounded-full" />
          </>
        )}
      </nav>
    </header>
  )
}
