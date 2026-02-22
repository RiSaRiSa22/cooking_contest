import { useState } from 'react'
import { useParams } from 'react-router'
import { useSessionStore } from '../../store/sessionStore'
import { useVoterStore } from '../../store/voterStore'
import { useVoterData } from '../../hooks/useVoterData'
import { VoteTab } from './tabs/VoteTab'

// Phase banner variant for voter (reads from voterStore, not competitionStore)
function VoterPhaseBanner() {
  const competition = useVoterStore((s) => s.competition)

  if (!competition) return null

  const PHASE_CONFIG: Record<string, { label: string; emoji: string; bgColor: string; textColor: string }> = {
    preparation: {
      label: 'Preparazione in corso',
      emoji: '👨‍🍳',
      bgColor: 'var(--color-gold)',
      textColor: 'var(--color-ink)',
    },
    voting: {
      label: 'Votazione in corso',
      emoji: '🗳️',
      bgColor: 'var(--color-ember)',
      textColor: '#ffffff',
    },
    finished: {
      label: 'Gara conclusa',
      emoji: '🏆',
      bgColor: 'var(--color-sage)',
      textColor: '#ffffff',
    },
  }

  const config = PHASE_CONFIG[competition.phase] ?? {
    label: competition.phase,
    emoji: '📋',
    bgColor: 'var(--color-parchment-deep)',
    textColor: 'var(--color-ink)',
  }

  return (
    <div
      className="w-full py-2 text-center font-body text-sm font-semibold"
      style={{ background: config.bgColor, color: config.textColor }}
    >
      {config.emoji} {config.label}
    </div>
  )
}

const ALL_TABS = [
  { id: 'vota', label: 'Vota', emoji: '🗳️' },
  { id: 'galleria', label: 'Galleria', emoji: '📸' },
  { id: 'classifica', label: 'Classifica', emoji: '🏆' },
  { id: 'il-mio-piatto', label: 'Il mio piatto', emoji: '🍽️' },
] as const

type Tab = (typeof ALL_TABS)[number]['id']

export function VoterScreen() {
  const { code } = useParams<{ code: string }>()
  const session = useSessionStore((s) => s.getSession(code!))
  const [activeTab, setActiveTab] = useState<Tab>('vota')

  const competitionId = session?.competitionId ?? ''
  const participantId = session?.participantId ?? ''

  // Load voter data (dishes_public + vote-read EF + Realtime)
  useVoterData(competitionId, participantId)

  const competition = useVoterStore((s) => s.competition)
  const isLoading = useVoterStore((s) => s.isLoading)
  const error = useVoterStore((s) => s.error)

  // VOTR-03: Classifica visibile solo in fase finished
  const visibleTabs = ALL_TABS.filter(
    (tab) => tab.id !== 'classifica' || competition?.phase === 'finished'
  )

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-parchment)' }}
      >
        <p className="font-body text-ink-light">Caricamento...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: 'var(--color-parchment)' }}
      >
        <p className="font-body text-ember text-center">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-parchment)' }}>
      {/* Sticky header — 62px */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-4 h-[62px]"
        style={{ background: 'var(--color-ink)' }}
      >
        <h1 className="font-display text-lg text-white truncate max-w-[60%]">
          {competition?.name ?? '—'}
        </h1>
        <span
          className="font-body text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: 'var(--color-gold)', color: 'var(--color-ink)' }}
        >
          {code}
        </span>
      </header>

      {/* Phase banner */}
      <VoterPhaseBanner />

      {/* Scrollable content area with bottom padding for tab bar */}
      <main className="pb-24">
        {activeTab === 'vota' && <VoteTab />}
        {activeTab === 'galleria' && (
          <div className="px-4 py-6 text-center font-body text-ink-light">Coming soon</div>
        )}
        {activeTab === 'classifica' && (
          <div className="px-4 py-6 text-center font-body text-ink-light">Coming soon</div>
        )}
        {activeTab === 'il-mio-piatto' && (
          <div className="px-4 py-6 text-center font-body text-ink-light">Coming soon</div>
        )}
      </main>

      {/* Fixed bottom tab bar — 64px */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 flex items-center border-t z-50"
        style={{ background: '#ffffff', borderColor: 'var(--color-parchment-deep)' }}
      >
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full cursor-pointer transition-colors duration-150"
              style={{
                color: isActive ? 'var(--color-ember)' : 'var(--color-ink-light)',
                borderBottom: isActive ? '2px solid var(--color-ember)' : '2px solid transparent',
              }}
            >
              <span className="text-lg leading-none">{tab.emoji}</span>
              <span className="font-body text-[0.65rem] font-semibold">{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
