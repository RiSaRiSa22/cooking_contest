import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { useSessionStore, useHasHydrated, type SessionWithExpiry } from '../../store/sessionStore'
import { CreateCompModal } from './CreateCompModal'
import { JoinCompModal } from './JoinCompModal'
import { CompCreatedScreen } from './CompCreatedScreen'
import { ReAuthModal } from './ReAuthModal'

export function HomeScreen() {
  const [searchParams, setSearchParams] = useSearchParams()
  const hasHydrated = useHasHydrated()
  const getAllSessions = useSessionStore((s) => s.getAllSessions)

  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [deepLinkCode, setDeepLinkCode] = useState<string | undefined>(undefined)
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [createdName, setCreatedName] = useState<string>('')
  const [reAuthSession, setReAuthSession] = useState<SessionWithExpiry | null>(null)

  const sessions = hasHydrated ? getAllSessions() : []

  // Deep link handling: /#/?code=ABC123&mode=join|reauth
  useEffect(() => {
    const code = searchParams.get('code')
    const mode = searchParams.get('mode')

    if (code) {
      const upperCode = code.toUpperCase()
      if (mode === 'reauth') {
        const allSessions = getAllSessions()
        const session = allSessions.find((s) => s.competitionCode === upperCode)
        if (session) {
          setReAuthSession(session)
        } else {
          setDeepLinkCode(upperCode)
          setShowJoin(true)
        }
      } else if (mode === 'join') {
        setDeepLinkCode(upperCode)
        setShowJoin(true)
      } else if (mode === 'vote') {
        setDeepLinkCode(upperCode)
        setShowJoin(true)
      }
      setSearchParams({}, { replace: true })
    }
  }, []) // Run once on mount

  const handleCompetitionClick = (session: SessionWithExpiry) => {
    setReAuthSession(session)
  }

  const handleCreateSuccess = (code: string, competitionName: string) => {
    setShowCreate(false)
    setCreatedCode(code)
    setCreatedName(competitionName)
  }

  const handleJoinClose = () => {
    setShowJoin(false)
    setDeepLinkCode(undefined)
  }

  // If we just created a competition, show the success screen
  if (createdCode) {
    return (
      <CompCreatedScreen
        code={createdCode}
        competitionName={createdName}
        onBack={() => setCreatedCode(null)}
      />
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-ink)' }}
    >
      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-[18px]">
        {/* Flame emoji with flicker animation */}
        <div
          className="text-[72px] mb-6 animate-flicker"
          style={{ display: 'inline-block', lineHeight: 1 }}
          aria-label="Fornelli"
        >
          🔥
        </div>

        {/* App title in Cormorant Garamond */}
        <h1
          className="font-display text-parchment mb-3 leading-tight"
          style={{ fontSize: 'clamp(2.6rem, 10vw, 4.2rem)' }}
        >
          Fornelli <span className="text-gold italic">in</span>
          <br />
          <span className="text-gold italic">Gara</span>
        </h1>

        {/* Subtitle */}
        <p
          className="text-[0.82rem] uppercase tracking-[0.18em] font-body"
          style={{ color: 'var(--color-ink-light)' }}
        >
          Vota i piatti. Scopri i cuochi.
        </p>
      </div>

      {/* Recent competitions list */}
      {sessions.length > 0 && (
        <div className="mb-6 px-[18px] max-w-3xl mx-auto w-full">
          <p
            className="text-[0.68rem] uppercase tracking-[0.12em] mb-3"
            style={{ color: 'var(--color-ink-light)' }}
          >
            Le tue gare
          </p>
          <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <button
                key={session.competitionCode}
                onClick={() => handleCompetitionClick(session)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[50px] text-left transition-all duration-200 cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget
                  el.style.background = 'rgba(255,255,255,0.10)'
                  el.style.borderColor = 'rgba(201,153,31,0.30)'
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget
                  el.style.background = 'rgba(255,255,255,0.06)'
                  el.style.borderColor = 'rgba(255,255,255,0.10)'
                }}
              >
                <span className={`text-[1.1rem] ${session.expired ? 'opacity-50' : ''}`}>🔥</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-parchment text-[0.9rem] font-semibold truncate ${session.expired ? 'opacity-60' : ''}`}>
                    {session.competitionName}
                  </p>
                  <p className="text-[0.72rem] mt-0.5" style={{ color: 'var(--color-ink-light)' }}>
                    {session.role === 'admin' ? '👑 Admin' : '👤 Partecipante'} · {session.competitionCode}
                    {session.expired && ' · Sessione scaduta'}
                  </p>
                </div>
                <span className="text-[0.9rem]" style={{ color: 'var(--color-ink-light)' }}>›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CTA actions */}
      <div className="flex flex-col gap-3 pb-16 px-[18px] max-w-md mx-auto w-full sm:flex-row sm:max-w-lg sm:gap-4">
        <Button variant="ember" size="full" onClick={() => setShowCreate(true)}>
          ✨ Crea nuova gara
        </Button>
        <Button variant="ghost-light" size="full" onClick={() => setShowJoin(true)}>
          🔗 Entra con codice
        </Button>
      </div>

      {/* Modals */}
      <CreateCompModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={handleCreateSuccess}
      />

      <JoinCompModal
        isOpen={showJoin}
        onClose={handleJoinClose}
        initialCode={deepLinkCode}
      />

      <ReAuthModal
        isOpen={Boolean(reAuthSession)}
        onClose={() => setReAuthSession(null)}
        session={reAuthSession}
      />
    </div>
  )
}
