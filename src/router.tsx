import { createHashRouter, RouterProvider, Navigate, useParams } from 'react-router'
import { HomeScreen } from './screens/Home/HomeScreen'
import { useSessionStore } from './store/sessionStore'

/**
 * Route guard: checks that a valid session exists for this competition code.
 * If expired, redirects to home with mode=reauth (PIN-only).
 * If missing, redirects to home with mode=join (full form).
 */
function RequireSession({ children }: { children: React.ReactNode }) {
  const { code } = useParams<{ code: string }>()
  const sessions = useSessionStore((s) => s.sessions)
  const getSession = useSessionStore((s) => s.getSession)

  if (!code) return <Navigate to="/" replace />

  const rawSession = sessions[code]
  const validSession = getSession(code)

  if (!validSession) {
    const mode = rawSession ? 'reauth' : 'join'
    return <Navigate to={`/?code=${code}&mode=${mode}`} replace />
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
