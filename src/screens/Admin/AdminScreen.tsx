import { useState } from 'react'
import { useParams } from 'react-router'
import { useSessionStore } from '../../store/sessionStore'
import { useCompetitionStore } from '../../store/competitionStore'
import { useCompetition } from '../../hooks/useCompetition'
import { PhaseBanner } from '../../components/competition/PhaseBanner'
import { DishesTab } from './tabs/DishesTab'
import { ParticipantsTab } from './tabs/ParticipantsTab'
import { RankingTab } from './tabs/RankingTab'
import { SettingsTab } from './tabs/SettingsTab'

const TABS = [
  { id: 'piatti', label: 'Piatti', emoji: '🍽️' },
  { id: 'partecipanti', label: 'Partecipanti', emoji: '👥' },
  { id: 'classifica', label: 'Classifica', emoji: '🏆' },
  { id: 'impostazioni', label: 'Impostazioni', emoji: '⚙️' },
] as const

type Tab = (typeof TABS)[number]['id']

export function AdminScreen() {
  const { code } = useParams<{ code: string }>()
  const session = useSessionStore((s) => s.getSession(code!))
  const [activeTab, setActiveTab] = useState<Tab>('piatti')

  // Load competition data and subscribe to Realtime phase changes
  useCompetition(session!.competitionId)

  const competition = useCompetitionStore((s) => s.competition)
  const isLoading = useCompetitionStore((s) => s.isLoading)
  const error = useCompetitionStore((s) => s.error)

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
      <PhaseBanner />

      {/* Scrollable content area with bottom padding for tab bar */}
      <main className="pb-24">
        {activeTab === 'piatti' && <DishesTab />}
        {activeTab === 'partecipanti' && <ParticipantsTab />}
        {activeTab === 'classifica' && <RankingTab />}
        {activeTab === 'impostazioni' && <SettingsTab />}
      </main>

      {/* Fixed bottom tab bar — 64px */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 flex items-center border-t z-50"
        style={{ background: '#ffffff', borderColor: 'var(--color-parchment-deep)' }}
      >
        {TABS.map((tab) => {
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
