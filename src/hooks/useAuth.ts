import { useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { useSessionStore, type Session } from '../store/sessionStore'

export interface CreateCompetitionData {
  name: string
  nickname: string
  pinHash: string
  allowGuests?: boolean
  maxParticipants?: number
}

export interface JoinCompetitionData {
  code: string
  nickname: string
  pinHash: string
}

interface CreateCompetitionResult {
  code: string
  competitionId: string
  participantId: string
  nickname: string
  role: 'admin'
}

interface JoinCompetitionResult {
  competitionId: string
  participantId: string
  nickname: string
  role: 'admin' | 'participant'
  competitionName: string
}

interface AuthState {
  loading: boolean
  error: string | null
}

export function useAuth() {
  const navigate = useNavigate()
  const addSession = useSessionStore((s) => s.addSession)
  const getSession = useSessionStore((s) => s.getSession)

  const [createState, setCreateState] = useState<AuthState>({ loading: false, error: null })
  const [joinState, setJoinState] = useState<AuthState>({ loading: false, error: null })
  const [reAuthState, setReAuthState] = useState<AuthState>({ loading: false, error: null })

  async function createCompetition(data: CreateCompetitionData): Promise<CreateCompetitionResult | null> {
    setCreateState({ loading: true, error: null })
    try {
      const { data: result, error } = await supabase.functions.invoke<CreateCompetitionResult>(
        'competition-create',
        { body: data }
      )

      if (error || !result) {
        const msg = error?.message ?? 'Errore durante la creazione della gara'
        setCreateState({ loading: false, error: msg })
        return null
      }

      const session: Session = {
        competitionId: result.competitionId,
        competitionCode: result.code,
        competitionName: data.name,
        participantId: result.participantId,
        nickname: result.nickname,
        role: result.role,
        authenticatedAt: Date.now(),
      }
      addSession(session)
      setCreateState({ loading: false, error: null })
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto'
      setCreateState({ loading: false, error: msg })
      return null
    }
  }

  async function joinCompetition(data: JoinCompetitionData): Promise<JoinCompetitionResult | null> {
    setJoinState({ loading: true, error: null })
    try {
      const { data: result, error } = await supabase.functions.invoke<JoinCompetitionResult>(
        'competition-join',
        { body: data }
      )

      if (error || !result) {
        // Try to extract the error message from the response body
        const msg = extractErrorMessage(error) ?? 'Errore durante il join'
        setJoinState({ loading: false, error: msg })
        return null
      }

      const session: Session = {
        competitionId: result.competitionId,
        competitionCode: data.code.toUpperCase(),
        competitionName: result.competitionName,
        participantId: result.participantId,
        nickname: result.nickname,
        role: result.role,
        authenticatedAt: Date.now(),
      }
      addSession(session)
      setJoinState({ loading: false, error: null })

      // Navigate to appropriate screen
      const code = data.code.toUpperCase()
      if (result.role === 'admin') {
        navigate(`/admin/${code}`)
      } else {
        navigate(`/voter/${code}`)
      }

      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto'
      setJoinState({ loading: false, error: msg })
      return null
    }
  }

  async function reAuthenticate(code: string, pinHash: string): Promise<JoinCompetitionResult | null> {
    const existingSession = getSession(code)
    if (!existingSession) {
      setReAuthState({ loading: false, error: 'Sessione non trovata' })
      return null
    }

    setReAuthState({ loading: true, error: null })
    try {
      const { data: result, error } = await supabase.functions.invoke<JoinCompetitionResult>(
        'competition-join',
        {
          body: {
            code,
            nickname: existingSession.nickname,
            pinHash,
          },
        }
      )

      if (error || !result) {
        const msg = extractErrorMessage(error) ?? 'PIN errato'
        setReAuthState({ loading: false, error: msg })
        return null
      }

      // Refresh session with new authenticatedAt
      const refreshedSession: Session = {
        ...existingSession,
        authenticatedAt: Date.now(),
      }
      addSession(refreshedSession)
      setReAuthState({ loading: false, error: null })

      // Navigate to appropriate screen
      if (result.role === 'admin') {
        navigate(`/admin/${code}`)
      } else {
        navigate(`/voter/${code}`)
      }

      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto'
      setReAuthState({ loading: false, error: msg })
      return null
    }
  }

  return {
    createCompetition,
    joinCompetition,
    reAuthenticate,
    createState,
    joinState,
    reAuthState,
  }
}

/** Extract user-facing error message from Supabase Functions error */
function extractErrorMessage(error: unknown): string | null {
  if (!error) return null
  if (typeof error === 'object' && error !== null) {
    // FunctionsHttpError has a context with response body
    const e = error as { message?: string; context?: { responseBody?: string } }
    if (e.context?.responseBody) {
      try {
        const body = JSON.parse(e.context.responseBody)
        if (typeof body.error === 'string') return body.error
      } catch {
        // ignore parse error
      }
    }
    if (typeof e.message === 'string') return e.message
  }
  return null
}
