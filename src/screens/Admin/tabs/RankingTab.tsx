import { useState } from 'react'
import { useCompetitionStore } from '../../../store/competitionStore'

const MEDALS = ['🥇', '🥈', '🥉']

export function RankingTab() {
  const competition = useCompetitionStore((s) => s.competition)
  const dishes = useCompetitionStore((s) => s.dishes)
  const voteCounts = useCompetitionStore((s) => s.voteCounts)
  const [revealChefs, setRevealChefs] = useState(false)

  const phase = competition?.phase ?? 'preparation'
  const showRanking = phase === 'voting' || phase === 'finished'

  const totalVotes = Array.from(voteCounts.values()).reduce((sum, c) => sum + c, 0)

  // Sort by vote count DESC, ties broken alphabetically
  const sorted = [...dishes].sort((a, b) => {
    const countA = voteCounts.get(a.id) ?? 0
    const countB = voteCounts.get(b.id) ?? 0
    if (countB !== countA) return countB - countA
    return a.name.localeCompare(b.name)
  })

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
            const count = voteCounts.get(dish.id) ?? 0
            const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0

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
                  {/* Progress bar */}
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--color-parchment-deep)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        background: 'var(--color-ember)',
                      }}
                    />
                  </div>
                </div>

                {/* Vote count + percentage */}
                <span
                  className="flex-shrink-0 font-body text-xs text-right"
                  style={{ color: 'var(--color-ink-light)' }}
                >
                  {count} vot{count === 1 ? 'o' : 'i'}
                  <br />
                  ({percentage.toFixed(0)}%)
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
