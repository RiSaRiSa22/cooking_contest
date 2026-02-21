import { useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { useSessionStore, useHasHydrated, type Session } from '../../store/sessionStore'

export function HomeScreen() {
  const navigate = useNavigate()
  const hasHydrated = useHasHydrated()
  const getAllSessions = useSessionStore((s) => s.getAllSessions)

  const sessions = hasHydrated ? getAllSessions() : []

  const handleCompetitionClick = (session: Session) => {
    if (session.role === 'admin') {
      navigate(`/admin/${session.competitionCode}`)
    } else {
      navigate(`/voter/${session.competitionCode}`)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col max-w-[480px] mx-auto px-[18px]"
      style={{ background: 'var(--color-ink)' }}
    >
      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
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
        <div className="mb-6">
          <p
            className="text-[0.68rem] uppercase tracking-[0.12em] mb-3"
            style={{ color: 'var(--color-ink-light)' }}
          >
            Le tue gare
          </p>
          <div className="flex flex-col gap-2">
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
                <span className="text-[1.1rem]">🔥</span>
                <div className="flex-1 min-w-0">
                  <p className="text-parchment text-[0.9rem] font-semibold truncate">
                    {session.competitionName}
                  </p>
                  <p className="text-[0.72rem] mt-0.5" style={{ color: 'var(--color-ink-light)' }}>
                    {session.role === 'admin' ? '👑 Admin' : '👤 Partecipante'} · {session.competitionCode}
                  </p>
                </div>
                <span className="text-[0.9rem]" style={{ color: 'var(--color-ink-light)' }}>›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CTA actions */}
      <div className="flex flex-col gap-3 pb-16">
        <Button variant="ember" size="full">
          ✨ Crea nuova gara
        </Button>
        <Button variant="ghost-light" size="full">
          🔗 Entra con codice
        </Button>
      </div>
    </div>
  )
}
