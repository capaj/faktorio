import { useEffect, useState } from 'react'

import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer'
import { CzechInvoicePDF } from './pages/InvoiceDetail/CzechInvoicePDF'
import { invoiceData } from './invoiceSchema'
import { Link, Redirect, Route, Switch, useLocation } from 'wouter'
// Create Document Component
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
	SignedIn,
	SignedOut,
	SignInButton,
	useAuth,
	UserButton,
} from '@clerk/clerk-react'
import { Box } from './components/Box'
import { LandingPage } from './components/LandingPage'
import { MountainIcon } from './components/MountainIcon'
import { ButtonLink } from './components/ui/link'
import { useUser } from '@clerk/clerk-react'
import { Spinner } from './components/ui/spinner'
import { Button } from './components/ui/button'
import { InvoiceDetail } from './pages/InvoiceDetail/InvoiceDetail'
import { InvoiceList } from './pages/InvoiceList'
import { trpcClient } from './lib/trpcClient'
import { httpBatchLink } from '@trpc/client'

function App() {
	const [count, setCount] = useState(0)
	const { isSignedIn, user, isLoaded } = useUser()
	console.log('user:', user)
	const [location, navigate] = useLocation()

	const { getToken } = useAuth()

	const [queryClient] = useState(() => new QueryClient())
	const [trpc] = useState(() =>
		trpcClient.createClient({
			links: [
				httpBatchLink({
					url: 'http://localhost:8787/trpc',
					// You can pass any HTTP headers you wish here
					async headers() {
						const token = await getToken()

						return {
							authorization: `Bearer ${token}`,
						}
					},
				}),
			],
		})
	)
	if (!isLoaded) {
		return (
			<div>
				<Spinner />
			</div>
		)
	}
	console.log({ location })
	if (user && location === '/') {
		return <Redirect to="/invoices" />
	}

	return (
		<trpcClient.Provider client={trpc} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>
				<div className="flex flex-col min-h-[100dvh]">
					<header className="px-4 lg:px-6 h-14 flex items-center">
						<ButtonLink
							className="flex items-center justify-center"
							href="/invoices"
						>
							<MountainIcon className="h-6 w-6" />
							<span className="sr-only">Faktorio</span>
						</ButtonLink>
						<nav className="ml-auto flex gap-4 sm:gap-6">
							{isSignedIn ? (
								<UserButton />
							) : (
								<SignInButton>
									<Button
										variant="link"
										className="text-sm font-medium hover:underline underline-offset-4"
									>
										Přihlásit se
									</Button>
								</SignInButton>
							)}
						</nav>
					</header>
					<main className="flex-1">
						<Switch>
							<Route path="/" component={LandingPage} />

							<Route path="/invoices" component={InvoiceList}></Route>
							<Route path="/new-invoice" component={InvoiceList}></Route>
							<Route
								path="/invoices/:invoiceId"
								component={InvoiceDetail}
							></Route>

							{/* Default route in a switch */}
							<Route>404: No such page!</Route>
						</Switch>
					</main>
				</div>
			</QueryClientProvider>
		</trpcClient.Provider>
	)
}

export default App
