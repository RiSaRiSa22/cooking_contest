import { createHashRouter, RouterProvider, Navigate, useParams } from 'react-router'
import { HomeScreen } from './screens/Home/HomeScreen'
import { useSessionStore } from './store/sessionStore'

/**
 * Route guard: checks that a valid session exists for this competition code.
 * If not, redirects to home with deep link params to trigger re-auth.
 */
function RequireSession({ children }: { children: React.ReactNode }) {
  const { code } = useParams<{ code: string }>()
  const getSession = useSessionStore((s) => s.getSession)

  if (!code) return <Navigate to="/" replace />

  const session = getSession(code)
  if (!session) {
    // Redirect to home with deep link to re-auth
    return <Navigate to={`/?code=${code}&mode=join`} replace />
  }

  return <>{children}</>
}

const router = createHashRouter([
  {
    path: '/',
    element: <HomeScreen />,
  },
  {
    path: '/admin/:code',
    element: (
      <RequireSession>
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: 'var(--color-ink)', color: 'var(--color-parchment)' }}
        >
          <p className="font-display text-2xl">Admin Panel — coming soon</p>
        </div>
      </RequireSession>
    ),
  },
  {
    path: '/voter/:code',
    element: (
      <RequireSession>
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: 'var(--color-ink)', color: 'var(--color-parchment)' }}
        >
          <p className="font-display text-2xl">Voter Panel — coming soon</p>
        </div>
      </RequireSession>
    ),
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
