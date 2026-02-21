import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useState, useEffect } from 'react'

export type UserRole = 'admin' | 'participant'

export interface Session {
  competitionId: string
  competitionCode: string
  competitionName: string
  participantId: string | null  // null when role = 'admin'
  nickname: string
  role: UserRole
  authenticatedAt: number       // Date.now()
}

interface SessionStore {
  sessions: Record<string, Session>  // keyed by competitionCode
  addSession: (session: Session) => void
  getSession: (code: string) => Session | null
  removeSession: (code: string) => void
  clearExpired: () => void
  getAllSessions: () => Session[]
}

const TTL_MS = 2 * 60 * 60 * 1000  // 2 hours

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessions: {},

      addSession: (session) =>
        set((s) => ({
          sessions: { ...s.sessions, [session.competitionCode]: session },
        })),

      getSession: (code) => {
        const session = get().sessions[code]
        if (!session) return null
        if (Date.now() - session.authenticatedAt > TTL_MS) {
          get().removeSession(code)
          return null  // expired → triggers re-auth modal
        }
        return session
      },

      removeSession: (code) =>
        set((s) => {
          const { [code]: _removed, ...rest } = s.sessions
          return { sessions: rest }
        }),

      clearExpired: () =>
        set((s) => ({
          sessions: Object.fromEntries(
            Object.entries(s.sessions).filter(
              ([, sess]) => Date.now() - sess.authenticatedAt <= TTL_MS
            )
          ),
        })),

      getAllSessions: () =>
        Object.values(get().sessions).filter(
          (sess) => Date.now() - sess.authenticatedAt <= TTL_MS
        ),
    }),
    { name: 'fornelli-sessions' }
  )
)

/**
 * Hook to wait for Zustand persist hydration before rendering.
 * Prevents flash of unauthenticated state on first load.
 */
export function useHasHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Check if already hydrated (synchronous storage like localStorage)
    if (useSessionStore.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    const unsubFinish = useSessionStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })
    return unsubFinish
  }, [])

  return hydrated
}
