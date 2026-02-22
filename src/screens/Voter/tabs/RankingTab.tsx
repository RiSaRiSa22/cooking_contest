import { useVoterStore } from '../../../store/voterStore'

const MEDALS = ['🥇', '🥈', '🥉']

export function RankingTab() {
  const competition = useVoterStore((s) => s.competition)
  const dishes = useVoterStore((s) => s.dishes)
  const voteCounts = useVoterStore((s) => s.voteCounts)

  // Guard: this tab should only be reachable in 'finished' phase
  // (VoterScreen also filters it from visibleTabs)
  if (competition?.phase !== 'finished') {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 gap-3 px-4"
        style={{ color: 'var(--color-ink-light)' }}
      >
        <span className="text-4xl">🏆</span>
        <p className="font-body text-sm text-center">
          La classifica sarà disponibile al termine della gara
        </p>
      </div>
    )
  }

  const totalVotes = Array.from(voteCounts.values()).reduce((sum, c) => sum + c, 0)

  // Sort by vote count DESC, ties broken alphabetically
  const sorted = [...dishes].sort((a, b) => {
    const countA = voteCounts.get(a.id ?? '') ?? 0
    const countB = voteCounts.get(b.id ?? '') ?? 0
    if (countB !== countA) return countB - countA
    return (a.name ?? '').localeCompare(b.name ?? '')
  })

  if (sorted.length === 0) {
    return (
      <div className="px-4 py-6">
        <p className="font-body text-sm text-center py-8" style={{ color: 'var(--color-ink-light)' }}>
          Nessun piatto ancora
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6">
      <h2 className="font-display text-lg font-semibold mb-4" style={{ color: 'var(--color-ink)' }}>
        Classifica finale
      </h2>

      <div className="space-y-3">
        {sorted.map((dish, idx) => {
          const dishId = dish.id ?? ''
          const count = voteCounts.get(dishId) ?? 0
          const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0

          return (
            <div
              key={dishId}
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
                {/* Chef name — revealed automatically by dishes_public view in finished phase */}
                {dish.chef_name && (
                  <p className="font-body text-xs mb-1" style={{ color: 'var(--color-ink-light)' }}>
                    {dish.chef_name}
                  </p>
                )}
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
    </div>
  )
}
