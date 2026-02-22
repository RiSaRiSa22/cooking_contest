import { useState } from 'react'
import { useParams } from 'react-router'
import { useCompetitionStore } from '../../../store/competitionStore'
import { useSessionStore } from '../../../store/sessionStore'
import { useToast } from '../../../components/ui/Toast'
import { supabase } from '../../../lib/supabase'
import { computeRankingScores, type RankingMode } from '../../../lib/ranking'

const MEDALS = ['🥇', '🥈', '🥉']

const MODE_LABELS: Record<RankingMode, string> = {
  simple: 'Media semplice',
  bayesian: 'Media pesata',
}

export function RankingTab() {
  const { code } = useParams<{ code: string }>()
  const session = useSessionStore((s) => s.getSession(code!))

  const competition = useCompetitionStore((s) => s.competition)
  const dishes = useCompetitionStore((s) => s.dishes)
  const dishScores = useCompetitionStore((s) => s.dishScores)
  const setCompetition = useCompetitionStore((s) => s.setCompetition)
  const [revealChefs, setRevealChefs] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const { show: showToast } = useToast()

  const phase = competition?.phase ?? 'preparation'
  const showRanking = phase === 'voting' || phase === 'finished'
  const officialMode = (competition?.ranking_mode ?? 'bayesian') as RankingMode

  // View toggle — defaults to official mode
  const [viewMode, setViewMode] = useState<RankingMode>(officialMode)

  // Compute scores for current view
  const rankingScores = computeRankingScores(dishScores, viewMode)

  // Sort by computed score DESC, ties broken alphabetically
  const sorted = [...dishes].sort((a, b) => {
    const scoreA = rankingScores.get(a.id) ?? 0
    const scoreB = rankingScores.get(b.id) ?? 0
    if (scoreB !== scoreA) return scoreB - scoreA
    return a.name.localeCompare(b.name)
  })

  async function handleSetOfficialMode(mode: RankingMode) {
    if (!competition || !session?.participantId || isSaving) return

    setIsSaving(true)
    try {
      const { data, error } = await supabase.functions.invoke('competition-settings', {
        body: {
          action: 'set_ranking_mode',
          competitionId: competition.id,
          participantId: session.participantId,
          rankingMode: mode,
        },
      })

      if (error) throw error

      setCompetition({ ...competition, ranking_mode: data.ranking_mode })
      showToast(`Classifica ufficiale: ${MODE_LABELS[mode]}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Errore')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
          Classifica
        </h2>

        {showRanking && dishes.length > 0 && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="font-body text-xs" style={{ color: 'var(--color-ink-light)' }}>
              Rivela cuochi
            </span>
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={revealChefs}
                onChange={(e) => setRevealChefs(e.target.checked)}
              />
              <div
                className="w-9 h-5 rounded-full transition-colors duration-200"
                style={{
                  background: revealChefs ? 'var(--color-ember)' : 'var(--color-parchment-deep)',
                }}
              />
              <div
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                style={{
                  transform: revealChefs ? 'translateX(16px)' : 'translateX(0)',
                }}
              />
            </div>
          </label>
        )}
      </div>

      {/* Mode toggle pills */}
      {showRanking && dishes.length > 0 && (
        <div className="mb-4 space-y-3">
          <div className="flex gap-1 bg-parchment-dark rounded-xl p-1">
            {(['simple', 'bayesian'] as RankingMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="flex-1 py-2 px-3 rounded-lg font-body text-xs font-semibold transition-all duration-200 cursor-pointer"
                style={{
                  background: viewMode === mode ? '#ffffff' : 'transparent',
                  color: viewMode === mode ? 'var(--color-ink)' : 'var(--color-ink-light)',
                  boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {MODE_LABELS[mode]}
                {officialMode === mode && ' ★'}
              </button>
            ))}
          </div>

          {/* Set as official button */}
          {viewMode !== officialMode && (
            <button
              onClick={() => handleSetOfficialMode(viewMode)}
              disabled={isSaving}
              className="w-full py-2 rounded-lg font-body text-xs font-semibold cursor-pointer transition-opacity duration-150 disabled:opacity-50"
              style={{
                background: 'var(--color-ember)',
                color: '#ffffff',
              }}
            >
              {isSaving ? 'Salvando...' : `Imposta "${MODE_LABELS[viewMode]}" come ufficiale`}
            </button>
          )}
        </div>
      )}

      {!showRanking ? (
        <div
          className="flex flex-col items-center justify-center py-12 gap-3"
          style={{ color: 'var(--color-ink-light)' }}
        >
          <span className="text-4xl">🏆</span>
          <p className="font-body text-sm text-center">
            La classifica sara disponibile durante la votazione
          </p>
        </div>
      ) : sorted.length === 0 ? (
        <p className="font-body text-sm text-center py-8" style={{ color: 'var(--color-ink-light)' }}>
          Nessun piatto ancora
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.map((dish, idx) => {
            const rawScore = dishScores.get(dish.id)
            const computedScore = rankingScores.get(dish.id) ?? 0
            const count = rawScore?.count ?? 0

            return (
              <div
                key={dish.id}
                className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm"
                style={{ border: '1px solid var(--color-parchment-deep)' }}
              >
                {/* Medal / rank */}
                <span className="text-2xl flex-shrink-0 w-8 text-center">
                  {MEDALS[idx] ?? `${idx + 1}`}
                </span>

                {/* Dish info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-body text-sm font-semibold truncate"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {dish.name}
                  </p>
                  <p className="font-body text-xs mb-1" style={{ color: 'var(--color-ink-light)' }}>
                    {revealChefs ? dish.chef_name : '???'}
                  </p>
                  {/* Progress bar (scale 0-10) */}
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--color-parchment-deep)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(computedScore / 10) * 100}%`,
                        background: 'var(--color-ember)',
                      }}
                    />
                  </div>
                </div>

                {/* Score + count */}
                <span
                  className="flex-shrink-0 font-body text-xs text-right"
                  style={{ color: 'var(--color-ink-light)' }}
                >
                  <strong style={{ color: 'var(--color-ink)', fontSize: '0.85rem' }}>
                    {computedScore.toFixed(1)}
                  </strong>/10
                  <br />
                  {count} vot{count === 1 ? 'o' : 'i'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
